import React, { useEffect, useRef, useState } from "react";
import Flow from "./Flow";
import JSON5 from "json5";
import SelfConnecting from "./custom-elements/SelfConnectingEdge";
import { MarkerType } from "@xyflow/react";
import { LayoutType, SwarmProtocol, Transition } from "../types";
import "./style.css";
import PositionableEdge from "./custom-elements/PositionableEdge";
import DownloadButton from "./custom-elements/DownloadButton";
import SubscriptionsDialog from "./modals/SubscriptionsDialog";

// Declare the vscode object to be able to communicate with the extension
const vscode = acquireVsCodeApi();

const edgesTypes = {
  selfconnecting: SelfConnecting,
  positionable: PositionableEdge,
};

const App: React.FC = () => {
  // Set the initial state of nodes and edges, to ensure rerendering after values are set
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [occurrences, setOccurrences] = useState<any[]>([]);
  const [protocol, setProtocol] = useState<SwarmProtocol>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const subRef = useRef<Record<string, string[]>>({});
  const selectedProtocolRef = React.useRef("");

  useEffect(() => {
    // Listen for messages from the VS Code extension
    window.addEventListener("message", (event) => {
      const message = event.data;

      if (message.command === "buildProtocol") {
        setOccurrences(parseObjects(message.data));

        // Message data is used to set values, occurrences not updated this rendering
        let tempProtocol = JSON5.parse(message.data[0].jsonObject);

        // Save protocol to state
        setProtocol(tempProtocol);

        // Create edges for the flowchart with the first occurrence
        setEdges(createEdges(tempProtocol));

        // Create nodes for the flowchart with the first occurrence
        setNodes(createNodes(tempProtocol));

        // Set subscriptions
        subRef.current = tempProtocol.subscriptions;

        // Set the selected protocol to the first occurrence
        selectedProtocolRef.current = message.data[0].name;
      } else if (message.command === "highlightEdges") {
        let tempProtocol = JSON5.parse(JSON5.parse(message.data.protocol));
        setEdges(createEdges(tempProtocol, message.data.transitions));
      } else if (message.command === "highlightNodes") {
        let tempProtocol = JSON5.parse(JSON5.parse(message.data.protocol));
        setNodes(createNodes(tempProtocol, message.data.nodes));
      }
    });

    return () => {
      window.removeEventListener("message", () => {});
    };
  }, []);

  // For selection of protocol
  const handleSelect = (e: any) => {
    // Find the occurrence that corresponds to the selected protocol
    let occurrence = occurrences.find(
      (occurrence) => occurrence.name === e.target.value
    );

    // Set nodes to correspond to the selected protocol
    setNodes(createNodes(occurrence.json));

    // Set edges to correspond to the selected protocol
    setEdges(createEdges(occurrence.json));

    // Set the protocol to the selected occurrence
    setProtocol(occurrence.json);

    // Set subscriptions
    subRef.current = occurrence.json.subscriptions;

    // Set the selected protocol to the selected occurrence
    selectedProtocolRef.current = e.target.value;
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
          logType: edge.data.logType,
        },
      };
    });

    let transitionsWithHandlers = changedEdges.filter((edge) => {
      return edge.data.positionHandlers.length > 0;
    });

    let layout: LayoutType = {
      nodes: changedNodes.map((node) => {
        return {
          name: node.data.label,
          x: node.position.x,
          y: node.position.y,
        };
      }),
      edges: transitionsWithHandlers.map((edge) => {
        if (edge.data.positionHandlers.length > 0) {
          return {
            id: edge.id,
            positionHandlers: edge.data.positionHandlers,
          };
        }
      }),
    };

    // Change swarm protocol to correspond to the changes
    const protocol: SwarmProtocol = {
      initial: {
        // FIXME: Change to the correct initial node
        name: changedNodes[0].id,
      },
      layout: layout,
      subscriptions: subRef.current,
      transitions: newTransitions,
    };

    // Send the changes to the extension
    vscode.postMessage({
      command: "changeProtocol",
      data: {
        name: selectedProtocolRef.current,
        protocol: JSON5.stringify(protocol),
      },
    });
  }

  function updateSubscriptions(subs: Record<string, string[]>) {
    console.log(subs);
    subRef.current = subs;
  }

  return (
    <>
      <DownloadButton />
      <button className="button" onClick={(event) => setIsDialogOpen(true)}>
        Subscriptions
      </button>
      {/* Create a dialog to show subscriptions */}
      {isDialogOpen && (
        <SubscriptionsDialog
          setIsDialogOpen={setIsDialogOpen}
          setSubscriptions={updateSubscriptions}
          subRef={subRef.current}
        />
      )}
      {/* Select element for choosing the protocol, only if there are multiple occurrences */}
      {occurrences.length > 1 && (
        <select className="dropdown" onChange={handleSelect}>
          {occurrences.map((occurrence) => (
            <option value={occurrence.name} key={occurrence.name}>
              {occurrence.name}
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
    </>
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

function createEdges(
  protocol: SwarmProtocol,
  highlighted: Transition[] = []
): any[] {
  // Take the values from transitions, and create edges that correspond to ReactFlow
  const edges = protocol.transitions.map((transition) => {
    let highlight =
      highlighted.length > 0
        ? highlighted?.find((elem) => {
            return (
              elem.source === transition.source &&
              elem.target === transition.target
            );
          })
        : undefined;

    if (transition.source === transition.target) {
      return {
        id: `${transition.source}-${transition.target}`,
        source: transition.source,
        target: transition.target,
        label: transition.label.cmd + "@" + transition.label.role,
        data: {
          positionHandlers: [],
          logType: transition.label.logType,
        },
        type: "selfconnecting",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: highlight === undefined ? "#b1b1b6" : "red",
        },
        style: {
          strokeWidth: 1.7,
          stroke: highlight === undefined ? "#b1b1b6" : "red",
        },
      };
    } else {
      const edgeLayout = protocol.layout?.edges?.find(
        (edge) => edge.id === `${transition.source}-${transition.target}`
      );
      return {
        id: `${transition.source}-${transition.target}`,
        source: transition.source,
        target: transition.target,
        label: transition.label.cmd + "@" + transition.label.role,
        data: {
          positionHandlers: edgeLayout?.positionHandlers ?? [],
          logType: transition.label.logType,
        },
        type: "positionable",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: highlight === undefined ? "#b1b1b6" : "red",
        },
        style: {
          strokeWidth: 1.7,
          stroke: highlight === undefined ? "#b1b1b6" : "red",
        },
      };
    }
  });

  return edges;
}

function createNodes(
  protocol: SwarmProtocol,
  highlighted: string[] = []
): any[] {
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

  protocol.layout?.nodes?.forEach((element) => {
    if (!nodeNames.has(element.name)) {
      nodeNames.add(element.name);
    }
  });

  // Create nodes that correspond to ReactFlow
  const nodes = Array.from(nodeNames).map((nodeName) => {
    let nodeLayout = protocol.layout?.nodes?.find(
      (node) => node.name === nodeName
    );
    return {
      id: nodeName,
      data: { label: nodeName },
      position: {
        x: nodeLayout?.x ?? 0,
        y: nodeLayout?.y ?? 0,
      },
      style: {
        border: highlighted.includes(nodeName) ? "2px solid red" : null,
      },
      type: "default",
    };
  });

  return nodes;
}

export default App;
