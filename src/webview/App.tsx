import React, { useEffect, useState } from "react";
import TestFlow from "./TestFlow";

const App: React.FC = () => {
  const [fileContent, setFileContent] = useState<string>("");

  console.log("App component rendered");

  useEffect(() => {
    // Listen for messages from the VS Code extension
    window.addEventListener("message", (event) => {
      const message = event.data;

      if (message.command === "fileData") {
        // Update the state with the file content
        setFileContent(message.data);
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
      <TestFlow />
      <h1>File Content:</h1>
      <pre>{fileContent}</pre>
    </div>
  );
};

export default App;
