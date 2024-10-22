import * as vscode from "vscode";
import path from "path";
import { get } from "http";

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
      const occurences = [];

      // Check if the file contains a swarm protocol
      if (text.includes("SwarmProtocolType")) {
        // Create list of all SwarmProtocolType occurences
        let helperArray;

        // Inspiration from: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/exec
        // Find all occurences of the SwarmProtocolType
        while ((helperArray = typeRegex.exec(text)) !== null) {
          // Find the name of the protocol
          const occurenceName = helperArray[0].substring(
            0,
            helperArray[0].indexOf(":")
          );

          // Put the occurence in the occurences array along with the json code.
          occurences.push({
            name: occurenceName,
            jsonObject: getNestedJSONObject(text, typeRegex.lastIndex),
          });
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
        command: "fileData",
        data: occurences,
      });

      // Handle messages from the webview (React frontend)
      panel.webview.onDidReceiveMessage((message) => {
        if (message.command === "log") {
          console.log(message.data);
        }
      });
    })
  );
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
