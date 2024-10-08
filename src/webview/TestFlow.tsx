import React, { useCallback, useEffect } from "react";
import Dagre from "@dagrejs/dagre";
import {
  ReactFlow,
  useReactFlow,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  ConnectionMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// Create nodes and edges from the protocol data
const getLayoutedElements = (nodes, edges, options) => {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: options.direction });

  edges.forEach((edge) => g.setEdge(edge.source, edge.target));
  nodes.forEach((node) =>
    g.setNode(node.id, {
      ...node,
      // Change to standard values other than 0, if no measurements found
      // Helps collision detection from dagre
      width: node.measured?.width ?? 175,
      height: node.measured?.height ?? 75,
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
      const x = position.x - (node.measured?.width ?? 175) / 5;
      const y = position.y - (node.measured?.height ?? 75) / 5;

      return { ...node, position: { x, y } };
    }),
    edges,
  };
};

// Create flow from values given
const LayoutFlow = ({ initialNodes, initialEdges, edgesTypes }) => {
  const { fitView } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes and edges with the layouted elements
  const onLayout = useCallback(
    (direction) => {
      const layouted = getLayoutedElements(initialNodes, initialEdges, {
        direction,
      });

      setNodes([...layouted.nodes]);
      setEdges([...layouted.edges]);

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
    onLayout("TB");
  }, [onLayout]);

  return (
    <div style={{ height: "600px" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        edgeTypes={edgesTypes}
        fitView
        attributionPosition="top-right"
        connectionMode={ConnectionMode.Loose}
      >
        {/* Removed buttons */}
      </ReactFlow>
    </div>
  );
};

// This is the Flow component that will be rendered in the App component
function Flow({ nodes, edges, edgesTypes }) {
  return (
    <ReactFlowProvider>
      <LayoutFlow
        initialNodes={nodes}
        initialEdges={edges}
        edgesTypes={edgesTypes}
      />
    </ReactFlowProvider>
  );
}

export default Flow;
