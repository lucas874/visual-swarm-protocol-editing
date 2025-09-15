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
import { getValue, isSome, parseProtocols, Some } from "./parse-protocols";
import { Occurrence } from "./types";
type SwarmProtocolOccurrence = { name: string, jsonObject: string }

export function activate(context: vscode.ExtensionContext) {
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

      // Save text from active editor to a variable
      const text = activeEditor.document.getText();
      // Set regex string to search for the SwarmProtocolType
      const typeRegex = /\S*:\s*SwarmProtocolType\s*=\s*/gm;

      let occurrences = getProtocolOccurrences(activeEditor.document.fileName)
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
          let wellFormedness = await errorChecks(message.data.protocol);
          if (wellFormedness.name === "highlightEdges") {
            panel.webview.postMessage({
              command: "highlightEdges",
              data: {
                protocol: JSON5.stringify(message.data.protocol),
                transitions: wellFormedness.transitions,
              },
            });
          } else if (wellFormedness.name === "highlightNodes") {
            panel.webview.postMessage({
              command: "highlightNodes",
              data: {
                protocol: JSON5.stringify(message.data.protocol),
                nodes: wellFormedness.nodes,
              },
            });
          } else if (wellFormedness.name === "OK") {
            // Editor might have been closed or tabbed away from, so make sure it's visible
            const editor = await vscode.window.showTextDocument(
              activeEditor.document.uri
            );

            // Create list of all SwarmProtocolType occurrences
            let helperArray;

            // Inspiration from: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec
            // Find all occurrences of the SwarmProtocolType
            while (
              (helperArray = typeRegex.exec(editor.document.getText())) !== null
            ) {
              // Find the name of the protocol
              const occurrenceName = helperArray[0].substring(
                0,
                helperArray[0].indexOf(":")
              );

              // Find the correct occurrence based on the data from the child component
              if (occurrenceName === message.data.name) {
                console.log(message)
                console.log()
                // Replace text in the active editor with the new data
                editor
                  .edit((editBuilder) => {
                    editBuilder.replace(
                      new vscode.Range(
                        activeEditor.document.positionAt(typeRegex.lastIndex),
                        activeEditor.document.positionAt(
                          getLastIndex(
                            editor.document.getText(),
                            typeRegex.lastIndex
                          )
                        )
                      ),
                      `${message.data.protocol}`
                    );
                  })
                  // Wait until the editor has been updated
                  .then(() => {
                    // Get the updated occurrences
                    occurrences = getAllProtocolOccurrences(
                      editor.document.getText(),
                      typeRegex
                    );

                    // Open the webview again with the new data
                    panel.webview.postMessage({
                      command: "buildProtocol",
                      data: occurrences,
                    });

                    // Make sure the panel is visible again
                    panel.reveal();
                  });
              }
            }
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
async function errorChecks(protocol: string): Promise<WellFormednessCheck> {
  // Parse the protocol
  let protocolObject = JSON5.parse(protocol);

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

function getAllProtocolOccurrences(text: string, typeRegex: RegExp): any[] {
  let occurrences = [];

  // Check if the file contains a swarm protocol
  if (text.includes("SwarmProtocolType")) {
    // Create list of all SwarmProtocolType occurrences
    let helperArray;

    // Inspiration from: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec
    // Find all occurrences of the SwarmProtocolType
    while ((helperArray = typeRegex.exec(text)) !== null) {
      // Find the name of the protocol
      const occurrenceName = helperArray[0].substring(
        0,
        helperArray[0].indexOf(":")
      );

      let jsonObject = getNestedJSONObject(text, typeRegex.lastIndex);

      if (jsonObject === "") {
        // End the process if there are errors
        return;
      } else {
        // Put the occurrence in the occurrences array along with the json code.
        occurrences.push({
          name: occurrenceName,
          jsonObject: jsonObject,
        });
      }
    }

    return occurrences;
  } else {
    vscode.window.showErrorMessage("No swarm protocol found");
    return [];
  }
}

function getProtocolOccurrences(fileName: string): Occurrence[] {
  const occurrences = parseProtocols(fileName)
  if (occurrences.length === 0) {
    vscode.window.showErrorMessage("No swarm protocol found");
  }

  if (!occurrences.every(o => isSome(o))) {
    vscode.window.showErrorMessage("Error parsing swarm protocols");
    return []
  }

  return occurrences.map(someOccurrence => getValue(someOccurrence))
}



function getNestedJSONObject(text: string, index: number) {
  // Get the index of the opening curly brace
  let openingCurlyBraceIndex = text.indexOf("{", index);
  let closingCurlyBraceIndex = getLastIndex(text, index);

  // Get the JSON object from the file
  const jsonObject = text.substring(
    openingCurlyBraceIndex,
    closingCurlyBraceIndex
  );

  try {
    JSON5.parse(jsonObject);
  } catch (error) {
    vscode.window.showErrorMessage(
      "The JSON object is not valid. Please check the syntax"
    );
    return "";
  }

  return jsonObject;
}

function getLastIndex(text: string, index: number): number {
  // Get the index of the opening curly brace
  let closingCurlyBraceIndex;

  let counter = 0;

  do {
    const openIndex = text.indexOf("{", index);
    const closingIndex = text.indexOf("}", index);

    // Ensure that last curly brace can be found
    if (closingIndex === -1) {
      vscode.window.showErrorMessage(
        "Cannot find the last closing curly brace"
      );
      return -1;
    }

    // Check if the opening curly brace is before the closing curly brace
    if (openIndex < closingIndex && openIndex !== -1) {
      index = openIndex + 1;
      counter++;
    } else {
      index = closingIndex + 1;
      closingCurlyBraceIndex = closingIndex;
      counter--;
    }
  } while (counter !== 0);

  return closingCurlyBraceIndex + 1;
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
