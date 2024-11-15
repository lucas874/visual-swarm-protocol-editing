import React, { useEffect, useState } from "react";
import Flow from "./Flow";
import JSON5 from "json5";
import SelfConnecting from "./custom-elements/SelfConnectingEdge";
import { MarkerType } from "@xyflow/react";
import { LayoutType, SwarmProtocol, Transition } from "./types";

// Declare the vscode object to be able to communicate with the extension
const vscode = acquireVsCodeApi();

const edgesTypes = {
  selfconnecting: SelfConnecting,
};

const App: React.FC = () => {
  // Set the initial state of nodes and edges, to ensure rerendering after values are set
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [selectedProtocol, setSelectedProtocol] = useState<string>("");
  const [protocol, setProtocol] = useState<SwarmProtocol>();

  useEffect(() => {
    // Listen for messages from the VS Code extension
    window.addEventListener("message", (event) => {
      const message = event.data;
      setOccurrences(parseObjects(message.data));

      if (message.command === "buildProtocol") {
        // For the first render, not ensured to know occurrences, so message.data is used
        let tempProtocol = JSON5.parse(message.data[0].jsonObject);

        // Save protocol to state
        setProtocol(JSON5.parse(message.data[0].jsonObject));

        // Create edges for the flowchart with the first occurence
        setEdges(createEdges(tempProtocol.transitions));

        // Create nodes for the flowchart with the first occurence
        setNodes(createNodes(tempProtocol));

        // Set the selected protocol to the first occurence
        setSelectedProtocol(message.data[0].name);
      }
    });

    // TODO: Research if this is why the flowchart is not rendered after changes
    return () => {
      window.removeEventListener("message", () => {});
    };
  }, []);

  // For selection of protocol
  const handleSelect = (e: any) => {
    // Find the occurence that corresponds to the selected protocol
    let occurrence = occurrences.find(
      (occurrence) => occurrence.name === e.target.value
    );

    // Set nodes to correspond to the selected protocol
    setNodes(createNodes(occurrence.json));

    // Set edges to correspond to the selected protocol
    setEdges(createEdges(occurrence.json.transitions));

    // Set the protocol to the selected occurence
    setProtocol(occurrence.json);

    // Set the selected protocol to the selected occurence
    setSelectedProtocol(e.target.value);
  };

  // Pass data back to extension
  function handleChangesFromFlow(changedNodes, changedEdges) {
    // Transform changes to transitions
    let newTransitions: Transition[] = changedEdges.map((edge) => {
      return {
        source: edge.source,
        target: edge.target,
        label: {
          cmd: edge.label?.split("@")[0],
          role: edge.label?.split("@")[1],
        },
      };
    });

    let layout: LayoutType[] = changedNodes.map((node) => {
      return {
        name: node.data.label,
        x: node.position.x,
        y: node.position.y,
      };
    });

    // Change swarm protocol to correspond to the changes
    const protocol: SwarmProtocol = {
      initial: {
        // FIXME: Change to the correct initial node
        name: changedNodes[0].id,
      },
      layout: layout,
      transitions: newTransitions,
    };

    // Send the changes to the extension
    vscode.postMessage({
      command: "changeProtocol",
      data: { name: selectedProtocol, protocol: JSON5.stringify(protocol) },
    });
  }

  return (
    <div>
      {/* Select element for choosing the protocol, only if there are multiple occurrences */}
      {occurrences.length > 1 && (
        <select className="dropdown" onChange={handleSelect}>
          {occurrences.map((occurence) => (
            <option value={occurence.name} key={occurence.name}>
              {occurence.name}
            </option>
          ))}
        </select>
      )}
      <Flow
        nodes={nodes}
        edges={edges}
        hasLayout={protocol?.layout !== undefined}
        edgesTypes={edgesTypes}
        sendDataToParent={handleChangesFromFlow}
        sendErrorToParent={(error) => vscode.postMessage(error)}
      />
    </div>
  );
};

function parseObjects(occurrences: any[]): any[] {
  let occurrences2 = [];

  // Parse the jsonObject to JSON5
  occurrences.forEach((occurrence) => {
    occurrences2.push({
      name: occurrence.name,
      json: JSON5.parse(occurrence.jsonObject),
    });
  });

  return occurrences2;
}

// Created partly using coPilot
function createEdges(transitions: Transition[]): any[] {
  // Take the values from transitions, and create edges that correspond to ReactFlow
  const edges = transitions.map((transition) => {
    if (transition.source === transition.target) {
      return {
        id: `${transition.source}-${transition.target}`,
        source: transition.source,
        target: transition.target,
        label: transition.label.cmd + "@" + transition.label.role,
        type: "selfconnecting",
        markerEnd: { type: MarkerType.ArrowClosed },
        style: {
          strokeWidth: 1.7,
        },
      };
    } else {
      return {
        id: `${transition.source}-${transition.target}`,
        source: transition.source,
        target: transition.target,
        label: transition.label.cmd + "@" + transition.label.role,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: {
          strokeWidth: 1.7,
        },
      };
    }
  });

  return edges;
}

function createNodes(protocol: SwarmProtocol): any[] {
  const nodeNames = new Set<string>();

  // Find all unique nodes from transitions
  protocol.transitions.forEach((element) => {
    if (!nodeNames.has(element.source)) {
      nodeNames.add(element.source);
    }

    if (!nodeNames.has(element.target)) {
      nodeNames.add(element.target);
    }
  });

  protocol.layout?.forEach((element) => {
    if (!nodeNames.has(element.name)) {
      nodeNames.add(element.name);
    }
  });

  // Create nodes that correspond to ReactFlow
  const nodes = Array.from(nodeNames).map((nodeName) => {
    let nodeLayout = protocol.layout?.find(
      (layout) => layout.name === nodeName
    );

    // if (nodeName === protocol.initial.toString()) {
    //   // Initial node only has an input type
    //   return {
    //     id: nodeName,
    //     data: { label: nodeName },
    //     // Add any positions or measurements if they exist
    //     position: {
    //       x: nodeLayout?.x ?? 0,
    //       y: nodeLayout?.y ?? 0,
    //     },
    //     type: "input",
    //   };
    // } else {
    //   // All other nodes have a default type
    return {
      id: nodeName,
      data: { label: nodeName },
      position: {
        x: nodeLayout?.x ?? 0,
        y: nodeLayout?.y ?? 0,
      },
      sourcePosition: "bottom",
      targetPosition: "top",
      type: "default",
    };
    // }
  });

  return nodes;
}

export default App;
