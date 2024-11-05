import * as vscode from "vscode";
import JSON5 from "json5";
import path from "path";

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
      const occurrences = [];

      // Check if the file contains a swarm protocol
      if (text.includes("SwarmProtocolType")) {
        // Create list of all SwarmProtocolType occurences
        let helperArray;

        // Inspiration from: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec
        // Find all occurences of the SwarmProtocolType
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
            // Put the occurence in the occurences array along with the json code.
            occurrences.push({
              name: occurrenceName,
              jsonObject: jsonObject,
            });
          }
        }
      } else {
        vscode.window.showErrorMessage("No swarm protocol found");
        return;
      }

      // Create the webview panel
      const panel = vscode.window.createWebviewPanel(
        "myWebview",
        "Actyx Swarm Protocol",
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

      // Send the occurences to the webview
      panel.webview.postMessage({
        command: "buildProtocol",
        data: occurrences,
      });

      // Get messages from child component
      panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === "changeProtocol") {
          // Create list of all SwarmProtocolType occurences
          let helperArray;

          // Inspiration from: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec
          // Find all occurences of the SwarmProtocolType
          while ((helperArray = typeRegex.exec(text)) !== null) {
            // Find the name of the protocol
            const occurrenceName = helperArray[0].substring(
              0,
              helperArray[0].indexOf(":")
            );

            // Find the correct occurence based on the data from the child component
            if (occurrenceName === message.data.name) {
              // Editor might have been closed or tabbed away from, so make sure it's visible
              const editor = await vscode.window.showTextDocument(
                activeEditor.document.uri
              );

              // Replace text in the active editor with the new data
              editor.edit((editBuilder) => {
                editBuilder.replace(
                  new vscode.Range(
                    activeEditor.document.positionAt(typeRegex.lastIndex),
                    activeEditor.document.positionAt(
                      getLastIndex(text, typeRegex.lastIndex)
                    )
                  ),
                  `${message.data.protocol}`
                );
              });
            }
          }
        } else if (message === "noEdgeLabel") {
          vscode.window.showErrorMessage("All edges must have a label");
        }
      });
    })
  );
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

function getNestedJSONObject(text: string, index: number) {
  // Get the index of the opening curly brace
  let openingCurlyBraceIndex = text.indexOf("{", index);
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
      return "";
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

  // Get the JSON object from the file
  const jsonObject = text.substring(
    openingCurlyBraceIndex,
    closingCurlyBraceIndex + 1
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

function getReactAppHtml(scriptUri: vscode.Uri): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>React App</title>
    </head>
    <body>
        <div id="root"></div>
        <script src="${scriptUri}"></script>
    </body>
    </html>
    `;
}
