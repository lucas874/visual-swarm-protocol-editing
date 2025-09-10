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

export function parseProtocols(fileName: string): any[] {
    const project = new Project();
    const sourceFile = project.addSourceFileAtPath(fileName);
    visitVariableDeclarations(sourceFile)
    throw Error("Not implemented")
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
            // Assume there is just one definition of this name
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
    switch (node.getKind()) {
        case SyntaxKind.StringLiteral:
            return some(node)
        case SyntaxKind.Identifier:
            const definitionNodes = (node as Identifier).getDefinitionNodes()
            // Assume there is just one definition of this name at defnitionNodes[0]
            return definitionNodes.length > 0 ? handleLogTypeInitializer(definitionNodes[0]) : none
        case SyntaxKind.PropertyAccessExpression:
            const definitionNodesProperty = (node as PropertyAccessExpression).getNameNode().getDefinitionNodes()
            // Assume one definition
            if (definitionNodesProperty.length > 0) {
                const definitionNode = definitionNodesProperty[0]
                if (definitionNode.getSourceFile().getFilePath().endsWith("event.d.ts")
                    && definitionNode.getKind() == SyntaxKind.PropertySignature
                    && (definitionNode as PropertySignature).getName() === "type") {
                    handleLogTypeInitializer((node as PropertyAccessExpression).getExpression())

                } else {
                return handleLogTypeInitializer((node as PropertyAccessExpression).getNameNode())
                }
            }
        case SyntaxKind.VariableDeclaration:
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

function visitVariableDeclarations(sourceFile: SourceFile) {
    const variableDeclarations = sourceFile.getVariableDeclarations()
    const swarmProtocols = variableDeclarations.map(variableDeclaration => swarmProtocolDeclaration(variableDeclaration)).filter(o => isSome(o))
    return swarmProtocols

}

// Nice for debugging
function basicVisit(node: Node, prepend: string = '') {
    console.log(`${prepend}Node: ${node.getText()} of kind ${SyntaxKind[node.getKind()]}`);
    node.forEachChild(child => {
        basicVisit(child, prepend + '  * ');
    });
}