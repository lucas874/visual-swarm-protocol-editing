import { Project, Node, SyntaxKind, VariableDeclaration, CallExpression, TypeAliasDeclaration, ObjectLiteralExpression, PropertyAssignment, Identifier, SourceFile, StringLiteral, ts, ArrayLiteralExpression, PropertyAccessExpression, Expression, PropertySignature } from "ts-morph";
import { SwarmProtocolType } from "@actyx/machine-check";
export type Occurrence = { name: string, jsonObject: SwarmProtocolType }

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

export function parseProtocols(fileName: string): Option<Occurrence>[] {
    const project = new Project();
    const sourceFile = project.addSourceFileAtPath(fileName);
    return visitVariableDeclarations(sourceFile)
}


function visitVariableDeclarations(sourceFile: SourceFile): Option<Occurrence>[] {
    const variableDeclarations = sourceFile.getVariableDeclarations()
    const swarmProtocols = variableDeclarations.map(variableDeclaration => swarmProtocolDeclaration(variableDeclaration)).filter(o => isSome(o))
    return swarmProtocols
}

function swarmProtocolDeclaration(node: VariableDeclaration): Option<Occurrence> {
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
                    return some({name: node.getName(), jsonObject: properties_to_json(properties)})
                }
            }
    }

    return none

}

function properties_to_json(properties: Map<string, PropertyAssignment>): SwarmProtocolType {
    const protocol = new Object()
    const transitionsInitializer = properties.get(TRANSITIONS_FIELD).getInitializer() as ArrayLiteralExpression
    const transitions = transitionsInitializer.getElements()
        .map(element => {
            const label = new Object();
            (element as ObjectLiteralExpression)
                .getProperties()
                .forEach(property => {
                    const p = (property as PropertyAssignment)
                    label[p.getName()] = p.getInitializer().getText()
                    //return `{ "${p.getName()}": "${p.getInitializer().getText()}" }`
                })
            return label
        })
    protocol["initial"] = properties.get(INITIAL_FIELD).getInitializer().getText()
    protocol["transitions"] = transitions

    return protocol as SwarmProtocolType
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
    // Remove the properties
    // Add the literal properties
    //basicVisit(node)
    console.log("before: ", (node as ObjectLiteralExpression).getText());
    (node as ObjectLiteralExpression)
        .getProperties()
        .forEach(property => {
            if((property as PropertyAssignment).getName() === "logType") {
                arrayLiteralInitializer((property as PropertyAssignment).getInitializer() as ArrayLiteralExpression, handleLogTypeInitializer)
            } else {
                literalInitializer((property as PropertyAssignment).getInitializer())
            }
        })
    /* const properties = (node as ObjectLiteralExpression)
        .getProperties()
        .map(p => {
            const property = (p as PropertyAssignment)
            return {
                name: property.getName(),
                initializer: property.getName() === "logType" ? arrayLiteralInitializer(property.getInitializer() as ArrayLiteralExpression, handleLogTypeInitializer) : literalInitializer(property.getInitializer())
            }
        });
    console.log("after: ", (node as ObjectLiteralExpression).getText())
    properties.forEach(n =>{
        if (isSome(n.initializer)) {
            console.log(getValue(n.initializer).getText())
        }
    })
    node.getProperties().forEach(p => p.remove())
    for (const property of properties) {
        if (isSome(property.initializer)) {
            console.log("hey")
            console.log("new initializer: ", getValue(property.initializer));
            console.log("what 2")
            console.log(getValue(property.initializer).getText());
            (node as ObjectLiteralExpression).addPropertyAssignment({ name: property.name, initializer: getValue(property.initializer).getText() })
        } else {
            return none
        }

    } */
       console.log("after: ", (node as ObjectLiteralExpression).getText())
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

function getInitializerTransitions(node: PropertyAssignment): Option<PropertyAssignment> {
    const initializer = node.getInitializer()
    const literalOption = literalInitializer(initializer)
    if (isSome(literalOption)) {
        const literal = getValue(literalOption)
        return some(node.setInitializer(literal.getText()))
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

// Nice for debugging
function basicVisit(node: Node, prepend: string = '') {
    console.log(`${prepend}Node: ${node.getText()} of kind ${SyntaxKind[node.getKind()]}`);
    node.forEachChild(child => {
        basicVisit(child, prepend + '  * ');
    });
}