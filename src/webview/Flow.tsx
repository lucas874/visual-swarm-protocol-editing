import React, { useCallback, useEffect, useRef } from "react";
import Dagre from "@dagrejs/dagre";
import {
  ReactFlow,
  useReactFlow,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  addEdge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const nodeWidth = 175;
const nodeHeight = 75;

const nodeStyle = {
  color: "black",
};

// Create nodes and edges from the protocol data
const getLayoutedElements = (nodes, edges) => {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB" });

  edges.forEach((edge) => g.setEdge(edge.source, edge.target));
  nodes.forEach((node) =>
    g.setNode(node.id, {
      ...node,
      // Change to standard values other than 0, if no measurements found
      // Helps collision detection from dagre
      width: node.measured?.width ?? nodeWidth,
      height: node.measured?.height ?? nodeHeight,
      nodesep: 20,
      ranksep: 100,
    })
  );

  Dagre.layout(g);

  return {
    nodes: nodes.map((node) => {
      const position = g.node(node.id);
      // We are shifting the dagre node position (anchor=center center) to the top left
      // so it matches the React Flow node anchor point (top left).
      // Still using the same standard measurements from above
      const x = position.x - (node.measured?.width ?? nodeWidth) / 5;
      const y = position.y - (node.measured?.height ?? nodeHeight) / 5;

      return { ...node, position: { x, y } };
    }),
    edges,
  };
};

// Create flow from values given
const LayoutFlow = ({
  initialNodes,
  initialEdges,
  hasLayout,
  edgesTypes,
  sendDataToParent,
  sendErrorToParent,
}) => {
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [isEditingEdge, setIsEditingEdge] = React.useState(false);
  const [isEditingNode, setIsEditingNode] = React.useState(false);
  const [editedEdge, setEditedEdge] = React.useState(null);
  const [editedNode, setEditedNode] = React.useState(null);
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);

  // From https://reactflow.dev/api-reference/utils/add-edge
  const onConnect = useCallback(
    (connection) => {
      connection.markerEnd = { type: MarkerType.ArrowClosed };
      connection.style = {
        strokeWidth: 1.7,
      };
      connection.id = `${connection.source}-${connection.target}`;
      if (connection.source === connection.target) {
        connection.type = "selfconnecting";
      }
      setIsEditingEdge(true);
      setEditedEdge(connection);
      setEdges((edges) => addEdge(connection, edges));
    },
    [setEdges]
  );

  // From https://medium.com/@ozhanli/passing-data-from-child-to-parent-components-in-react-e347ea60b1bb
  function saveChanges() {
    // Check that all edges have a label
    if (edges.some((edge) => !edge.label)) {
      sendErrorToParent("noEdgeLabel");
      return;
    } else if (
      // Check that all edges have a label in the format "command@role"
      edges.some(
        (edge) => typeof edge.label === "string" && !edge.label.match(/\S+@\S+/)
      )
    ) {
      sendErrorToParent("edgeLabelWrongFormat");
      return;
    } else {
      const fixNodeNames = nodesRef.current.map((node) => {
        return {
          ...node,
          id: node.data.label,
        };
      });
      sendDataToParent(fixNodeNames, edges);
    }
  }

  // Set the label of the edge
  function setEdgeLabel(edge, label) {
    setEdges((edges) =>
      edges.map((currentEdge) => {
        if (
          currentEdge.source === edge.source &&
          currentEdge.target === edge.target
        ) {
          return { ...currentEdge, label };
        }
        return currentEdge;
      })
    );
  }

  // Set the label of the node
  function setNodeLabel(node, label) {
    setNodes((nodes) =>
      nodes.map((currentNode) => {
        if (currentNode.id === node.id) {
          return { ...currentNode, data: { label } };
        }
        return currentNode;
      })
    );
  }

  // Save changes to label and end editing
  function endEditing(edge) {
    if (
      // Check that all edges have a label in the format "command@role"
      edges.some(
        (edge) => typeof edge.label === "string" && !edge.label.match(/\S+@\S+/)
      )
    ) {
      sendErrorToParent("edgeLabelWrongFormat");
      return;
    } else {
      setIsEditingEdge(false);
      setEditedEdge(null);
    }
  }

  // Add a new node to the flow
  function addNode() {
    const newNode = {
      id: `${nodes.length + 1}`,
      data: { label: `Node ${nodes.length + 1}` },
      position: {
        x: 0,
        y: 0,
      },
    };
    setIsEditingNode(true);
    setEditedNode(newNode);
    setNodes((nodes) => nodes.concat(newNode));
  }

  // Delete the edge
  function deleteEdge(edgesToDelete) {
    setEdges((edges) =>
      edges.filter(
        (edge) => !edgesToDelete.map((edge) => edge.id).includes(edge.id)
      )
    );
    setIsEditingEdge(false);
    setEditedEdge(null);
    setIsEditingNode(false);
    setEditedNode(null);
  }

  // Delete the node
  function deleteNode(nodesToDelete) {
    setNodes((nodes) =>
      nodes.filter(
        (node) => !nodesToDelete.map((node) => node.id).includes(node.id)
      )
    );
    setEdges((edges) =>
      edges.filter(
        (edge) =>
          !nodesToDelete.map((node) => node.id).includes(edge.source) &&
          !nodesToDelete.map((node) => node.id).includes(edge.target)
      )
    );
    setEditedEdge(null);
    setIsEditingEdge(false);
    setEditedNode(null);
    setIsEditingNode(false);
  }

  // Update nodes and edges with the layouted elements
  const onLayout = useCallback(
    (isLayouted) => {
      if (!isLayouted) {
        const layouted = getLayoutedElements(
          nodesRef.current,
          edgesRef.current
        );
        setNodes([...layouted.nodes]);
        setEdges([...layouted.edges]);
      } else {
        setNodes([...initialNodes]);
        setEdges([...initialEdges]);
      }

      window.requestAnimationFrame(() => {
        fitView();
      });
    },
    // Changed dependencies so it can be used inside the useEffect
    [fitView, initialNodes, initialEdges, setNodes, setEdges]
  );

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  // Inspiration from https://medium.com/@harshsinghatz/key-bindings-in-react-bb1e8da265f9
  useEffect(() => {
    onLayout(hasLayout);

    const handleKeyDown = (event) => {
      if (
        (event.metaKey && event.key === "s") ||
        (event.ctrlKey && event.key === "s")
      ) {
        saveChanges();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onLayout]);

  return (
    <div>
      <button onClick={saveChanges}>Save changes</button>
      <button onClick={() => onLayout(false)}>Auto Layout</button>
      <button onClick={addNode}>Add new node</button>
      {/* Insert input field for new labels or editing old labels */}
      {isEditingEdge && (
        <input
          className="float-right"
          name="label"
          type="text"
          placeholder="Add edge label"
          defaultValue={editedEdge?.label ?? ""}
          onChange={(e) => {
            setEdgeLabel(editedEdge, e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              endEditing(editedEdge);
            }
          }}
        />
      )}
      {isEditingEdge && (
        <button
          className="float-right"
          onClick={() => {
            deleteEdge([editedEdge]);
          }}
        >
          Delete edge
        </button>
      )}
      {isEditingNode && (
        <input
          className="float-right"
          name="label"
          type="text"
          placeholder="Add node label"
          defaultValue={editedNode?.data.label ?? ""}
          onChange={(e) => {
            setNodeLabel(editedNode, e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setIsEditingNode(false);
              setEditedNode(null);
            }
          }}
        />
      )}
      {isEditingNode && (
        <button
          className="float-right"
          onClick={() => {
            deleteNode([editedNode]);
          }}
        >
          Delete node
        </button>
      )}
      <div style={{ height: "600px" }}>
        {/* https://reactflow.dev/api-reference/react-flow#nodeorigin */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={(event, edge) => {
            setEditedNode(null);
            setIsEditingNode(false);
            setEditedEdge(edge);
            setIsEditingEdge(true);
          }}
          onNodeClick={(event, node) => {
            setEditedEdge(null);
            setIsEditingEdge(false);
            setEditedNode(node);
            setIsEditingNode(true);
          }}
          edgeTypes={edgesTypes}
          onNodesDelete={(nodesToDelete) => deleteNode(nodesToDelete)}
          onEdgesDelete={(edgesToDelete) => deleteEdge(edgesToDelete)}
          fitView
          attributionPosition="top-right"
          style={nodeStyle}
        ></ReactFlow>
      </div>
    </div>
  );
};

// This is the Flow component that will be rendered in the App component
function Flow({
  nodes,
  edges,
  hasLayout,
  edgesTypes,
  sendDataToParent,
  sendErrorToParent,
}) {
  return (
    <div>
      <ReactFlowProvider>
        <LayoutFlow
          initialNodes={nodes}
          initialEdges={edges}
          hasLayout={hasLayout}
          edgesTypes={edgesTypes}
          sendDataToParent={sendDataToParent}
          sendErrorToParent={sendErrorToParent}
        />
      </ReactFlowProvider>
    </div>
  );
}

export default Flow;
