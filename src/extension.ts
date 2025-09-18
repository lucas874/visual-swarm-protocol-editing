import * as vscode from "vscode";
import JSON5 from "json5";
import path from "path";
import { SwarmProtocolType } from "@actyx/machine-check";
import {
  checkUnconnectedNodes,
  checkDuplicatedEdgeLabels,
  WellFormednessCheck,
  checkWellFormedness,
  hasInitial,
} from "./error-utils";
import { getValue, isSome, ProtocolReaderWriter } from "./protocol-reader-writer";
import { Occurrence, OccurrenceAndAST, SwarmProtocol } from "./types";
import { MetadataStore } from "./handle-metadata";

export function activate(context: vscode.ExtensionContext) {
  const store = new MetadataStore(context)

  context.subscriptions.push(
    // Create the command to open the webview
    vscode.commands.registerCommand("extension.openWebview", () => {
      // Get the active editor
      const activeEditor = vscode.window.activeTextEditor;

      // Check if there is an active editor
      if (!activeEditor) {
        vscode.window.showErrorMessage("No active editor found");
        return;
      }

      const protocolReaderWriter = new ProtocolReaderWriter(store, activeEditor.document.fileName)
      let occurrences = protocolReaderWriter.getOccurrences(activeEditor.document.fileName)

      if (occurrences.length === 0) {
        vscode.window.showErrorMessage("No swarm protocol found");
        return
      }

      // Text file could have changed since last time meta was written.
      // Synch metadata to avoid drawing states that have been renamed.
      // Then update metadata in occurrence.
      store.synchronizeStore(activeEditor.document.fileName, occurrences)
      occurrences = protocolReaderWriter.getOccurrences(activeEditor.document.fileName, { updateMeta: true})

      // Create the webview panel
      let panel = vscode.window.createWebviewPanel(
        "webview",
        "Visual Swarm Protocol",
        vscode.ViewColumn.One,
        {
          enableScripts: true, // Enable JavaScript in the webview to allow for React
          localResourceRoots: [
            vscode.Uri.file(path.join(context.extensionPath, "dist")),
          ],
          retainContextWhenHidden: true, // Retain the webview content when it is hidden
        }
      );

      // Serve the bundled React app in the webview
      const reactAppUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, "dist", "bundle.js")
      );

      // Get the html content for the webview
      panel.webview.html = getReactAppHtml(reactAppUri);

      // Send the occurrences to the webview
      panel.webview.postMessage({
        command: "buildProtocol",
        data: occurrences,
      });

      // Get messages from child component
      panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === "changeProtocol") {
          // Only save if protocol is well-formed. Await answer from error check.
          let wellFormedness =  await errorChecks(message.data.swarmProtocol);
          if (wellFormedness.name === "highlightEdges") {
            panel.webview.postMessage({
              command: "highlightEdges",
              data: {
                protocol: JSON5.stringify(message.data.swarmProtocol),
                transitions: wellFormedness.transitions,
              },
            });
          } else if (wellFormedness.name === "highlightNodes") {
            panel.webview.postMessage({
              command: "highlightNodes",
              data: {
                protocol: JSON5.stringify(message.data.swarmProtocol),
                nodes: wellFormedness.nodes,
              },
            });
          } else if (wellFormedness.name === "OK") {
            // Editor might have been closed or tabbed away from, so make sure it's visible
            const editor = await vscode.window.showTextDocument(
              activeEditor.document.uri
            );
            console.log(message)
            const updatedProtocol = { initial: message.data.swarmProtocol.initial, transitions: message.data.swarmProtocol.transitions }
            // Replace text in the active editor with the new data
            editor
              .edit((editBuilder) => {
                editBuilder.replace(
                  new vscode.Range(
                    activeEditor.document.positionAt(0),
                    activeEditor.document.positionAt(activeEditor.document.getText().length)
                  ),
                  protocolReaderWriter.writeOccurrence(activeEditor.document.fileName, message.data.name)//JSON.stringify(updatedProtocol)
                );
              })
              // Wait until the editor has been updated
              .then(() => {
                // Get the updated occurrences
                occurrences = protocolReaderWriter.getOccurrences(editor.document.fileName, {reload: true, updateMeta: true} )
                /* occurrencesAndAsts = getProtocolOccurrences(
                  editor.document.fileName,
                  store
                ); */

                // Open the webview again with the new data
                panel.webview.postMessage({
                  command: "buildProtocol",
                  data: occurrences,
                });

                // Make sure the panel is visible again
                panel.reveal();
              }, (reason) => vscode.window.showErrorMessage(`Error updating file: ${reason}`)
              );
            // await??
            store.setSwarmProtocolMetaData(activeEditor.document.fileName, message.data.name, message.data.swarmProtocol.metadata)
          }
        } else if (message === "noEdgeLabel") {
          vscode.window.showErrorMessage("All transitions must have a label");
        } else if (message === "noCommand") {
          vscode.window.showErrorMessage("All transitions must have a command");
        } else if (message === "noRole") {
          vscode.window.showErrorMessage("All transitions must have a role");
        } else if (message === "noNodeLabel") {
          vscode.window.showErrorMessage("All states must have a label");
        } else if (message === "edgeExists") {
          vscode.window.showWarningMessage(
            "Multiple edges cannot exist between the same states"
          );
        }
      });
    })
  );
}

// Method to check if the protocol is well-formed and show messages to the user
async function errorChecks(swarmProtocol: SwarmProtocol): Promise<WellFormednessCheck> {
  if (!hasInitial(swarmProtocol)) {
    vscode.window.showErrorMessage("No initial state found");
    return {
      name: "error",
      transitions: [],
      nodes: [],
    };
  }

  // Check if the protocol is well-formed
  let swarmCheck: { check: WellFormednessCheck; detail: string } =
    checkWellFormedness(swarmProtocol);

  if (swarmCheck.check.name !== "OK") {
    vscode.window.showErrorMessage("NOT WELL-FORMED", {
      modal: true,
      detail: swarmCheck.detail,
    });
    return swarmCheck.check;
  }

  // Check for duplicated edges and unconnected nodes
  let duplicatedEdges = checkDuplicatedEdgeLabels(swarmProtocol);
  let unconnectedNodes = checkUnconnectedNodes(swarmProtocol);
  let val = {
    name: "OK",
    transitions: [],
    nodes: [],
  };

  // Return appropriate message to the user
  if (duplicatedEdges.length > 0) {
    val = await vscode.window
      .showErrorMessage(
        "DUPLICATED LABELS",
        {
          modal: true,
          detail:
            "Protocol has duplicated transitions. Affected transitions are highlighted in the visual editor.",
        },
        { title: "Save anyway" }
      )
      .then((value) => {
        if (!value) {
          return {
            name: "highlightEdges",
            transitions: duplicatedEdges,
            nodes: [],
          };
        } else {
          return val;
        }
      });

    if (val.name !== "OK") {
      return val;
    }
  }

  if (unconnectedNodes.length > 0) {
    val = await vscode.window
      .showErrorMessage(
        "UNCONNECTED STATES",
        {
          modal: true,
          detail:
            "Protocol has unconnected states. Affected states are highlighted in the visual editor.",
        },
        { title: "Save anyway" }
      )
      .then((value) => {
        if (!value) {
          return {
            name: "highlightNodes",
            transitions: [],
            nodes: unconnectedNodes,
          };
        } else {
          return val;
        }
      });

    if (val.name !== "OK") {
      return val;
    }
  }

  vscode.window.showInformationMessage(swarmCheck.detail);
  return {
    name: "OK",
    transitions: [],
    nodes: [],
  };
}

/* function getProtocolOccurrences(protocolReaderWriter: ProtocolReaderWriter, fileName: string): Occurrence[] {
  protocolReaderWriter.parseProtocols(fileName)
  const occurrences = protocolReaderWriter.getOccurrences(fileName)

  if (occurrences.length === 0) {
    vscode.window.showErrorMessage("No swarm protocol found");
  }

  return occurrences
} */

/* function getProtocolOccurrences(fileName: string, store: MetadataStore): OccurrenceAndAST[] {
  const occurrencesOption = parseProtocols(fileName)
  if (occurrencesOption.length === 0) {
    vscode.window.showErrorMessage("No swarm protocol found");
  }

  if (!occurrencesOption.every(o => isSome(o))) {
    vscode.window.showErrorMessage("Error parsing swarm protocols");
    return []
  }
  return occurrencesOption
    .map(someOccurrenceAndAst => getValue(someOccurrenceAndAst))
    .map(occurrenceAndAst => {
      return {
        ...occurrenceAndAst,
        occurrence: {
          ...occurrenceAndAst.occurrence,
          swarmProtocol: {
            ...occurrenceAndAst.occurrence.swarmProtocol,
            metadata: store.getSwarmProtocolMetaData(fileName, occurrenceAndAst.occurrence.name)
          }
        }
      }
    })
}

function updateOccurrenceMeta(fileName: string, store: MetadataStore, occurrencesAndAsts: OccurrenceAndAST[]): OccurrenceAndAST[] {
  return occurrencesAndAsts
    .map(occurrenceAndAst => {
      return {
        ...occurrenceAndAst,
        occurrence: {
          ...occurrenceAndAst.occurrence,
          swarmProtocol: {
            ...occurrenceAndAst.occurrence.swarmProtocol,
            metadata: store.getSwarmProtocolMetaData(fileName, occurrenceAndAst.occurrence.name)
          }
        }
      }
    })
} */

function getReactAppHtml(scriptUri: vscode.Uri): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Visual Swarm Protocol Editing</title>
    </head>
    <body>
        <div id="root"></div>
        <script src="${scriptUri}"></script>
    </body>
    </html>
    `;
}
