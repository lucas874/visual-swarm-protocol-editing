import { Project, Node, SyntaxKind, VariableDeclaration, CallExpression, TypeAliasDeclaration, ObjectLiteralExpression, PropertyAssignment, Identifier, SourceFile, StringLiteral, ts, ArrayLiteralExpression, PropertyAccessExpression, Expression, PropertySignature, QuoteKind, NumericLiteral } from "ts-morph";
import { LabelAST, Occurrence, OccurrenceAndAST, SwarmProtocol, SwarmProtocolAST, Transition, TransitionAST } from "./types";


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

type DefinitionNodeInfo = { sourceFile: string, definitionNodeText: string, definitionNode: Node<ts.Node> }

// Constants
const EVENT_DESIGN_FUNCTION = "design: <Key extends string>(key: Key) => EventFactoryIntermediate<Key>"
const EVENT_D_TS = "event.d.ts"
const INITIAL_FIELD = "initial"
const TRANSITIONS_FIELD = "transitions"
const TYPE_FIELD = "type"
const EVENT_DEFINITION_FUNCTIONS = [
    "withPayload: <Payload extends utils.SerializableObject>() => Factory<Key, Payload>;",
    "withoutPayload: () => Factory<Key, Record<never, never>>;",
    "withZod: <Payload extends utils.SerializableObject>(z: z.ZodType<Payload>) => Factory<Key, Payload>;"
]
import { MetadataStore } from "./handle-metadata";

const ERROR_NONE_FOUND = "No swarm protocol found"
const ERROR_PARSE = "Error parsing swarm protocols"

type OccurrenceMap = Map<string, OccurrenceAndAST>
type ProjectOccurrences = {project: Project, occurrences: OccurrenceMap}
type GetProtocolOptions = { reload?: boolean, updateMeta?: boolean }

export class ProtocolReaderWriter {
    metadataStore: MetadataStore
    // Map filenames to swarm protocols occurring in those files
    files: Map<string, ProjectOccurrences>
    //occurrences: Map<string, Map>

    constructor(metadataStore: MetadataStore, fileName?: string) {
        this.metadataStore = metadataStore
        this.files = new Map()
        if (fileName) {
            this.parseProtocols(fileName)
        }
    }

    // Return the swarm protocol occurrences in a file. Read file if not present in `files` map.
    getOccurrences(fileName: string, options: GetProtocolOptions = {}): Occurrence[] {
        const { reload = false, updateMeta = false } = options
        if (!this.files.has(fileName) || reload) {
            this.parseProtocols(fileName)
        }
        if (updateMeta) {
            this.updateOccurrenceMeta(fileName)
        }

        return Array.from(this.files.get(fileName).occurrences.values()).map(oa => oa.occurrence)
    }

    writeOccurrence(filename: string, occurrenceName: string): string {
        const projectOccurrences = this.files.get(filename)
        if (projectOccurrences) {
            const occurrence = projectOccurrences.occurrences.get(occurrenceName)
            if (occurrence) {
                //occurrence.swarmProtocolAST.initial.setInitializer("LALALA")
                try {
                    return projectOccurrences.project.getSourceFileOrThrow(filename).getFullText()
                } catch(error) {
                    throw error
                }
            }
        }

        return ""
    }

    private parseProtocols(fileName: string): void {
        const project = new Project();
        const sourceFile = project.addSourceFileAtPath(fileName);

        // Read protocols and add metadata
        const occurrences = new Map(visitVariableDeclarations(sourceFile)
            .map(oa => this.addMetaDataFromStore(fileName, oa))
            .map(oa => [oa.occurrence.name, oa]))

        this.files.set(fileName, {occurrences: occurrences, project: project})
    }

    // Could mutate directly but
    private updateOccurrenceMeta(fileName: string) {
        const projectOccurrences = this.files.get(fileName)
        const updatedOcurrences: [string, OccurrenceAndAST][] = Array.from(projectOccurrences.occurrences.entries())
            .map(([name, occurrenceAndAst]) => [name, this.addMetaDataFromStore(fileName, occurrenceAndAst)])

        this.files.set(fileName, {project: projectOccurrences.project, occurrences: new Map(updatedOcurrences)})
    }

    // Add metadata from workspace state
    private addMetaDataFromStore(fileName: string, occurrenceAndAst: OccurrenceAndAST): OccurrenceAndAST {
        return {
            ...occurrenceAndAst,
            occurrence: {
            ...occurrenceAndAst.occurrence,
            swarmProtocol: {
                ...occurrenceAndAst.occurrence.swarmProtocol,
                metadata: this.metadataStore.getSwarmProtocolMetaData(fileName, occurrenceAndAst.occurrence.name)
                }
            }
        }
    }
}

// Get all variable declarations and try to parse them as swarm protocols.
function visitVariableDeclarations(sourceFile: SourceFile): OccurrenceAndAST[] {
        const variableDeclarations = sourceFile.getVariableDeclarations()
        const swarmProtocols = variableDeclarations
            .map(variableDeclaration => swarmProtocolDeclaration(variableDeclaration))
            .filter(o => isSome(o))
            .map(o => getValue(o))
        return swarmProtocols
    }


// If a variable is declared as an object with the fields 'initial' and 'transitions'
// try to parse it.
function swarmProtocolDeclaration(node: VariableDeclaration): Option<OccurrenceAndAST> {
    switch (node.getInitializer().getKind()) {
        case SyntaxKind.ObjectLiteralExpression:
            const properties = new Map((node.getInitializer() as ObjectLiteralExpression)
                .getProperties()
                .map(e => (e as PropertyAssignment))
                .map(p => [p.getName(), p]))

            const initial = properties.get(INITIAL_FIELD)
            const transitions = properties.get(TRANSITIONS_FIELD)
            if (initial && transitions) {
                const expandedInitializerInitial = getInitializerInitial(initial)
                const expandedInitializerTransitions = getInitializerTransitions(transitions)
                if (isSome(expandedInitializerInitial) && isSome(expandedInitializerTransitions)) {
                    properties.set(INITIAL_FIELD, getValue(expandedInitializerInitial))
                    properties.set(TRANSITIONS_FIELD, getValue(expandedInitializerTransitions))
                    // Not sure about handling of end position. But did not work just using node.getEnd()..., if formatted to have e.g. }]
                    // these characters would stay messing up the number of open and closed brackets
                    return some(
                        {
                            occurrence: {
                                name: node.getName(),
                                swarmProtocol: propertiesToJSON(properties),
                            },
                            swarmProtocolAST: propertiesToAstInfo(node.getName(), properties),
                        })
                }
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
            return Number((node as NumericLiteral).getLiteralText());
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
        // Other cases?
        default:
            throw new Error(`Unsupported node kind: ${node.getKindName()}`);
    }
}

// Used to turn the 'initial' and 'transitions' fields of a SwarmProtocolType
// into literal values -- something that can not be evaluated any further and
// does not refer to literal values in other files.
function literalInitializer(node: Node<ts.Node>): Option<Node<ts.Node>> {
    //basicVisit(node)
    switch (node.getKind()) {
        case SyntaxKind.StringLiteral:
        case SyntaxKind.NumericLiteral:
        case SyntaxKind.BigIntLiteral:
        case SyntaxKind.TrueKeyword:
        case SyntaxKind.FalseKeyword:
            return some(node)
        case SyntaxKind.Identifier:
            // Assume there is just one definition of this name. At defnitionNodes[0]
            // https://ts-morph.com/details/identifiers:
            // 'Gets the definitions of the identifier.
            // This is similar to "go to definition" functionality that exists with TypeScript in most IDEs.'
            const defnitionNode = definitionNodeInfo(node)
            return isSome(defnitionNode) ? literalInitializer(getValue(defnitionNode).definitionNode) : none
        case SyntaxKind.ArrayLiteralExpression:
            return arrayLiteralInitializer(node as ArrayLiteralExpression, literalInitializer)
        case SyntaxKind.ObjectLiteralExpression:
            return objectLiteralInitializer(node as ObjectLiteralExpression)
        case SyntaxKind.PropertyAccessExpression:
            return literalInitializer((node as PropertyAccessExpression).getNameNode())
        case SyntaxKind.VariableDeclaration:
            return literalInitializer((node as VariableDeclaration).getInitializer())
        default:
            return none
    }
}

// Give every array item a 'literal' initializer.
function arrayLiteralInitializer(node: ArrayLiteralExpression, getInitializer: ((e: Expression<ts.Expression>) => Option<Node<ts.Node>>)): Option<Node<ts.Node>> {
    node.getElements().forEach(e => {
        const literal = getInitializer(e)
        if (isSome(literal)) {
            e.replaceWithText(getValue(literal).getText())
        } else {
            return none
        }
    })

    return some(node)
}

// REDO A LOT OF STUFF: mutability. We actually mutate the ast in the functions -- the values passed to functions are not immutable new instances. So all this returning
// options and resetting fields may have to be redone.
function objectLiteralInitializer(node: ObjectLiteralExpression): Option<Node<ts.Node>> {
    // Transform properties to literal.
    (node as ObjectLiteralExpression)
        .getProperties()
        .forEach(property => {
            if ((property as PropertyAssignment).getName() === "logType") {
                arrayLiteralInitializer((property as PropertyAssignment).getInitializer() as ArrayLiteralExpression, handleLogTypeInitializer)
            } else {
                literalInitializer((property as PropertyAssignment).getInitializer())
            }
        })
    return some(node)
}

function getInitializerInitial(node: PropertyAssignment): Option<PropertyAssignment> {
    const initializer = node.getInitializer()
    const literalOption = literalInitializer(initializer)
    if (isSome(literalOption)) {
        const literal = getValue(literalOption)
        if (literal.getKind() === SyntaxKind.StringLiteral) {
            return some(node.setInitializer(literal.getText()))
        }
    }
    return none
}

// Consider re-designing taking mutability into account. All the option stuff was there assuming
// we did not mutate, so right now it looks a bit weird.
function getInitializerTransitions(node: PropertyAssignment): Option<PropertyAssignment> {
    const initializer = node.getInitializer()
    const literalOption = literalInitializer(initializer)
    if (isSome(literalOption)) {
        return some(node)
    }
    return none
}

/**
 * Typically we will have something like
 * ```typescript
 *  const myEvent = MachineEvent.design('MyEventType').withoutPayload()
 *  const swarmProtocol: SwarmProtocolType = {
 *  initial: "0",
 *  transitions: [ { label: { cmd: "R1_cmd_2", logType: [myEvent.type], role: "R" }, source: "0", target: "1", },
 *                ...
 *               ]
 * ```
 * Task here is to replace myEvent.type with 'MyEventType'.
 * `myEvent` could be defined in some namespace, in another file, or wherever.
 * We know that logType is initialized as an array of strings.
 *
 * @param node
 *
 * @returns Option<Node<ts.Node>>
 */
function handleLogTypeInitializer(node: Node<ts.Node>): Option<Node<ts.Node>> {
    switch (node.getKind()) {
        case SyntaxKind.StringLiteral:
            return some(node)
        case SyntaxKind.Identifier:
            // Assume there is just one definition of this name. At defnitionNodes[0]
            const definitionNode = definitionNodeInfo(node)
            return isSome(definitionNode) ? handleLogTypeInitializer(getValue(definitionNode).definitionNode) : none
        case SyntaxKind.PropertyAccessExpression:
            const definitionNodeProperty = definitionNodeInfo(node)
            if (isSome(definitionNodeProperty) && isEventTypeProperty(getValue(definitionNodeProperty))) {
                // Here we have an property access expression of the form myEvent.type
                // pass 'myEvent' to extract event type to get the event type of myEvent
                return extractEventTypeFromDesign((node as PropertyAccessExpression).getExpression())
            } else {
                return handleLogTypeInitializer((node as PropertyAccessExpression).getNameNode())
            }

        case SyntaxKind.VariableDeclaration:
            return handleLogTypeInitializer((node as VariableDeclaration).getInitializer())
        default:
            return none
    }
}

function extractEventTypeFromDesign(node: Node<ts.Node>): Option<Node<ts.Node>> {
    switch (node.getKind()) {
        case SyntaxKind.PropertyAccessExpression:
            const definitionNodeProperty = definitionNodeInfo(node)
            if (isSome(definitionNodeProperty) && isEventDefinition(getValue(definitionNodeProperty))) {
                // At this point we have an expression MachineEvent.design('myEventType').( withoutPayload() + withPayload<...>() + withZod<...>() )
                // Recurse wit the 'MachineEvent.design('myEventType')' bit of this expression
                return extractEventTypeFromDesign((node as PropertyAccessExpression).getExpression())
            }
            // Entered if e.g. event is defined in a namespace Events and we have
            // Events.myEvent --> getNamenameNode() returns the myEvent bit of this expression.
            return extractEventTypeFromDesign((node as PropertyAccessExpression).getNameNode())
        case SyntaxKind.Identifier:
            const definitionNodes = (node as Identifier).getDefinitionNodes()
            // Assume there is just one definition of this name. At defnitionNodes[0]
            return definitionNodes.length > 0 ? extractEventTypeFromDesign(definitionNodes[0]) : none
        case SyntaxKind.VariableDeclaration:
            return extractEventTypeFromDesign((node as VariableDeclaration).getInitializer())
        case SyntaxKind.CallExpression:
            // Check if this is a call to withPayload or withoutPayload. If so get parent propertyAccessExpression and go back to call to design.
            // Do this by resolving files. Should be somewhere in Runner.
            const expr = (node as CallExpression).getExpression()
            const callInfoOption = definitionNodeInfo(expr)
            if (isSome(callInfoOption) && isEventDesign(getValue(callInfoOption))) {
                // Assume there will be exactly one arguments: a string naming the event type
                return some((node as CallExpression).getArguments()[0])
            }
            return extractEventTypeFromDesign(expr)
    }

    return none
}

// Assumes one definition
function definitionNodeInfo(node: Node<ts.Node>): Option<DefinitionNodeInfo> {
    switch (node.getKind()) {
        case SyntaxKind.PropertyAccessExpression:
            const definitionNodesProperty = (node as PropertyAccessExpression).getNameNode().getDefinitionNodes()
            if (definitionNodesProperty.length > 0) {
                // Assume just one definition
                const definitionNode = definitionNodesProperty[0]
                return some({ sourceFile: definitionNode.getSourceFile().getFilePath(), definitionNodeText: definitionNode.getText(), definitionNode })
            }
            return none
        case SyntaxKind.Identifier:
            const definitionNodesIdentifier = (node as Identifier).getDefinitionNodes()
            if (definitionNodesIdentifier.length > 0) {
                // Assume just one definition
                const definitionNode = definitionNodesIdentifier[0]
                return some({ sourceFile: definitionNode.getSourceFile().getFilePath(), definitionNodeText: definitionNode.getText(), definitionNode })
            }
            return none
        default:
            throw Error(`Not implemented: definitionNodeInfo(node) where \`node\` is of type ${node.getKindName()}.`)
    }
}

function isEventTypeProperty(nodeInfo: DefinitionNodeInfo): boolean {
    return nodeInfo.sourceFile.endsWith(EVENT_D_TS)
        && nodeInfo.definitionNode.getKind() == SyntaxKind.PropertySignature
        && (nodeInfo.definitionNode as PropertySignature).getName() === TYPE_FIELD
}

function isEventDefinition(nodeInfo: DefinitionNodeInfo): boolean {
    return (nodeInfo.sourceFile.endsWith(EVENT_D_TS) && EVENT_DEFINITION_FUNCTIONS.some(eventDefFunction => eventDefFunction === nodeInfo.definitionNodeText))
}

function isEventDesign(nodeInfo: DefinitionNodeInfo): boolean {
    return nodeInfo.sourceFile.endsWith(EVENT_D_TS) && nodeInfo.definitionNodeText === EVENT_DESIGN_FUNCTION
}

function setInitializer(node: PropertyAssignment, newInitializer: string) {
    node.setInitializer(newInitializer)
}

// These functions make a lot of assumptions on the shape of 'properties' and the ast nodes encountered.
// They assume that that they represent exactly an instance of SwarmProtocolType.
// Id of edge is the index of edge in transitions? Does this work if just set here. Might be reordered somewhere...
// If we do this ids should be the same as indices in propertiesToAstInfo?
function propertiesToJSON(properties: Map<string, PropertyAssignment>): SwarmProtocol {
    const protocol: any = {}
    protocol[INITIAL_FIELD] = extractValue(properties.get(INITIAL_FIELD).getInitializer())
    protocol[TRANSITIONS_FIELD] = extractValue(properties.get(TRANSITIONS_FIELD).getInitializer())
    protocol.transitions = (protocol.transitions).map((transition, index) => { return {...transition, edgeId: index} })
    return protocol as SwarmProtocol
}

function propertiesToAstInfo(name: string, properties: Map<string, PropertyAssignment>): SwarmProtocolAST {
    const transitions = transitionsToAstInfo(properties.get(TRANSITIONS_FIELD).getInitializer() as ArrayLiteralExpression)
    return { name, initial: properties.get(INITIAL_FIELD), transitions: transitions }
}

function transitionsToAstInfo(transitions: ArrayLiteralExpression): TransitionAST[] {
    return transitions
        .getElements()
        .map(transitionToAstInfo)
}

function transitionToAstInfo(transition: ObjectLiteralExpression): TransitionAST {
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

// Nice for debugging
function basicVisit(node: Node, prepend: string = '') {
    console.log(`${prepend}Node: ${node.getText()} of kind ${SyntaxKind[node.getKind()]}`);
    node.forEachChild(child => {
        basicVisit(child, prepend + '  * ');
    });
}