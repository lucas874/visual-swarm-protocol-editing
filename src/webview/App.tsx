import React, { useEffect, useState } from "react";
import Flow from "./TestFlow";

const App: React.FC = () => {
  const [fileContent, setFileContent] = useState<string>("");
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  useEffect(() => {
    // Listen for messages from the VS Code extension
    window.addEventListener("message", (event) => {
      const message = event.data;

      if (message.command === "fileData") {
        // Update the state with the file content
        setFileContent(message.data);

        // Convert message string to JSON object
        // Replace all ' with "
        const jsonStringWithDoubleQuotes = message.data.replace(/'/g, '"');

        // Give "" to all keys
        const jsonStringWithQuotes = jsonStringWithDoubleQuotes.replace(
          /(\w+):/g,
          '"$1":'
        );

        // Stringify the JSON object
        const jsonString = JSON.stringify(jsonStringWithQuotes, null, 2);

        // Transform the file content to JSON object
        const jsonObject = JSON.parse(jsonString);

        // Create nodes and edges from JSON object
        setNodes(jsonToNodes(jsonObject));
        setEdges(jsonToEdges(jsonObject));
      } else if (message.command === "selectedText") {
        // Update the state with the selected text
        setFileContent(message.selectedText);
      }
    });

    return () => {
      window.removeEventListener("message", () => {});
    };
  }, []);

  return (
    <div>
      <Flow />
      <h1>File Content:</h1>
      <pre>{fileContent}</pre>
    </div>
  );
};

function jsonToNodes(jsonObject): any[] {
  return [];
}

function jsonToEdges(jsonObject): any[] {
  return [];
}

export default App;
