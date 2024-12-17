import * as vscode from "vscode";
import JSON5 from "json5";
import path from "path";
import { checkSwarmProtocol, SwarmProtocolType } from "@actyx/machine-check";
import { SwarmProtocol, Transition } from "./webview/types";

interface wellFormednessCheck {
  name: string;
  transitions: Transition[];
  nodes: string[];
}

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

      let occurrences = getAllProtocolOccurrences(text, typeRegex);
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
          // Only save if protocol is well-formed
          let wellFormedness = checkWellFormedness(message.data.protocol);
          console.log(wellFormedness);
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
          vscode.window.showErrorMessage("All edges must have a label");
        } else if (message === "edgeLabelWrongFormat") {
          vscode.window.showErrorMessage(
            "The edge label must be in the format 'command@role'"
          );
        } else if (message === "noCommand") {
          vscode.window.showErrorMessage("All edges must have a command");
        } else if (message === "noRole") {
          vscode.window.showErrorMessage("All edges must have a role");
        }
      });
    })
  );
}

// Method to check if the protocol is well-formed and show messages to the user
function checkWellFormedness(protocol: string): wellFormednessCheck {
  // Parse the protocol
  let protocolObject = JSON5.parse(protocol);

  // Transform custom type to SwarmProtocolType
  let swarmProtocol: SwarmProtocolType = {
    initial: protocolObject.initial.name,
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

  // Check for duplicated edges
  let duplicatedEdges = checkDuplicatedEdgeLabels(protocolObject);
  if (duplicatedEdges.length > 0) {
    vscode.window.showErrorMessage("DUPLICATED LABELS", {
      modal: true,
      detail:
        "Protocol has duplicated edges. Affected edges are highlighted in the visual editor.",
    });
    return {
      name: "highlightEdges",
      transitions: duplicatedEdges,
      nodes: [],
    };
  }

  let unconnectedNodes = checkUnconnectedNodes(protocolObject);
  if (unconnectedNodes.length > 0) {
    vscode.window.showErrorMessage("UNCONNECTED STATES", {
      modal: true,
      detail:
        "Protocol has unconnected states. Affected nodes are highlighted in the visual editor.",
    });
    return {
      name: "highlightNodes",
      transitions: [],
      nodes: unconnectedNodes,
    };
  }
  // Check if the protocol is well-formed
  try {
    const message = checkSwarmProtocol(
      swarmProtocol,
      protocolObject.subscriptions
    );

    if (message.type === "OK") {
      vscode.window.showInformationMessage("Protocol is well-formed");
      return {
        name: "OK",
        transitions: [],
        nodes: [],
      };
    } else if (message.type === "ERROR") {
      let emptyLogType = [];
      for (let error of message.errors) {
        if (error.includes("guard event type")) {
          const logType = error.split(" ")[3];

          vscode.window.showErrorMessage("NOT WELL-FORMED", {
            modal: true,
            detail: `Protocol has multiple transitions with the log type \"${logType}\". Affected edges are highlighted in the visual editor.`,
          });
          return {
            name: "hightlightEdges",
            transitions: findMultipleGuardEvents(logType, protocolObject),
            nodes: [],
          };
        } else if (error.includes("active role does not subscribe")) {
          let transition = error.split(" ")[14];
          let role = transition.split("@")[1].split("<")[0];

          vscode.window.showErrorMessage("NOT WELL-FORMED", {
            modal: true,
            detail: `Active role (${role}) does not subscribe to guard event. Affected edges are highlighted in the visual editor.`,
          });
          return {
            name: "highlightEdges",
            transitions: findRoleTransition(transition, protocolObject),
            nodes: [],
          };
        } else if (error.includes("subsequently involved role")) {
          let transition = error.split(" ")[11];
          let role = transition.split("@")[1].split("<")[0];

          vscode.window.showErrorMessage("NOT WELL-FORMED", {
            modal: true,
            detail: `Subsequently involved role (${role}) does not subscribe to a guard event. Affected edges are highlighted in the visual editor.`,
          });
          return {
            name: "highlightEdges",
            transitions: findRoleTransition(transition, protocolObject),
            nodes: [],
          };
        } else if (error.includes("log type must not be empty")) {
          let transition = error.split(" ")[6];
          emptyLogType.push(findRoleTransition(transition, protocolObject)[0]);
        } else {
          vscode.window.showErrorMessage(error);
        }
      }

      if (emptyLogType.length > 0) {
        vscode.window.showErrorMessage("NOT WELL-FORMED", {
          modal: true,
          detail: `Some edges have an empty log type. Affected edges are highlighted in the visual editor.`,
        });
        return {
          name: "highlightEdges",
          transitions: emptyLogType,
          nodes: [],
        };
      }
    } else {
      vscode.window.showInformationMessage("Protocol is well-formed");
    }
  } catch (error) {
    // If no subscriptions are defined, show a warning message, but save protocol
    if (
      protocolObject.subscriptions === undefined ||
      protocolObject.subscriptions.length === 0
    ) {
      vscode.window.showWarningMessage(
        "Well-formedness not checked. Protocol must have subscriptions to perform check."
      );
      return {
        name: "OK",
        transitions: [],
        nodes: [],
      };
    }

    // In all other cases, show the error message
    vscode.window.showErrorMessage(error.message);
    return {
      name: "error",
      transitions: [],
      nodes: [],
    };
  }
}

function checkUnconnectedNodes(protocol: SwarmProtocol): string[] {
  let unconnectedNodes = [];
  protocol.layout.nodes.map((node) => {
    if (
      !protocol.transitions.some(
        (transition) =>
          transition.source === node.name || transition.target === node.name
      )
    ) {
      unconnectedNodes.push(node.name);
    }
  });

  return unconnectedNodes;
}

function checkDuplicatedEdgeLabels(protocol: SwarmProtocol): Transition[] {
  // Create a list of unique edges
  let uniqueLabels: string[] = [];
  let duplicatedLabels: string[] = [];
  let duplicatedEdges: Transition[] = [];

  // Check for duplicated edges
  for (let transition of protocol.transitions) {
    let label = transition.label.cmd + "@" + transition.label.role;
    if (!uniqueLabels.includes(label)) {
      uniqueLabels.push(label);
    } else {
      // Check if the duplicated label was already found
      if (!duplicatedLabels.includes(label)) {
        duplicatedLabels.push(label);
        // Add all transitions with the same label to the duplicatedEdges array
        protocol.transitions.map((t) => {
          if (t.label.cmd + "@" + t.label.role === label) {
            duplicatedEdges.push(t);
          }
        });
      }
    }
  }

  // If the length of the edges array is not equal to the size of the set, there are duplicates
  return duplicatedEdges;
}

function findMultipleGuardEvents(
  logType: string,
  protocol: SwarmProtocol
): Transition[] {
  let guardEvents = protocol.transitions.filter((transition) =>
    transition.label.logType.includes(logType)
  );

  return guardEvents;
}

function findRoleTransition(
  transition: string,
  protocol: SwarmProtocol
): Transition[] {
  let split = transition.split("--");
  let source = split[0].slice(1, -1);
  let target = split[2].slice(2, -1);

  let RoleTransition = protocol.transitions.find(
    (transition) => transition.source === source && transition.target === target
  );

  return [RoleTransition];
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
