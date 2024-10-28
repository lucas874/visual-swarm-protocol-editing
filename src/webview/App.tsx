import React, { useEffect, useState } from "react";
import Flow from "./Flow";
import JSON5 from "json5";
import SelfConnecting from "./custom-edges/SelfConnectingEdge";
import { MarkerType } from "@xyflow/react";
import { SwarmProtocol, Transition, InitialNode } from "./types";

const edgesTypes = {
  selfconnecting: SelfConnecting,
};

const App: React.FC = () => {
  // Set the initial state of nodes and edges, to ensure rerendering after values are set
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [occurrences, setOccurrences] = useState<any[]>([]);

  useEffect(() => {
    // Listen for messages from the VS Code extension
    window.addEventListener("message", (event) => {
      const message = event.data;
      setOccurrences(parseObjects(message.data));

      if (message.command === "fileData") {
        // For the first render, not ensured to know occurrences, so message.data is used
        const protocol = JSON5.parse(message.data[0].jsonObject);

        // Create edges for the flowchart with the first occurence
        setEdges(createEdges(protocol.transitions));

        // Create nodes for the flowchart with the first occurence
        setNodes(createNodes(protocol.initial, protocol.transitions));
      }
    });

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
    setNodes(createNodes(occurrence.json.initial, occurrence.json.transitions));

    // Set edges to correspond to the selected protocol
    setEdges(createEdges(occurrence.json.transitions));
  };

  return (
    <div>
      {/* Select element for choosing the protocol, only if there are multiple occurrences */}
      {occurrences.length > 1 && (
        <select onChange={handleSelect}>
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
        edgesTypes={edgesTypes}
        sendDataToParent={handleChangesFromFlow}
      />
    </div>
  );
};

function handleChangesFromFlow(changedNodes, changedEdges) {
  // Transform changes to transitions
  let newTransitions = changedEdges.map((edge) => {
    return {
      source: edge.source,
      target: edge.target,
      label: {
        cmd: edge.label?.split("@")[0],
        role: edge.label?.split("@")[1],
      },
    };
  });

  // Change swarm protocol to correspond to the changes
  const protocol: SwarmProtocol = {
    initial: {
      // TODO: Change to the correct initial node
      name: changedNodes[0].id,
    },
    transitions: newTransitions,
  };

  console.log("new protocol: ", protocol);
}

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
        markerEnd: { type: MarkerType.Arrow },
      };
    } else {
      return {
        id: `${transition.source}-${transition.target}`,
        source: transition.source,
        target: transition.target,
        label: transition.label.cmd + "@" + transition.label.role,
        markerEnd: { type: MarkerType.Arrow },
      };
    }
  });

  return edges;
}

function createNodes(
  initialNode: InitialNode,
  transitions: Transition[]
): any[] {
  const nodeNames = new Set<string>();

  // Find all unique nodes from transitions
  transitions.forEach((element) => {
    if (!nodeNames.has(element.source)) {
      nodeNames.add(element.source);
    }

    if (!nodeNames.has(element.target)) {
      nodeNames.add(element.target);
    }
  });

  // Create nodes that correspond to ReactFlow
  const nodes = Array.from(nodeNames).map((nodeName) => {
    if (nodeName === initialNode.toString()) {
      // Initial node only has an input type
      return {
        id: nodeName,
        data: { label: nodeName },
        position: { x: 0, y: 0 },
        type: "input",
      };
    } else {
      // All other nodes have a default type
      return {
        id: nodeName,
        data: { label: nodeName },
        position: { x: 0, y: 0 },
        type: "default",
      };
    }
  });

  return nodes;
}

export default App;
