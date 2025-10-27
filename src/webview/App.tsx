import React, { useEffect, useRef, useState } from "react";
import Flow from "./Flow";
import JSON5 from "json5";
import SelfConnecting from "./custom-elements/SelfConnectingEdge";
import { MarkerType } from "@xyflow/react";
import { LayoutType, MessageEventPayload, Occurrence, SwarmProtocol, Transition } from "../types";
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
  const [nodes, setNodes] = useState<string[]>([]);
  const [edges, setEdges] = useState<Transition[]>([]);
  const [occurrences, setOccurrences] = useState<Map<string, Occurrence>>(new Map());
  const [protocol, setProtocol] = useState<SwarmProtocol>();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const subRef = useRef<Record<string, string[]>>({});
  const selectedProtocolRef = React.useRef("");

  useEffect(() => {
    const buildProtocol = (event: MessageEvent<MessageEventPayload>) => {
      const message = event.data;

      if (message.command === "buildProtocol") {
        setOccurrences(new Map(message.data.map(o => [o.name, o])));

        // Message data is used to set values, occurrences not updated this rendering
        //let tempProtocol = JSON5.parse(message.data[0].jsonObject);
        let tempProtocol = message.data[0].swarmProtocol

        // Save protocol to state
        setProtocol(tempProtocol);

        // Create edges for the flowchart with the first occurrence
        setEdges(createEdges(tempProtocol));

        // Create nodes for the flowchart with the first occurrence
        setNodes(createNodes(tempProtocol));

        // Set subscriptions
        subRef.current = createSubscriptions(tempProtocol);

        // Set the selected protocol to the first occurrence
        selectedProtocolRef.current = message.data[0].name;
      } else if (message.command === "highlightEdges") {
        let tempProtocol = message.data.protocol;

        // Save protocol to state
        setProtocol(tempProtocol);

        // Create edges for the flowchart with the first occurrence
        setEdges(createEdges(tempProtocol, message.data.transitions));

        // Create nodes for the flowchart with the first occurrence
        setNodes(createNodes(tempProtocol));

        // Set subscriptions
        subRef.current = createSubscriptions(tempProtocol);
      } else if (message.command === "highlightNodes") {
        let tempProtocol = message.data.protocol;
        // Save protocol to state
        setProtocol(tempProtocol);

        // Create edges for the flowchart with the first occurrence
        setEdges(createEdges(tempProtocol));

        // Create nodes for the flowchart with the first occurrence
        setNodes(createNodes(tempProtocol, message.data.nodes));

        // Set subscriptions
        subRef.current = createSubscriptions(tempProtocol);
      }
    };

    // Listen for messages from the VS Code extension
    window.addEventListener("message", buildProtocol);

    return () => {
      window.removeEventListener("message", buildProtocol);
    };
  }, []);

  // For selection of protocol
  const handleSelect = (e: any) => {
    // Find the occurrence that corresponds to the selected protocol
    let occurrence = occurrences.get(e.target.value)
    /* let occurrence = occurrences.find(
      (occurrence) => occurrence.name === e.target.value
    ); */

    // Set nodes to correspond to the selected protocol
    setNodes(createNodes(occurrence.swarmProtocol));

    // Set edges to correspond to the selected protocol
    setEdges(createEdges(occurrence.swarmProtocol));

    // Set the protocol to the selected occurrence
    setProtocol(occurrence.swarmProtocol);

    // Set subscriptions
    subRef.current = createSubscriptions(occurrence.swarmProtocol);

    // Set the selected protocol to the selected occurrence
    selectedProtocolRef.current = e.target.value;
  };

  // Add new role to subscriptions
  function handleNewRoleInFlow(newRole: string) {
    let newSubscriptions = subRef.current;
    newSubscriptions[newRole] = [];

    subRef.current = newSubscriptions;
  }

  // Pass data back to extension. Type annotations.
  function handleChangesFromFlow(changedNodes, changedEdges, isStoreInMetaChecked, variables) {
    // Transform changes to transitions
    let newTransitions: Transition[] = changedEdges.map((edge) => {
      return {
        source: edge.source,
        target: edge.target,
        label: {
          cmd: edge.label?.split("@")[0],
          role: edge.label?.split("@")[1].split("<")[0],
          logType: edge.data.logType ?? [],
        },
        id: edge.id
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
    //selectedProtocolRef
    let initialNode = changedNodes.find((node) => node.data.initial);

    // Change swarm protocol to correspond to the changes
    const protocol: SwarmProtocol = {
      initial: initialNode ? initialNode.data.label : "unknown",
      transitions: newTransitions,
      metadata: {layout: layout, subscriptions: subRef.current}
    };

    // Send the changes to the extension
    vscode.postMessage({
      command: "changeProtocol",
      data: {
        name: selectedProtocolRef.current,
        swarmProtocol: protocol,
        isStoreInMetaChecked,
        variables
      },
    });
  }

  function updateSubscriptions(subs: Record<string, string[]>) {
    subRef.current = subs;
  }

  return (
    <>
      <DownloadButton />
      <button
        className="button"
        type="button"
        onClick={(event) => {
          setIsDialogOpen(true);
        }}
      >
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
      {occurrences.size > 1 && (
        <select className="dropdown" onChange={handleSelect}>
          {Array.from(occurrences).map(([name, occurrence]) => (
            <option value={occurrence.name} key={occurrence.name}>
              {occurrence.name}
            </option>
          ))}
        </select>
      )}
      <Flow
        nodes={nodes}
        edges={edges}
        hasLayout={protocol?.metadata?.layout !== undefined}
        edgesTypes={edgesTypes}
        sendDataToParent={handleChangesFromFlow}
        sendErrorToParent={(error) => vscode.postMessage(error)}
        sendNewRoleToParent={handleNewRoleInFlow}
      />
    </>
  );
};

function createSubscriptions(protocol): Record<string, string[]> {
  let subscriptions = protocol.subscriptions ?? {};

  protocol.transitions.map((transition) => {
    if (!Object.keys(subscriptions).includes(transition.label.role)) {
      subscriptions[transition.label.role] = [];
    }
  });

  return subscriptions;
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
              elem.id == transition.id
              //elem.source === transition.source &&
              //elem.target === transition.target
            );
          })
        : undefined;

    if (transition.source === transition.target) {
      return {
        id: transition.id,
        source: transition.source,
        target: transition.target,
        label: `${transition.label.cmd}@${transition.label.role}<${transition.label.logType.join(", ")}>`,
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
      const edgeLayout = protocol.metadata?.layout?.edges?.find(
        (edge) => edge.id === transition.id
      );
      return {
        id: transition.id,
        source: transition.source,
        target: transition.target,
        label: `${transition.label.cmd}@${transition.label.role}<${transition.label.logType.join(", ")}>`,
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

  // Outcommented this section. We should only draw the nodes
  // that actually appear in protocol? metadata could contain nodes
  // that have been renamed or for other reasons do not exist in protocol?
  // even though protocol synchronized.
  /* protocol.metadata?.layout?.nodes?.forEach((element) => {
    if (!nodeNames.has(element.name)) {
      nodeNames.add(element.name);
    }
  }); */

  // Create nodes that correspond to ReactFlow
  const nodes = Array.from(nodeNames).map((nodeName) => {
    let nodeLayout = protocol.metadata?.layout?.nodes?.find(
      (node) => node.name === nodeName
    );
    return {
      id: nodeName,
      data: { label: nodeName, initial: nodeName === protocol.initial },
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
