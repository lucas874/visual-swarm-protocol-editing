import * as vscode from "vscode";
import * as fs from "fs";
import path from "path";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    // Create the command to open the webview
    vscode.commands.registerCommand("extension.openWebview", () => {
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
        }
      );

      const typeSubstring = "SwarmProtocolType";

      // Serve the bundled React app in the webview
      const reactAppUri = panel.webview.asWebviewUri(
        vscode.Uri.joinPath(context.extensionUri, "dist", "bundle.js")
      );

      // Get the html content for the webview
      panel.webview.html = getReactAppHtml(reactAppUri, panel);

      // Get the active editor
      const activeEditor = vscode.window.activeTextEditor;

      if (!activeEditor) {
        vscode.window.showErrorMessage("No active editor found");
        return;
      } else {
        // Path to active editor file
        var filePath = activeEditor.document.uri;

        // Check if anything is selected in the file
        var selection = activeEditor.selection;
      }

      // Save text from active editor to a variable
      const text = activeEditor.document.getText();

      if (selection.isEmpty) {
        // Read file and send data to React frontend
        // fs.readFile(filePath.fsPath, "utf8", (err, data) => {
        //   if (err) {
        //     vscode.window.showErrorMessage("Error reading file");
        //   } else {
        //     panel.webview.postMessage({ command: "fileData", data });
        //   }
        // });

        // Check if the file contains a swarm protocol
        if (text.includes(typeSubstring)) {
          // Get index of the second occurence (first occurence is import)
          const index = text.indexOf(
            typeSubstring,
            text.indexOf(typeSubstring) + 1
          );

          // Get the JSON object from the file
          const jsonObject = getNestedJSONObject(text, index);

          console.log(jsonObject);

          panel.webview.postMessage({
            command: "fileData",
            data: "Indeholder SWARM",
          });
        }
      } else {
        // Send selected text to React frontend
        const selectedText = activeEditor.document.getText(selection);
        panel.webview.postMessage({ command: "selectedText", selectedText });
      }

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
  // With help from copilot
  // Get the index of the opening curly brace
  const openingCurlyBraceIndex = text.indexOf("{", index);
  let closingCurlyBraceIndex = index;
  let nextOpeningCurlyBraceIndex = openingCurlyBraceIndex;

  let counter = 1;

  while (counter != 0) {
    // Get index of the next opening curly brace
    let previousOpeningCurlyBraceIndex = nextOpeningCurlyBraceIndex;

    // Find next opening curly brace after the previous opening curly brace
    nextOpeningCurlyBraceIndex = text.indexOf(
      "{",
      nextOpeningCurlyBraceIndex + 1
    );

    // Save previous closing curly brace index
    let previousClosingCurlyBraceIndex = closingCurlyBraceIndex;

    // Get the index of the closing curly brace
    closingCurlyBraceIndex = text.indexOf("}", closingCurlyBraceIndex + 1);

    if (nextOpeningCurlyBraceIndex < closingCurlyBraceIndex) {
      // If opening curlyBrace is before the closing curlyBrace, increment counter and save as next opening curlyBrace
      counter++;
      closingCurlyBraceIndex = previousClosingCurlyBraceIndex;
    } else {
      // If closing curlyBrace is before the opening curlyBrace, decrement counter and don't increment next opening curlyBrace
      counter--;
      nextOpeningCurlyBraceIndex = previousOpeningCurlyBraceIndex;
    }
  }

  // Get the JSON object from the file
  const jsonObject = text.substring(
    openingCurlyBraceIndex,
    closingCurlyBraceIndex + 1
  );

  return jsonObject;
}

function getReactAppHtml(
  scriptUri: vscode.Uri,
  panel: vscode.WebviewPanel
): string {
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
