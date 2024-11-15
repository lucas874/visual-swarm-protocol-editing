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
import "./style.css";

const nodeWidth = 175;
const nodeHeight = 75;

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
  const [isNodeDialogOpen, setIsNodeDialogOpen] = React.useState(false);
  const [isEdgeDialogOpen, setIsEdgeDialogOpen] = React.useState(false);

  // https://react.dev/reference/react/useRef
  const nodesRef = useRef(nodes);
  const labelRef = useRef("");
  const commandRef = useRef("");
  const roleRef = useRef("");
  const selectedNodeRef = useRef(null);
  const selectedEdgeRef = useRef(null);

  // Open and close the dialogs
  const openNodeDialog = () => setIsNodeDialogOpen(true);
  const closeNodeDialog = () => setIsNodeDialogOpen(false);
  const openEdgeDialog = () => setIsEdgeDialogOpen(true);
  const closeEdgeDialog = () => setIsEdgeDialogOpen(false);

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
  function setEdgeLabel() {
    setEdges((edges) =>
      edges.map((currentEdge) => {
        if (
          currentEdge.source === selectedEdgeRef.current.source &&
          currentEdge.target === selectedEdgeRef.current.target
        ) {
          return { ...currentEdge, label: labelRef.current };
        }
        return currentEdge;
      })
    );
  }

  // Set the label of the node
  function setNodeLabel() {
    setNodes((nodes) =>
      nodes.map((currentNode) => {
        if (currentNode.id === selectedNodeRef.current.id) {
          return {
            ...currentNode,
            data: { label: labelRef.current },
            id: labelRef.current,
          };
        }
        return currentNode;
      })
    );

    setEdges((edges) =>
      edges.map((currentEdge) => {
        if (currentEdge.source === selectedNodeRef.current.id) {
          return { ...currentEdge, source: labelRef.current };
        } else if (currentEdge.target === selectedNodeRef.current.id) {
          return { ...currentEdge, target: labelRef.current };
        }
        return currentEdge;
      })
    );
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
    setNodes((nodes) => nodes.concat(newNode));
  }

  // Delete the edge
  function deleteEdge(edgesToDelete) {
    setEdges((edges) =>
      edges.filter(
        (edge) => !edgesToDelete.map((edge) => edge.id).includes(edge.id)
      )
    );
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
  }

  // Update nodes and edges with the layouted elements
  const onLayout = useCallback(
    (isLayouted) => {
      if (!isLayouted) {
        const layouted = getLayoutedElements(initialNodes, initialEdges);
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

  // Inspiration from https://medium.com/@harshsinghatz/key-bindings-in-react-bb1e8da265f9
  useEffect(() => {
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
  }, []);

  useEffect(() => {
    onLayout(hasLayout);
  }, [onLayout]);

  return (
    <div>
      <button className="button" onClick={saveChanges}>
        Save changes
      </button>
      <button className="button" onClick={() => onLayout(false)}>
        Auto Layout
      </button>
      <button className="button" onClick={addNode}>
        Add new node
      </button>
      {/* Create a dialog trying to delete */}
      {isNodeDialogOpen && (
        <div className="overlay" onClick={closeNodeDialog}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="row">
              <label className="label">Label</label>
              <input
                className="input float-right"
                type="text"
                placeholder="Add label"
                onChange={(e) => (labelRef.current = e.target.value)}
                defaultValue={labelRef.current}
              />
            </div>
            <div className="row float-right">
              <button
                className="button-dialog float-right"
                onClick={(e) => {
                  closeNodeDialog();
                  setNodeLabel();
                }}
              >
                Save
              </button>
              <button
                className="button-cancel float-right"
                onClick={closeNodeDialog}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Create a dialog when double clicking on a node */}
      {isNodeDialogOpen && (
        <div className="overlay" onClick={closeNodeDialog}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="row">
              <label className="label">Label</label>
              <input
                className="input float-right"
                type="text"
                placeholder="Add label"
                onChange={(e) => (labelRef.current = e.target.value)}
                defaultValue={labelRef.current}
              />
            </div>
            <div className="row float-right">
              <button
                className="button-cancel float-right"
                onClick={closeNodeDialog}
              >
                Cancel
              </button>
              <button
                className="button-dialog float-right"
                onClick={(e) => {
                  closeNodeDialog();
                  setNodeLabel();
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Create a dialog when double clicking on an edge */}
      {isEdgeDialogOpen && (
        <div className="overlay" onClick={closeEdgeDialog}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="row">
              <label className="label">Command</label>
              <input
                className="input float-right"
                type="text"
                placeholder="Add command"
                onChange={(e) =>
                  (labelRef.current = e.target.value + "@" + roleRef.current)
                }
                defaultValue={commandRef.current}
              />
            </div>
            <div className="row">
              <label className="label">Role</label>
              <input
                className="input"
                type="text"
                placeholder="Add role"
                onChange={(e) =>
                  (labelRef.current = commandRef.current + "@" + e.target.value)
                }
                defaultValue={roleRef.current}
              />
            </div>
            <div className="row float-right">
              <button className="button-cancel" onClick={closeEdgeDialog}>
                Cancel
              </button>
              <button
                className="button-dialog"
                onClick={(e) => {
                  closeEdgeDialog();
                  setEdgeLabel();
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Create the flow, ensure visibility by adding height */}
      <div style={{ height: "900px" }}>
        {/* https://reactflow.dev/api-reference/react-flow#nodeorigin */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={(_, node) => {
            selectedNodeRef.current = node;
            labelRef.current = node.data.label?.toString() ?? "";
            openNodeDialog();
          }}
          onEdgeDoubleClick={(_, edge) => {
            selectedEdgeRef.current = edge;
            commandRef.current = edge.label?.toString().split("@")[0] ?? "";
            roleRef.current = edge.label?.toString().split("@")[1] ?? "";
            openEdgeDialog();
          }}
          edgeTypes={edgesTypes}
          onNodesDelete={(nodesToDelete) => deleteNode(nodesToDelete)}
          onEdgesDelete={(edgesToDelete) => deleteEdge(edgesToDelete)}
          fitView
          attributionPosition="top-right"
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
