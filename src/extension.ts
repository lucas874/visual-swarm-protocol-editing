import * as vscode from "vscode";
import * as fs from "fs";
import path from "path";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.openWebview", () => {
      const panel = vscode.window.createWebviewPanel(
        "myWebview",
        "React App",
        vscode.ViewColumn.One,
        {
          enableScripts: true, // Enable JavaScript in the webview
          localResourceRoots: [
            vscode.Uri.file(path.join(context.extensionPath, "dist")),
          ],
        }
      );

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

      if (selection.isEmpty) {
        // Read file and send data to React frontend
        fs.readFile(filePath.fsPath, "utf8", (err, data) => {
          if (err) {
            vscode.window.showErrorMessage("Error reading file");
          } else {
            panel.webview.postMessage({ command: "fileData", data });
          }
        });
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
        <h1>Hello from extension!</h1>
        <script src="${scriptUri}"></script>
    </body>
    </html>
    `;
}
