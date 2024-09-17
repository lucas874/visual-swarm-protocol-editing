import * as vscode from "vscode";
import * as fs from "fs";

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.commands.registerCommand("extension.openWebview", () => {
      const panel = vscode.window.createWebviewPanel(
        "myWebview",
        "React App",
        vscode.ViewColumn.One,
        {
          enableScripts: true, // Enable JavaScript in the webview
        }
      );

      // Serve the bundled React app in the webview
      const reactAppUri = vscode.Uri.file(
        vscode.Uri.joinPath(context.extensionUri, "dist", "bundle.js").fsPath
      );

      panel.webview.html = getReactAppHtml(reactAppUri, panel);

      // Read file and send data to React frontend
      const filePath = vscode.Uri.file("../test.txt");
      fs.readFile(filePath.fsPath, "utf8", (err, data) => {
        if (err) {
          vscode.window.showErrorMessage("Error reading file");
        } else {
          panel.webview.postMessage({ command: "fileData", data });
        }
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
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${panel.webview.cspSource}; style-src ${panel.webview.cspSource};">
    </head>
    <body>
        <div id="root"></div>
        <h1>Hello from extension!</h1>
        <script src="${scriptUri}"></script>
    </body>
    </html>
    `;
}
