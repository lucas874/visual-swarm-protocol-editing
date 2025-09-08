import { Project, Node, SyntaxKind, VariableDeclaration, CallExpression, TypeAliasDeclaration, ObjectLiteralExpression, PropertyAssignment, Identifier, SourceFile, StringLiteral, ts, ArrayLiteralExpression, PropertyAccessExpression } from "ts-morph";
import { SwarmProtocolType } from "@actyx/machine-check";
type Occurrence = { name: string, jsonObject: SwarmProtocolType}

// https://dev.to/martinpersson/a-guide-to-using-the-option-type-in-typescript-ki2
export type Some<T> = { tag: "Some", value: T}
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
            for (const node of definitionNodes) {
                console.log(node)
                console.log("Def in: ", node.getSourceFile().getFilePath())
            }
            if (definitionNodes.length > 0) {
                return literalInitializer(definitionNodes[0]) // Assume there is just one definition of this name
            } else {
                return none
            }
        case SyntaxKind.VariableDeclaration:
            return literalInitializer((node as VariableDeclaration).getInitializer())
        case SyntaxKind.ArrayLiteralExpression:
            /* const elements = (node as ArrayLiteralExpression).getElements().map(e => literalInitializer(e));
            (node as ArrayLiteralExpression).getElements().forEach(e => e.re)
            elements.forEach((element, index) => {
                if (isSome(element)) {
                    (node as ArrayLiteralExpression).insertElement(index, getValue(element).getText())
                } else {
                    return none
                }

            }) */
            console.log("array: ", node.getText());
            (node as ArrayLiteralExpression).getElements().forEach(e => {
                const literal = literalInitializer(e)
                console.log("literal: ", literal)
                if (isSome(literal)) {
                    console.log("getValue(literal).getText()", getValue(literal).getText())
                    console.log("e.getText(): ", e.getText())
                    e.replaceWithText(getValue(literal).getText())
                    console.log("e.getText(): ", e.getText())
                } else {
                    return none
                }
            })

            console.log("array after: ", node.getText());
            return some(node)
        case SyntaxKind.ObjectLiteralExpression:
            // Transform properties to literal.
            // Remove the properties
            // Add the literal properties
            console.log("object: ", node.getText());
            //basicVisit(node)
            const properties = (node as ObjectLiteralExpression)
                .getProperties()
                .map(p => {
                    const property = (p as PropertyAssignment)
                    if (property.getName() === "logType") {
                        console.log("GOBLIINNNNN!")
                        basicVisit(property.getInitializer())
                    }
                    return {name: property.getName(), initializer: literalInitializer(property.getInitializer())}
                });
            console.log("properties: ", properties);
            (node as ObjectLiteralExpression).getProperties().forEach(p => p.remove())
            for (const property of properties) {
                if (isSome(property.initializer)) {
                    (node as ObjectLiteralExpression).addPropertyAssignment({name: property.name, initializer: getValue(property.initializer).getText()})
                } else {
                    return none
                }

            }
            console.log("object after: ", node.getText());
            return some(node)
        case SyntaxKind.PropertyAccessExpression:
            console.log((node as PropertyAccessExpression).getName())
            console.log((node as PropertyAccessExpression).getNameNode())
            return literalInitializer((node as PropertyAccessExpression).getNameNode())

        default:
            return none
    }
}

function getInitializerInitial(node: PropertyAssignment): Option<PropertyAssignment> {
    const initializer = node.getInitializer()
    console.log("initializer: ", initializer)
    const literalOption = literalInitializer(initializer)
    if (isSome(literalOption)) {
        const literal = getValue(literalOption)
        console.log(literal)
        console.log(literal.getText())
        if (literal.getKind() === SyntaxKind.StringLiteral) {
            return some(node.setInitializer(literal.getText()))
        }
    }
    return none
}

function getInitializerTransitions(node: PropertyAssignment): Option<PropertyAssignment> {
    const initializer = node.getInitializer()
    console.log("initializer: ", initializer)
    const literalOption = literalInitializer(initializer)
    if (isSome(literalOption)) {
        const literal = getValue(literalOption)
        console.log("literal: ", literal)
        console.log("literal text: ", literal.getText())

    }
    return none
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

// Nice for debugging
/* function basicVisit(node: Node, prepend: string = '') {
  console.log(`${prepend}Node: ${node.getText()} of kind ${SyntaxKind[node.getKind()]}`);
  if (node.getKind() === SyntaxKind.Identifier) {
    const a = (node as Identifier).getDefinitions()
    console.log("a: ", a)
    const b = (node as Identifier).getDefinitionNodes()
    console.log("b: ", b)
    for (const d of b) {
        console.log(d)
        console.log("Def in: ", d.getSourceFile().getFilePath())
    }
    const symbol = node.getSymbolOrThrow()
    console.log("symbol: ", symbol)
    const declarations = symbol.getDeclarations();

    for (const decl of declarations) {
        const declSourceFile = decl.getSourceFile();
        console.log("Defined in:", declSourceFile.getFilePath());
        console.log("Declaration text:", decl.getText());
    }
  }
  node.forEachChild(child => {
    basicVisit(child, prepend + '  * ');
  });
} */
