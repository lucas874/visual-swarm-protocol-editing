import { Project, Node, SyntaxKind, VariableDeclaration, CallExpression, TypeAliasDeclaration, ObjectLiteralExpression, PropertyAssignment, Identifier, SourceFile, StringLiteral, ts, ArrayLiteralExpression, PropertyAccessExpression, Expression, PropertySignature, QuoteKind, NumericLiteral } from "ts-morph";
import { LabelAST, Occurrence, OccurrenceInfo, ProtocolDiff, SwarmProtocol, SwarmProtocolAST, Transition, TransitionAST } from "./types";


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

type OccurrenceMap = Map<string, Occurrence>
type AstMap = Map<string, SwarmProtocolAST>
type ProjectOccurrences = {project: Project, occurrences: OccurrenceMap, ASTs: AstMap}
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

        return Array.from(this.files.get(fileName).occurrences.values())
    }

    async writeOccurrence(filename: string, updatedOccurrence: Occurrence): Promise<void> {
        const projectOccurrences = this.files.get(filename)
        if (!projectOccurrences) { return }

        const swarmProtocolAst = projectOccurrences.ASTs.get(updatedOccurrence.name)
        const oldOccurrence = projectOccurrences.occurrences.get(updatedOccurrence.name)
        if (swarmProtocolAst && oldOccurrence) {
            const oldSwarmProtocol = oldOccurrence.swarmProtocol
            if (oldSwarmProtocol.initial !== updatedOccurrence.swarmProtocol.initial) {
                swarmProtocolAst.initial.setInitializer(`${updatedOccurrence.swarmProtocol.initial}`)
            }
            await projectOccurrences.project.getSourceFileOrThrow(filename).save()
        }
    }

    private parseProtocols(fileName: string): void {
        const projectRead = new Project();
        const sourceFileRead = projectRead.addSourceFileAtPath(fileName);

        // Read occurrences and their ASTs
        const occurrenceInfos = visitVariableDeclarations(sourceFileRead)
        // Get protocols and add metadata
        const occurrences = new Map(occurrenceInfos
            .map(occurrenceInfo => this.addMetaDataFromStore(fileName, occurrenceInfo.occurrence))
            .map(occurrence => [occurrence.name, occurrence])
        )
        // Get AST snippets representing protocols
        const swarmProtocolASTs = new Map(occurrenceInfos
            .map(occurrenceInfo => [occurrenceInfo.swarmProtocolAST.name, occurrenceInfo.swarmProtocolAST])
        )

        this.files.set(fileName, {occurrences: occurrences, project: projectRead, ASTs: swarmProtocolASTs})
    }

    // Could mutate directly but
    private updateOccurrenceMeta(fileName: string) {
        const projectOccurrences = this.files.get(fileName)
        const updatedOcurrences: [string, Occurrence][] = Array.from(projectOccurrences.occurrences.entries())
            .map(([name, occurrenceAndAst]) => [name, this.addMetaDataFromStore(fileName, occurrenceAndAst)])

        this.files.set(fileName, {project: projectOccurrences.project, occurrences: new Map(updatedOcurrences), ASTs: projectOccurrences.ASTs})
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
    }

// Get all variable declarations and try to parse them as swarm protocols.
function visitVariableDeclarations(sourceFile: SourceFile): OccurrenceInfo[] {
        const variableDeclarations = sourceFile.getVariableDeclarations()
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

            const initial = properties.get(INITIAL_FIELD)
            const transitions = properties.get(TRANSITIONS_FIELD)
            if (initial && transitions) {
                return some({
                        occurrence: {
                                name: node.getName(),
                                swarmProtocol: propertiesToJSON(properties),
                        },
                        swarmProtocolAST: propertiesToAstInfo(node.getName(), properties)
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
        default:
            return node.getText()
    }
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
        .map((transition, index) => transitionToAstInfo(transition as ObjectLiteralExpression, index))
}

function transitionToAstInfo(transition: ObjectLiteralExpression, edgeId?: number): TransitionAST {
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
    if (edgeId) {
        transitionAst.edgeId = edgeId
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