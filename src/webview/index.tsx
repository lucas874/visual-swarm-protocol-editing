import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import { ReactFlowProvider } from "reactflow";
import "./index.css";

// ReactDOM.render(<App />, document.getElementById("root"));
ReactDOM.render(
    <ReactFlowProvider>
      <App />
    </ReactFlowProvider>
  document.getElementById("root")
);
