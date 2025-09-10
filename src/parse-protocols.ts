import { Project, Node, SyntaxKind, VariableDeclaration, CallExpression, TypeAliasDeclaration, ObjectLiteralExpression, PropertyAssignment, Identifier, SourceFile, StringLiteral, ts, ArrayLiteralExpression, PropertyAccessExpression, Expression, PropertySignature } from "ts-morph";
import { SwarmProtocolType } from "@actyx/machine-check";
type Occurrence = { name: string, jsonObject: SwarmProtocolType }

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

const EVENT_DESIGN_FUN = "design: <Key extends string>(key: Key) => EventFactoryIntermediate<Key>"
const EVENT_D_TS = "event.d.ts"

export function parseProtocols(fileName: string): any[] {
    const project = new Project();
    const sourceFile = project.addSourceFileAtPath(fileName);
    visitVariableDeclarations(sourceFile)
    throw Error("Not implemented")
}


function visitVariableDeclarations(sourceFile: SourceFile) {
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

            const initial = properties.get("initial")
            if (initial) {
                const expandedInitializer = getInitializerInitial(initial)
                if (isSome(expandedInitializer)) {
                    properties.set("initial", getValue(expandedInitializer))
                }
            }
            const transitions = properties.get("transitions")
            if (transitions) {
                const expandedInitializer = getInitializerTransitions(transitions)
            }
    }

    return none

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
            const definitionNodes = (node as Identifier).getDefinitionNodes()
            for (const node of definitionNodes) {
                console.log(node)
                console.log("Def in: ", node.getSourceFile().getFilePath())
            }
            // Assume there is just one definition of this name. At defnitionNodes[0]
            // https://ts-morph.com/details/identifiers:
            // 'Gets the definitions of the identifier.
            // This is similar to "go to definition" functionality that exists with TypeScript in most IDEs.'
            return definitionNodes.length > 0 ? literalInitializer(definitionNodes[0]) : none
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

function objectLiteralInitializer(node: ObjectLiteralExpression): Option<Node<ts.Node>> {
    // Transform properties to literal.
    // Remove the properties
    // Add the literal properties
    //basicVisit(node)
    const properties = (node as ObjectLiteralExpression)
        .getProperties()
        .map(p => {
            const property = (p as PropertyAssignment)
            return {
                name: property.getName(),
                initializer: property.getName() === "logType" ? arrayLiteralInitializer(property.getInitializer() as ArrayLiteralExpression, handleLogTypeInitializer) : literalInitializer(property.getInitializer())
            }
        });
    node.getProperties().forEach(p => p.remove())
    for (const property of properties) {
        if (isSome(property.initializer)) {
            (node as ObjectLiteralExpression).addPropertyAssignment({ name: property.name, initializer: getValue(property.initializer).getText() })
        } else {
            return none
        }

    }
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
    console.log(node.getText())
    switch (node.getKind()) {
        case SyntaxKind.StringLiteral:
            return some(node)
        case SyntaxKind.Identifier:
            const definitionNodes = (node as Identifier).getDefinitionNodes()
            for (const node of definitionNodes) {
                console.log(node)
                console.log("Def in: ", node.getSourceFile().getFilePath())
            }
            // Assume there is just one definition of this name. At defnitionNodes[0]
            return definitionNodes.length > 0 ? handleLogTypeInitializer(definitionNodes[0]) : none
        case SyntaxKind.PropertyAccessExpression:
            const definitionNodesProperty = (node as PropertyAccessExpression).getNameNode().getDefinitionNodes()
            // Assume one definition
            if (definitionNodesProperty.length > 0) {
                const definitionNode = definitionNodesProperty[0]
                if (definitionNode.getSourceFile().getFilePath().endsWith("event.d.ts")
                    && definitionNode.getKind() == SyntaxKind.PropertySignature
                    && (definitionNode as PropertySignature).getName() === "type") {
                    console.log("definitionNode.getText(): ", definitionNode.getText())
                    console.log("definitionNode.getSourceFile().getFilePath(): ", definitionNode.getSourceFile().getFilePath())
                    // Here we have an property access expression of the form myEvent.type
                    // pass 'myEvent' to extract event type to get the event type of myEvent
                    return extractEventType((node as PropertyAccessExpression).getExpression())
                    //return handleLogTypeInitializer((node as PropertyAccessExpression).getExpression())

                } else {
                console.log("nameNode: ", (node as PropertyAccessExpression).getNameNode().getText())
                console.log("expression: ", (node as PropertyAccessExpression).getExpression().getText())
                return handleLogTypeInitializer((node as PropertyAccessExpression).getNameNode())
                }
            }
        case SyntaxKind.VariableDeclaration:
            console.log(node.getText())
            return handleLogTypeInitializer((node as VariableDeclaration).getInitializer())
        case SyntaxKind.CallExpression:
                // Check if this is a call to withPayload or withoutPayload. If so get parent propertyAccessExpression and go back to call to design.
                // Do this by resolving files. Should be somewhere in Runner.
                // Consider removing all of this extraction of argument to design to own function and have argument to this function be Expression<ts.Expression> again.
            console.log("In call expression: (node as CallExpression).getText(): ", (node as CallExpression).getText())
            console.log("In call expression: (node as CallExpression): ", (node as CallExpression))
            console.log((node as CallExpression).getArguments())
            console.log((node as CallExpression).getExpression().getLastToken().getText())

            console.log((node as CallExpression).getExpression().getKindName())
        default:
            return none
    }
}

function extractEventType(node: Node<ts.Node>): Option<Node<ts.Node>> {
    console.log(node.getText())
    console.log(node.getKindName())
    const eventDefFunctions = [
        "withPayload: <Payload extends utils.SerializableObject>() => Factory<Key, Payload>;",
        "withoutPayload: () => Factory<Key, Record<never, never>>;",
        "withZod: <Payload extends utils.SerializableObject>(z: z.ZodType<Payload>) => Factory<Key, Payload>;"

    ]
    switch (node.getKind()) {
        case SyntaxKind.PropertyAccessExpression:
            const definitionNodesProperty = (node as PropertyAccessExpression).getNameNode().getDefinitionNodes()
            if (definitionNodesProperty.length > 0) {
                // Assume just one definition
                const definitionNode = definitionNodesProperty[0]
                console.log("definitionNode.getText(): ", definitionNode.getText())
                console.log("definitionNode.getSourceFile().getFilePath(): ", definitionNode.getSourceFile().getFilePath())
                if (definitionNode.getSourceFile().getFilePath().endsWith(EVENT_D_TS) && eventDefFunctions.some(eventDefFunction => eventDefFunction === definitionNode.getText())) {
                    console.log(definitionNode)
                    // At this point we have an expression MachineEvent.design('myEventType').( withoutPayload() + withPayload<...>() + withZod<...>() )
                    // Recurse wit the 'MachineEvent.design('myEventType')' bit of this expression
                    return extractEventType((node as PropertyAccessExpression).getExpression())
                }
            }
            // Entered if e.g. event is defined in a namespace Events and we have
            // Events.myEvent --> getNamenameNode() returns the myEvent bit of this expression.
            return extractEventType((node as PropertyAccessExpression).getNameNode())
        case SyntaxKind.Identifier:
            const definitionNodes = (node as Identifier).getDefinitionNodes()
            // Assume there is just one definition of this name. At defnitionNodes[0]
            return definitionNodes.length > 0 ? extractEventType(definitionNodes[0]) : none
        case SyntaxKind.VariableDeclaration:
            return extractEventType((node as VariableDeclaration).getInitializer())
        case SyntaxKind.CallExpression:
            // Check if this is a call to withPayload or withoutPayload. If so get parent propertyAccessExpression and go back to call to design.
            // Do this by resolving files. Should be somewhere in Runner.
            // Consider removing all of this extraction of argument to design to own function and have argument to this function be Expression<ts.Expression> again.
            console.log("lastToken of call expression: ", (node as CallExpression).getExpression().getLastToken().getText());
            const expr = (node as CallExpression).getExpression()
            const callInfoOption = definitionNodeInfo(expr)
            if (isSome(callInfoOption) && isEventDesign(getValue(callInfoOption))) {
                // Assume there will be exactly one arguments: a string naming the event type
                console.log((node as CallExpression).getArguments())
                console.log((node as CallExpression).getArguments().map(n => n.getText()))
                return some((node as CallExpression).getArguments()[0])
            }
            return extractEventType(expr)
    }

    return none
}

function definitionNodeInfo(node: Node<ts.Node>): Option<DefinitionNodeInfo> {
    //const expr = node.getExpression();
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

function isEventDesign(nodeInfo: DefinitionNodeInfo) {
    return nodeInfo.sourceFile.endsWith(EVENT_D_TS) && nodeInfo.definitionNodeText === EVENT_DESIGN_FUN
}

// Nice for debugging
function basicVisit(node: Node, prepend: string = '') {
    console.log(`${prepend}Node: ${node.getText()} of kind ${SyntaxKind[node.getKind()]}`);
    node.forEachChild(child => {
        basicVisit(child, prepend + '  * ');
    });
}