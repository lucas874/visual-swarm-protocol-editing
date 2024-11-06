import React, { useCallback, useEffect } from "react";
import Dagre from "@dagrejs/dagre";
import {
  ReactFlow,
  useReactFlow,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  ConnectionMode,
  addEdge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

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
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedEdge, setEditedEdge] = React.useState(null);

  // From https://reactflow.dev/api-reference/utils/add-edge
  const onConnect = useCallback(
    (connection) => {
      setIsEditing(true);
      setEditedEdge(connection);
      setEdges((edges) => addEdge(connection, edges));
    },
    [setEdges]
  );

  // From https://medium.com/@ozhanli/passing-data-from-child-to-parent-components-in-react-e347ea60b1bb
  function saveChanges() {
    // Check that all edges have a "command@role" label
    if (edges.some((edge) => !edge.label)) {
      sendErrorToParent("noEdgeLabel");
      return;
    } else if (
      // Check that all edges have a label in the format "command@role"
      edges.some(
        (edge) => typeof edge.label === "string" && !edge.label.match(/\w*@\w*/)
      )
    ) {
      sendErrorToParent("edgeLabelWrongFormat");
      return;
    } else {
      sendDataToParent(nodes, edges);
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

  // Ensure that the layout is vertical when the component is first rendered
  // And that no buttons are needed to be clicked
  useEffect(() => {
    onLayout(hasLayout);
  }, [onLayout]);

  return (
    <div>
      <button onClick={saveChanges}>Save changes</button>
      <button onClick={() => onLayout(false)}>Auto Layout</button>
      <button onClick={addNode}>Add new node</button>
      {/* Insert input field for new labels or editing old labels */}
      {isEditing && (
        <input
          className="float-right"
          name="label"
          type="text"
          placeholder={"Add label"}
          defaultValue={editedEdge?.label ?? ""}
          onChange={(e) => {
            setEdgeLabel(editedEdge, e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (
                // Check that all edges have a label in the format "command@role"
                edges.some(
                  (edge) =>
                    typeof edge.label === "string" &&
                    !edge.label.match(/\w*@\w*/)
                )
              ) {
                sendErrorToParent("edgeLabelWrongFormat");
                return;
              } else {
                setIsEditing(false);
                setEditedEdge(null);
              }
            }
          }}
        />
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
            setEditedEdge(edge);
            setIsEditing(true);
          }}
          edgeTypes={edgesTypes}
          fitView
          attributionPosition="top-right"
          connectionMode={ConnectionMode.Loose}
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
