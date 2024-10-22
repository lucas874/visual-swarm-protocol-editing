import React, { useEffect, useState } from "react";
import Flow from "./TestFlow";
import JSON5 from "json5";
import SelfConnecting from "./custom-edges/SelfConnectingEdge";
import { MarkerType } from "@xyflow/react";

// Define types of nodes and transitions for protocols
type InitialNode = {
  name: string;
};

type Transition = {
  source: string;
  target: string;
  label: TransitionLabel;
};

type TransitionLabel = {
  cmd: string;
  logType: string[];
  role: string;
};

interface SwarmProtocol {
  initial: InitialNode;
  transitions: Transition[];
}

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
      <select onChange={handleSelect}>
        {occurrences.map((occurence) => (
          <option value={occurence.name} key={occurence.name}>
            {occurence.name}
          </option>
        ))}
      </select>
      <Flow nodes={nodes} edges={edges} edgesTypes={edgesTypes} />
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
