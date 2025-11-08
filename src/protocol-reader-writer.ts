import { Project, Node, SyntaxKind, VariableDeclaration, ObjectLiteralExpression, PropertyAssignment, SourceFile, StringLiteral, ts, ArrayLiteralExpression, NumericLiteral, WriterFunction, CodeBlockWriter, VariableDeclarationKind, ImportSpecifier, ImportDeclaration } from "ts-morph";
import { ChangeProtocolData, EdgeLayout, EdgeLayoutAST, isSwarmProtocol, LabelAST, LayoutType, LayoutTypeAST, NewProtocolData, NodeLayout, NodeLayoutAST, Occurrence, OccurrenceInfo, PositionHandler, PositionHandlerAST, SubscriptionAST, SwarmProtocol, SwarmProtocolAST, SwarmProtocolMetadata, SwarmProtocolMetadataAST, Transition, TransitionAST, TransitionLabel } from "./types";
import isIdentifier from 'is-identifier';
import { MetadataStore } from "./handle-metadata";

// https://dev.to/martinpersson/a-guide-to-using-the-option-type-in-typescript-ki2
export type Some<T> = { tag: "Some", value: T }
export type None = { tag: "None" }
export type Option<T> = Some<T> | None

export const some = <T>(value: T): Option<T> => ({
    tag: "Some",
    value
});

export const none: Option<never> = { tag: "None" }

export const isNone = <T>(optionValue: Option<T>): boolean => {
    return optionValue.tag === "None"
}

export const isSome = <T>(optionValue: Option<T>): optionValue is Some<T> => {
    return optionValue.tag === "Some"
}

export const getValue = <T>(optionValue: Some<T>): T => {
    return optionValue.value
}

// Constants
const INITIAL_FIELD = "initial"
const TRANSITIONS_FIELD = "transitions"
const METADATA_FIELD = "metadata"

type OccurrenceMap = Map<string, Occurrence>
type AstMap = Map<string, SwarmProtocolAST>
type Variables = Map<string, VariableDeclaration>
type ProjectOccurrences = {project: Project, occurrences: OccurrenceMap, ASTs: AstMap, variables: Variables, importedNames: Set<string> }
type GetProtocolOptions = { reload?: boolean, updateMeta?: boolean }

export class ProtocolReaderWriter {
    metadataStore: MetadataStore
    // Map filenames to swarm protocols occurring in those files
    files: Map<string, ProjectOccurrences>

    constructor(metadataStore: MetadataStore, fileName?: string) {
        this.metadataStore = metadataStore
        this.files = new Map()
        if (fileName) {
            this.parseProtocols(fileName, false)
        }
    }

    // Return the swarm protocol occurrences in a file. Read file if not present in `files` map.
    getOccurrences(fileName: string, options: GetProtocolOptions = {}): Occurrence[] {
        const { reload = false, updateMeta = false } = options
        if (!this.files.has(fileName) || reload) {
            // Parse protocols and keep any metadata stored in parsed result instead of reading from store
            this.parseProtocols(fileName, false)
        }
        if (updateMeta) {
            this.updateOccurrenceMeta(fileName)
        }

        return Array.from(this.files.get(fileName).occurrences.values())
    }

    // Return all names used in a file. Read file if not present in the `files` map.
    getNames(fileName: string, reload=false): Set<string> {
        if (!this.files.has(fileName) || reload) {
            // Parse protocols and keep any metadata stored in parsed result instead of reading from store
            this.parseProtocols(fileName, false)
        }
        const imported = Array.from(this.files.get(fileName)!.importedNames)
        const variables = Array.from(this.files.get(fileName)!.variables.keys())
        return new Set(imported.concat(variables))
    }

    // if storeMetaInProtocol store meta from updated occurence in store and in ast that is written back.
    async writeOccurrence(filename: string, changeProtocolData: ChangeProtocolData): Promise<void> {
        // filename: string, updatedOccurrence: Occurrence, storeMetaInProtocol: boolean
        const projectOccurrences = this.files.get(filename)
        if (!projectOccurrences) { return }

        const swarmProtocolAst = projectOccurrences.ASTs.get(changeProtocolData.name)
        const oldOccurrence = projectOccurrences.occurrences.get(changeProtocolData.name)
        if (swarmProtocolAst && oldOccurrence) {
            const oldSwarmProtocol = oldOccurrence.swarmProtocol
            if (oldSwarmProtocol.initial !== changeProtocolData.swarmProtocol.initial) {
                swarmProtocolAst.initial.setInitializer(`${changeProtocolData.swarmProtocol.initial}`)
            }
            const transitionsToMap = (transitions: {id: string, [key: string]: any}[]) => {
                return new Map(transitions
                    .map(t => [t.id, t]))
            }

            const newTransitionsMap = transitionsToMap(changeProtocolData.swarmProtocol.transitions)
            const astMap = transitionsToMap(swarmProtocolAst.transitions)

            // Todo: functionality to add new stuff. What happens if we create an edge in the visual tool? What should be the id of this?
            // And how should we iterate here?
            // Consider just 'resetting' whole variable declaration? Set it to updated occurence?
            const names = new Set(Array.from(this.getNames(filename)).concat(changeProtocolData.variables))
            for (const id of newTransitionsMap.keys()) {
                if (astMap.has(id)) {
                    updateTransitionAst(newTransitionsMap.get(id) as Transition, astMap.get(id) as TransitionAST, names)
                } else {
                    addTransitionToDeclaration(swarmProtocolAst.variableDeclaration, newTransitionsMap.get(id) as Transition, names)
                }
            }
            if (changeProtocolData.isStoreInMetaChecked) {
                updateMetaDataAst(swarmProtocolAst, changeProtocolData.swarmProtocol.metadata, names)
            }
            this.addVariableDeclarations(filename, changeProtocolData.name, changeProtocolData.variables)

            await projectOccurrences.project.getSourceFileOrThrow(filename).save()
        }
    }

    // if storeMetaInProtocol store meta from updated occurence in store and in ast that is written back.
    async writeNewOccurrence(filename: string, newProtocolData: NewProtocolData): Promise<void> {
        // filename: string, updatedOccurrence: Occurrence, storeMetaInProtocol: boolean
        const sourceFile = this.files.get(filename)?.project.getSourceFile(filename)

        if (!sourceFile || !isIdentifier(newProtocolData.protocolName)) { return }

        sourceFile.addVariableStatement({
            declarationKind: VariableDeclarationKind.Const,
            declarations: [
                {
                    name: newProtocolData.protocolName,
                    initializer: `{ initial: "initalState", transitions: [{ source: "initialState", target: "initialState", label: { cmd: "dummyCommand", role: "dummyRole", logType: ["dummyEventType"] }}] }`
                }
            ]
        })
        await sourceFile.save()
    }

    private parseProtocols(fileName: string, addMetaFromStore: boolean): void {
        const projectRead = new Project();
        const sourceFileRead = projectRead.addSourceFileAtPath(fileName);

        // Read occurrences and their ASTs
        const occurrenceInfos = visitVariableDeclarations(sourceFileRead)
        // Get protocols and add metadata
        const occurrences = new Map(occurrenceInfos
            .map(occurrenceInfo => [
                occurrenceInfo.occurrence.name,
                addMetaFromStore ? this.addMetaDataFromStore(fileName, occurrenceInfo.occurrence) : occurrenceInfo.occurrence
            ])
        )
        // Get AST snippets representing protocols
        const swarmProtocolASTs = new Map(occurrenceInfos
            .map(occurrenceInfo => [occurrenceInfo.swarmProtocolAST.name, occurrenceInfo.swarmProtocolAST])
        )

        const variables = getVariables(sourceFileRead)
        const importedNames = getImportedNames(sourceFileRead, Array.from(occurrences.values()))

        this.files.set(fileName, {occurrences: occurrences, project: projectRead, ASTs: swarmProtocolASTs, variables, importedNames: importedNames })
    }

    // Could mutate directly but
    private updateOccurrenceMeta(fileName: string) {
        const projectOccurrences = this.files.get(fileName)
        const updatedOcurrences: [string, Occurrence][] = Array.from(projectOccurrences.occurrences.entries())
            .map(([name, occurrenceAndAst]) => [name, this.addMetaDataFromStore(fileName, occurrenceAndAst)])

        this.files.set(fileName, {project: projectOccurrences.project, occurrences: new Map(updatedOcurrences), ASTs: projectOccurrences.ASTs, variables: projectOccurrences.variables, importedNames: projectOccurrences.importedNames})
    }

    // Add metadata from workspace state
    private addMetaDataFromStore(fileName: string, occurrence: Occurrence): Occurrence {
        return {
                ...occurrence,
                swarmProtocol: {
                    ...occurrence.swarmProtocol,
                    metadata: this.metadataStore.getSwarmProtocolMetaData(fileName, occurrence.name)
                }
        }
    }

    // Go through newNames.
    // Any new name that is not already in the set of variables declared in filename
    // is added to the file by creating a VariableDeclaration in the file: const newName = "newName"
    private addVariableDeclarations(filename: string, swarmProtocolName: string, newNames: string[]): void {
        const projectOccurrence = this.files.get(filename)
        const sourceFile = projectOccurrence?.project.getSourceFile(filename)
        const swarmProtocolUsingNames = projectOccurrence.ASTs.get(swarmProtocolName)
        if (!projectOccurrence || !sourceFile || !swarmProtocolUsingNames) { return }
        const names = this.getNames(filename)
        for (const newVariable of newNames) {
            if (!names.has(newVariable)) {
                const optionVariableDeclaration = addStringVariableDeclaration(sourceFile, swarmProtocolUsingNames, newVariable)
                if (isSome(optionVariableDeclaration)) {
                    projectOccurrence.variables.set(newVariable, getValue(optionVariableDeclaration))
                }
            }
        }
    }
}

// Get all variable declarations and try to parse them as swarm protocols.
function visitVariableDeclarations(sourceFile: SourceFile): OccurrenceInfo[] {
        const variableDeclarations = sourceFile
            .getVariableDeclarations()
            .concat(sourceFile
                .getDescendantsOfKind(SyntaxKind.ModuleDeclaration)
                .flatMap(m => m.getVariableDeclarations())) // Nice to have: handle name clases between modules
        const swarmProtocols = variableDeclarations
            .map(variableDeclaration => swarmProtocolDeclaration(variableDeclaration))
            .filter(o => isSome(o))
            .map(o => getValue(o))
        return swarmProtocols
}

// If a variable is declared as an object with the fields 'initial' and 'transitions'
// try to parse it. Have this function just return the variable declaration.
// Split the type and OccurrenceAndAST.
// Make a function that returns an occurrence and another one working on a separate 'project'
// that returns the ast info unaltered.
function swarmProtocolDeclaration(node: VariableDeclaration): Option<OccurrenceInfo> {
    switch (node.getInitializer().getKind()) {
        case SyntaxKind.ObjectLiteralExpression:
            const properties = new Map((node.getInitializer() as ObjectLiteralExpression)
                .getProperties()
                .map(e => (e as PropertyAssignment))
                .map(p => [p.getName(), p]))

            // Construct object from variable declaration then check if the object is a SwarmProtocol
            const maybeSwarmProtocol = propertiesToJSON(properties)
            const maybeSwarmProtocolAST = isSome(maybeSwarmProtocol) ? propertiesToAstInfo(node, properties) : undefined
            if (isSome(maybeSwarmProtocol) && isSome(maybeSwarmProtocolAST)) {
                return some({
                        occurrence: {
                                name: node.getName(),
                                swarmProtocol: getValue(maybeSwarmProtocol),
                        },
                        swarmProtocolAST: getValue(maybeSwarmProtocolAST)
                        })
            }
        }

    return none
}


// Recursively extract the value from an initializer node
function extractValue(node: Node): any {
    switch (node.getKind()) {
        case SyntaxKind.StringLiteral:
            return (node as StringLiteral).getLiteralText();
        case SyntaxKind.NumericLiteral:
            return (node as NumericLiteral).getLiteralText();
        case SyntaxKind.TrueKeyword:
            return true;
        case SyntaxKind.FalseKeyword:
            return false;
        case SyntaxKind.ObjectLiteralExpression:
            const obj: any = {};
            (node as ObjectLiteralExpression).getProperties().forEach(prop => {
                if (Node.isPropertyAssignment(prop)) {
                    obj[prop.getName()] = extractValue(prop.getInitializer());
                }
            });
            return obj;
        case SyntaxKind.ArrayLiteralExpression:
            return (node as ArrayLiteralExpression).getElements().map(extractValue);
        default:
            return node.getText()
    }
}


// These functions make a lot of assumptions on the shape of 'properties' and the ast nodes encountered.
// They assume that that they represent exactly an instance of SwarmProtocolType.
// Id of edge is the index of edge in transitions? Does this work if just set here. Might be reordered somewhere...
// If we do this ids should be the same as indices in propertiesToAstInfo?
function propertiesToJSON(properties: Map<string, PropertyAssignment>): Option<SwarmProtocol> {
    const protocol: any = {}
    const initial = properties.get(INITIAL_FIELD)
    const transitions = properties.get(TRANSITIONS_FIELD)
    if (initial && transitions) {
        protocol[INITIAL_FIELD] = extractValue(initial.getInitializer())
        protocol[TRANSITIONS_FIELD] = extractValue(transitions.getInitializer())
        protocol.transitions = (protocol.transitions).map((transition, index) => { return {...transition, id: index.toString()} })
    }
    const metadata = properties.get(METADATA_FIELD)
    if (metadata) {
        protocol[METADATA_FIELD] = fixMetaDataFieldTypesRead(extractValue(properties.get(METADATA_FIELD).getInitializer()))
    }

    return isSwarmProtocol(protocol) ? some(protocol) : none
}

// Use any type. Called in propertiesToJson.
// Should actually be a an object with the same fields as a SwarmProtocolMetadata
// but with string values for all properties. Give properties the right types
function fixMetaDataFieldTypesRead(metadata: any): SwarmProtocolMetadata {
    const nodeMapper = (node: any): NodeLayout => {
        return { ...node, x: Number(node.x), y: Number(node.y) }
    }

    const positionHandlerMapper = (positionHandler: any): PositionHandler => {
        return {
            x: Number(positionHandler.x),
            y: Number(positionHandler.y),
            active: Number(positionHandler.active),
            isLabel: positionHandler.isLabel === "true" ? true : false
        }
    }

    const edgeMapper = (edge: any): EdgeLayout => {
        return { ...edge, positionHandlers: edge.positionHandlers.map(positionHandlerMapper) }
    }
    const meta = { ...metadata, layout: { nodes: metadata.layout.nodes?.map(nodeMapper), edges: metadata.layout.edges?.map(edgeMapper) } }

    return meta
}

function propertiesToAstInfo(node: VariableDeclaration, properties: Map<string, PropertyAssignment>): Option<SwarmProtocolAST> {
    const initial = properties.get(INITIAL_FIELD) && properties.get(INITIAL_FIELD).isKind(SyntaxKind.PropertyAssignment) ?
        properties.get(INITIAL_FIELD) : undefined
    const transitions = properties.get(TRANSITIONS_FIELD)
        && properties.get(TRANSITIONS_FIELD).getInitializer().isKind(SyntaxKind.ArrayLiteralExpression) ?
            transitionsToAstInfo(properties.get(TRANSITIONS_FIELD).getInitializer() as ArrayLiteralExpression) : undefined

    if (initial && transitions) {
        const metadata = properties.get(METADATA_FIELD) ? metadataToAstInfo(properties.get(METADATA_FIELD).getInitializer() as ObjectLiteralExpression) : undefined
        return some({ name: node.getName(), initial: properties.get(INITIAL_FIELD), transitions: transitions, metadata: metadata, variableDeclaration: node, properties })
    }
    return none
}

function transitionsToAstInfo(transitions: ArrayLiteralExpression): TransitionAST[] {
    return transitions
        .getElements()
        .map((transition, index) => transitionToAstInfo(transition as ObjectLiteralExpression, index.toString()))
}

function transitionToAstInfo(transition: ObjectLiteralExpression, id: string): TransitionAST {
    const transitionAst: any = {}
    for (const prop of transition.getProperties()) {
        if (Node.isPropertyAssignment(prop)) {
            if (prop.getName() === "label") {
                transitionAst[prop.getName()] = labelAstInfo(prop.getInitializer() as ObjectLiteralExpression)
            } else {
                transitionAst[prop.getName()] = prop
            }
        }
    }

    transitionAst.id = id

    return transitionAst
}

function labelAstInfo(label: ObjectLiteralExpression): LabelAST {
    const labelAst: any = {}
    for (const prop of label.getProperties()) {
        if (Node.isPropertyAssignment(prop)) {
            labelAst[prop.getName()] = prop
        }
    }

    return labelAst
}

function metadataToAstInfo(metadata: ObjectLiteralExpression): SwarmProtocolMetadataAST {
    const metadataAst: any = {}
        for (const prop of metadata.getProperties()) {
            if (Node.isPropertyAssignment(prop)) {
                if (prop.getName() === "layout") {
                    metadataAst[prop.getName()] = layoutToAstInfo(prop.getInitializer() as ObjectLiteralExpression)
                } else if (prop.getName() === "subscriptions") {
                    metadataAst[prop.getName()] = subscriptionToAstInfo(prop.getInitializer() as ObjectLiteralExpression)
                }

            }
    }
    return metadataAst as SwarmProtocolMetadataAST
}

function layoutToAstInfo(layout: ObjectLiteralExpression): LayoutTypeAST {
    const layoutAst: any = {}
    for (const prop of layout.getProperties()) {
        if (Node.isPropertyAssignment(prop)) {
            if (prop.getName() === "nodes") {
                layoutAst[prop.getName()] = nodesMetadataToAstInfo(prop.getInitializer() as ArrayLiteralExpression)
            }
            if (prop.getName() === "edges") {
                layoutAst[prop.getName()] = edgesMetadataToAstInfo(prop.getInitializer() as ArrayLiteralExpression)
            }
        }
    }
    return layoutAst as LayoutTypeAST
}

function nodesMetadataToAstInfo(nodes: ArrayLiteralExpression): NodeLayoutAST[] {
    return nodes
        .getElements()
        .map((node) => layoutNodeToAstInfo(node as ObjectLiteralExpression))
}

function layoutNodeToAstInfo(node: ObjectLiteralExpression): NodeLayoutAST {
    const nodeAst: any = {}
    for (const prop of node.getProperties()) {
        if (Node.isPropertyAssignment(prop)) {
            nodeAst[prop.getName()] = prop
        }
    }

    return nodeAst
}

function edgesMetadataToAstInfo(edges: ArrayLiteralExpression) {
    return edges
            .getElements()
            .map((node) => layoutEdgeToAstInfo(node as ObjectLiteralExpression))
}

function layoutEdgeToAstInfo(edge: ObjectLiteralExpression): EdgeLayoutAST {
    const edgeAst: any = {}
    for (const prop of edge.getProperties()) {
        if (Node.isPropertyAssignment(prop)) {
            if (prop.getName() === "id") {
                edgeAst[prop.getName()] = prop
            } else if (prop.getName() === "positionHandlers") {
                edgeAst[prop.getName()] = (prop.getInitializer() as ArrayLiteralExpression)
                    .getElements()
                        .map(positionHandlerToAstInfo)
            }
        }
    }
    return edgeAst
}

function positionHandlerToAstInfo(positionHandler: ObjectLiteralExpression): PositionHandlerAST {
    const positionHandlerAst: any = {}
    for (const prop of positionHandler.getProperties()) {
        if (Node.isPropertyAssignment(prop)) {
            positionHandlerAst[prop.getName()] = prop
        }
    }

    return positionHandlerAst
}

function subscriptionToAstInfo(subscription: ObjectLiteralExpression): SubscriptionAST {
    const subscriptionAst: Map<string, PropertyAssignment> = new Map()
    for (const prop of subscription.getProperties()) {
        if (Node.isPropertyAssignment(prop)) {
            subscriptionAst.set(prop.getName(), prop)
        }
    }

    return subscriptionAst
}

// We should do something similar with variables? Like the inModule thing. Not variables but like namespaces/classes etc. defined in same file.
function getImportedNames(sourceFile: SourceFile, occurences: Occurrence[]): Set<string> {
    // Sort of a heuristic
    const isInModule = (valueToCheck: string, importedNames: Set<string>): boolean =>
        valueToCheck.split(".").some(component => importedNames.has(component) && isIdentifier(component))

    const allStringsLabel = (label: TransitionLabel): string[] =>
        [label.cmd, label.role].concat(label.logType?.map(eventType => eventType) ?? [])
    const allStringsTransition = (transition: Transition): string[] =>
        [transition.source, transition.target].concat(allStringsLabel(transition.label))
    const allStringsOccurrence = (occurence: Occurrence): string[] => {
        return [occurence.name, occurence.swarmProtocol.initial].concat(occurence.swarmProtocol.transitions.flatMap(allStringsTransition))
    }
    const allStringsOccurrences = (occurences: Occurrence[]): string[] =>
        Array.from(new Set(occurences.flatMap(allStringsOccurrence)))

    const mapper = (importDeclaration: ImportDeclaration): string[] => {
        const names = []
        const defaultImport = importDeclaration.getDefaultImport()
        if (defaultImport) { names.push(defaultImport.getText()) }
        const namespaceImport = importDeclaration.getNamespaceImport()
        if (namespaceImport) { names.push(namespaceImport.getText()) }

        return names.concat(importDeclaration.getNamedImports().map(importSpecifier =>
            importSpecifier.getAliasNode()?.getText() ?? importSpecifier.getName()))
    }
    const importedNames = new Set(sourceFile.getImportDeclarations().flatMap(mapper))
    const namesFromModules = allStringsOccurrences(occurences).filter(s => isInModule(s, importedNames))
    return new Set(Array.from(importedNames).concat(Array.from(namesFromModules)))
}

function getVariables(sourceFile: SourceFile): Variables {
    const variableDeclarations = sourceFile
    .getVariableDeclarations()
    .concat(sourceFile
        .getDescendantsOfKind(SyntaxKind.ModuleDeclaration)
        .flatMap(m => m.getVariableDeclarations())) // Nice to have: handle name clases between modules
    return new Map(variableDeclarations.map(v => [v.getName(), v]))

}

// If value is a known name initializer becomes this name,
// otherwise initializer becomes a string literal with the value of 'value'.
// Not so robust but also check for member access/namespace access by splitting on '.'.
// Add to names instead!!
const initializerValue = (names: Set<string>, value: string): string =>
    (names.has(value) && isIdentifier(value)) || value.split(".").some(component => names.has(component) && isIdentifier(component)) // bit sketchy
        ? value
        : `"${value}"`

function updateTransitionAst(transition: Transition, transitionAst: TransitionAST, names: Set<string>): void {
    transitionAst.source.setInitializer(initializerValue(names, transition.source))
    transitionAst.target.setInitializer(initializerValue(names, transition.target))
    transitionAst.label.cmd.setInitializer(initializerValue(names, transition.label.cmd))
    transitionAst.label.role.setInitializer(initializerValue(names, transition.label.role))
    transitionAst.label.logType.setInitializer(`[${transition.label.logType?.map(eventType => initializerValue(names, eventType)).join(", ") ?? "" }]`)
}

// Nice for debugging
function basicVisit(node: Node, prepend: string = '') {
    console.log(`${prepend}Node: ${node.getText()} of kind ${SyntaxKind[node.getKind()]}`);
    node.forEachChild(child => {
        basicVisit(child, prepend + '  * ');
    });
}

// Manipulate initializer of SwarmProtocol: add a transition. Assume that variable declaration declares a proper swarm protocol
// Do something else than replace spaces .... option to add variable declaration or insert as string literal maybe...
function addTransitionToDeclaration(variableDeclaration: VariableDeclaration, transition: Transition, names: Set<string>) {
    const initializer = variableDeclaration.getInitializer()
    const replaceSpaces = (str: string): string => str.split(" ").join("")
    if (initializer.getKind() === SyntaxKind.ObjectLiteralExpression) {
        try {
        const elements = ((initializer as ObjectLiteralExpression).getProperty(TRANSITIONS_FIELD) as PropertyAssignment).getInitializer() as ArrayLiteralExpression//.addPropertyAssignment(JSON.stringify(transition, null, 2))
        const labelString = `{ cmd: ${initializerValue(names, transition.label.cmd)}, role: ${initializerValue(names, transition.label.role)}, logType: [${transition.label.logType?.map(s => initializerValue(names, s)).join(", ") ?? ""}]}`
        elements.addElement(writer => {
            writer
                .write("{")
                .write(`source: ${initializerValue(names, transition.source)}, target: ${initializerValue(names, transition.target)}, label: ${labelString}`)
                .write("}")
        })
    } catch (e) {
            throw Error(`Could not add transition to ${variableDeclaration.getName()}: ${e}`)
        }
    }
}

function updateMetaDataAst(swarmProtocolAst: SwarmProtocolAST, metadata: SwarmProtocolMetadata | undefined, names: Set<string>) {
    if (!metadata) {
        return
    }

    if (swarmProtocolAst.properties.has(METADATA_FIELD)) {
        updateMetadataInitializer(swarmProtocolAst.properties.get(METADATA_FIELD)!, metadata, names)
    } else {
        const initializer = swarmProtocolAst.variableDeclaration.getInitializer()
        if (initializer.getKind() === SyntaxKind.ObjectLiteralExpression) {
            (initializer as ObjectLiteralExpression).addPropertyAssignment({ name: METADATA_FIELD, initializer: metadataWriterFunction(metadata, names) })
        }
    }

}

function updateMetadataInitializer(propertyAssignment: PropertyAssignment, metadata: SwarmProtocolMetadata, names: Set<string>) {
    propertyAssignment.setInitializer(metadataWriterFunction(metadata, names))
}

// Function that returns a WriterFunction to use for writing initializer of metadata field.
// export type WriterFunction = (writer: CodeBlockWriter) => void;
function metadataWriterFunction(metadata: SwarmProtocolMetadata, names: Set<string>): WriterFunction {

    const nodeLayoutString = (nodeLayout: NodeLayout): string => {
        const x = nodeLayout.x ? `, x: ${nodeLayout.x}` : ""
        const y = nodeLayout.y ? `, y: ${nodeLayout.y}` : ""
        return `{ name: ${initializerValue(names, nodeLayout.name)}${x}${y} }`
    }

    const positionHandlerString = (positionHandler: PositionHandler): string => {
        return `{ x: ${positionHandler.x}, y: ${positionHandler.y}, active: ${positionHandler.active}, isLabel: ${positionHandler.isLabel} }`
    }

    const edgeLayoutString = (edgeLayout: EdgeLayout): string => {
        return `{ id: ${edgeLayout.id}, positionHandlers: [ ${edgeLayout.positionHandlers.map(positionHandlerString).join(", ")} ]}`
    }

    const writeArrayProperty = <ElementType>(
        writer: CodeBlockWriter,
        propertyName: string,
        theArray: ElementType[],
        elementWriter: (element: ElementType) => string,
        terminator=""
    ): CodeBlockWriter => {
        writer.writeLine(`${propertyName}: [`)
        theArray.forEach((element, i) => {
            writer.writeLine(`${elementWriter(element)}${i != theArray.length-1 ? ", " : ""}`)
        })
        writer.writeLine(`]${terminator}`)
        return writer
    }

    const writeLayout = (writer: CodeBlockWriter, layout: LayoutType): CodeBlockWriter => {
        writer.writeLine("layout: ").inlineBlock(() => {
            if (layout.nodes) {
                writeArrayProperty(writer, "nodes", layout.nodes, nodeLayoutString, ",")
            }
            if (layout.edges) {
            writeArrayProperty(writer, "edges", layout.edges, edgeLayoutString, "")
            }
        }).write(",")
        return writer

    }

    const writeSubscriptions = (writer: CodeBlockWriter, subscription: Record<string, string[]>): CodeBlockWriter => {
        const subscriptionLines = Array.from(Object.entries(subscription))
            .map(([role, eventTypes]) => `${role}: [${eventTypes.join(", ")}]`)
            .join(", \n")

        writer.writeLine("subscriptions: ").inlineBlock(() => {
            writer.writeLine(subscriptionLines)
        })
        return writer

    }
    const writerFunction = (writer: CodeBlockWriter) => {
        writer.inlineBlock(() => {
            writeLayout(writer, metadata.layout)
            writeSubscriptions(writer, metadata.subscriptions)
        })
    }

    return writerFunction
}

function addStringVariableDeclaration(sourceFile: SourceFile, swarmProtoUsingName: SwarmProtocolAST, name: string): Option<VariableDeclaration> {
    if (!isIdentifier(name)) {
        return none
    }
    sourceFile.insertVariableStatement(swarmProtoUsingName.variableDeclaration.getChildIndex(), {
        declarationKind: VariableDeclarationKind.Const,
        declarations: [
            {
                name,
                initializer: `"${name}"`
            }
        ]
    })

    return some(sourceFile.getVariableDeclaration(name))
}