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
import { getValue, isSome, parseProtocols } from "./parse-protocols";
import { Occurrence } from "./types";
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

      let occurrences = getProtocolOccurrences(activeEditor.document.fileName, store)
      if (occurrences.length === 0) {
        return;
      }

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
          let wellFormedness = await errorChecks(message.data.swarmProtocol);
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
            // Replace text in the active editor with the new data
            editor
              .edit((editBuilder) => {
                editBuilder.replace(
                  new vscode.Range(
                    activeEditor.document.positionAt(message.data.startPos),
                    activeEditor.document.positionAt(message.data.endPos)
                  ),
                  `${{ initial: message.data.swarmProtocol.initial, transitions: message.data.swarmProtocol.transitions }}`
                );
              })
              // Wait until the editor has been updated
              .then(() => {
                // Get the updated occurrences
                occurrences = getProtocolOccurrences(
                  editor.document.getText(),
                  store
                );

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
            store.setSwarmProtocolMetaData(activeEditor.document.uri, message.data.name, message.data.metadata)
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
async function errorChecks(protocolObject: SwarmProtocolType): Promise<WellFormednessCheck> {
  // Parse the protocol
  //let protocolObject = JSON5.parse(protocol);

  // Transform custom type to SwarmProtocolType
  let swarmProtocol: SwarmProtocolType = {
    initial: protocolObject.initial,
    transitions: [],
  };

  // Add transitions to the swarm protocol
  for (let transition of protocolObject.transitions) {
    swarmProtocol.transitions.push({
      source: transition.source,
      target: transition.target,
      label: {
        cmd: transition.label.cmd,
        role: transition.label.role,
        logType: transition.label.logType ?? [],
      },
    });
  }

  if (!hasInitial(protocolObject)) {
    vscode.window.showErrorMessage("No initial state found");
    return {
      name: "error",
      transitions: [],
      nodes: [],
    };
  }

  // Check if the protocol is well-formed
  let swarmCheck: { check: WellFormednessCheck; detail: string } =
    checkWellFormedness(swarmProtocol, protocolObject);

  if (swarmCheck.check.name !== "OK") {
    vscode.window.showErrorMessage("NOT WELL-FORMED", {
      modal: true,
      detail: swarmCheck.detail,
    });
    return swarmCheck.check;
  }

  // Check for duplicated edges and unconnected nodes
  let duplicatedEdges = checkDuplicatedEdgeLabels(protocolObject);
  let unconnectedNodes = checkUnconnectedNodes(protocolObject);
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

function getProtocolOccurrences(fileName: string, store: MetadataStore): Occurrence[] {
  const occurrencesOption = parseProtocols(fileName)
  if (occurrencesOption.length === 0) {
    vscode.window.showErrorMessage("No swarm protocol found");
  }

  if (!occurrencesOption.every(o => isSome(o))) {
    vscode.window.showErrorMessage("Error parsing swarm protocols");
    return []
  }
  const occurrences = occurrencesOption
    .map(someOccurrence => getValue(someOccurrence))
    .map(occurrence => {
      return {
        ...occurrence,
        swarmProtocol: {
          ...occurrence.swarmProtocol,
          metadata: store.getSwarmProtocolMetaData(vscode.Uri.file(fileName), occurrence.name)
        }
      }
    })

  return occurrences
}

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
