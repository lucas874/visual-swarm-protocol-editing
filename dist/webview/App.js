"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importStar(require("react"));
const TestFlow_1 = __importDefault(require("./TestFlow"));
const App = () => {
    const [fileContent, setFileContent] = (0, react_1.useState)("");
    const [nodes, setNodes] = (0, react_1.useState)([]);
    const [edges, setEdges] = (0, react_1.useState)([]);
    (0, react_1.useEffect)(() => {
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
                const jsonStringWithQuotes = jsonStringWithDoubleQuotes.replace(/(\w+):/g, '"$1":');
                // Stringify the JSON object
                const jsonString = JSON.stringify(jsonStringWithQuotes, null, 2);
                // Transform the file content to JSON object
                const jsonObject = JSON.parse(jsonString);
                // Create nodes and edges from JSON object
                setNodes(jsonToNodes(jsonObject));
                setEdges(jsonToEdges(jsonObject));
            }
            else if (message.command === "selectedText") {
                // Update the state with the selected text
                setFileContent(message.selectedText);
            }
        });
        return () => {
            window.removeEventListener("message", () => { });
        };
    }, []);
    return (react_1.default.createElement("div", null,
        react_1.default.createElement(TestFlow_1.default, null),
        react_1.default.createElement("h1", null, "File Content:"),
        react_1.default.createElement("pre", null, fileContent)));
};
function jsonToNodes(jsonObject) {
    return [];
}
function jsonToEdges(jsonObject) {
    return [];
}
exports.default = App;
//# sourceMappingURL=App.js.map