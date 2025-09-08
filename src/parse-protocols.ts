import { Project, Node, SyntaxKind, VariableDeclaration, CallExpression, TypeAliasDeclaration, ObjectLiteralExpression, PropertyAssignment, Identifier } from "ts-morph";
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
  const project = new Project({tsConfigFilePath: "/home/luccl/Git/visual-swarm-protocol-editing/tsconfig.json"});
  const sourceFile = project.addSourceFileAtPath(fileName);
  const visitor = new CollectingVisitor();
  traverse(sourceFile, visitor)
    throw Error
}

// Visitor interface
interface ASTVisitor {
  visitVariableDeclaration?(node: VariableDeclaration): void;
  visitTypeAliasDeclaration?(node: TypeAliasDeclaration): void;
  // Fallback for unhandled nodes
  visitNode?(node: Node): void;
}

// Traversal function — calls specialized visit methods if available
function traverse(node: Node, visitor: ASTVisitor) {
  switch (node.getKind()) {
    case SyntaxKind.VariableDeclaration:
      visitor.visitVariableDeclaration?.(node as VariableDeclaration);
      break;
    case SyntaxKind.TypeAliasDeclaration:
      visitor.visitTypeAliasDeclaration?.(node as TypeAliasDeclaration);
      break;
    default:
      visitor.visitNode?.(node);
  }

  node.forEachChild(child => traverse(child, visitor));
}

// Traverse an ast constructing an collecting instances of 'SwarmProtocolType'
class CollectingVisitor implements ASTVisitor {
  protocols: Occurrence[] = [];

  childWithKind(node: Node, kind: SyntaxKind): boolean {
    return node.getChildrenOfKind(kind).length > 0;
  }

  // Find child that is a TypeNode or undefined
  childTypeNode(node: Node): Node | undefined {
    return node.getChildren().find(child => Node.isTyped(child));
  }

  // Events are defined using MachineEvent.design('event type')...
  // Extract 'event type'
  getEventTypeNameFromArgs(node: CallExpression): string {
    const args = node.getArguments();
    //basicVisit(node)
    if (args && args.length > 0) {
      if (args[0]!.getKind() === SyntaxKind.StringLiteral) {
        return args[0]!.getText().replace(/['"]/g, '');
      } else if (args[0]?.getKind() === SyntaxKind.Identifier) {
      }
    }
    throw new Error(`Event type name not found in arguments of call expression: ${node.getText()}`);
  }

  swarmProtocolDeclaration(node: VariableDeclaration): Option<Occurrence> {
    switch (node.getInitializer().getKind()) {
        case SyntaxKind.ObjectLiteralExpression:
            const properties = (node.getInitializer() as ObjectLiteralExpression).getProperties().map(e => (e as PropertyAssignment))

            for (const p of properties) {
                //console.log("keys: ", Object.keys(p))
                //console.log(p)

                //console.log(Object.getPrototypeOf(p))
                console.log(p.getName())
                //console.log(p.getChildren().map(e => e.getKindName()))
                basicVisit(p)
                console.log("----")
            }


        }

    return none

  }

  visitVariableDeclaration(node: VariableDeclaration) {
    console.log("Variable declaration")

    console.log("Initializer: ", node.getInitializer())
    console.log("Initializer: ", node.getInitializer().getKindName())
    if (this.swarmProtocolDeclaration(node)) {
        basicVisit(node)
    }

  }

  // Insert a type variable into eventSpec.typeVariables
  visitTypeAliasDeclaration(node: TypeAliasDeclaration) {
    console.log("Type alias declaration")
    const typeNode = node.getTypeNode();
    //basicVisit(node)
  }
}



// Nice for debugging
function basicVisit(node: Node, prepend: string = '') {
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
    /* const symbol = node.getSymbolOrThrow()
    console.log("symbol: ", symbol)
    const declarations = symbol.getDeclarations();

    for (const decl of declarations) {
        const declSourceFile = decl.getSourceFile();
        console.log("Defined in:", declSourceFile.getFilePath());
        console.log("Declaration text:", decl.getText());
    } */
  }
  node.forEachChild(child => {
    basicVisit(child, prepend + '  * ');
  });
}
