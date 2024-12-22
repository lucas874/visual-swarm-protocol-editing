import React, { useCallback, useEffect, useRef } from "react";
import Dagre from "@dagrejs/dagre";
import {
  ReactFlow,
  ReactFlowProvider,
  MarkerType,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./style.css";
import useStore, { RFState } from "./store";
import { shallow } from "zustand/shallow";
import DeleteDialog from "./modals/DeleteDialog";
import NodeLabelDialog from "./modals/ChangeNodeLabelDialog";
import EdgeLabelDialog from "./modals/ChangeEdgeLabelDialog";

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

const selector = (state: RFState) => ({
  nodes: state.nodes,
  edges: state.edges,
  isDeleteDialogOpen: state.isDeleteDialogOpen,
  isNodeDialogOpen: state.isNodeDialogOpen,
  isEdgeDialogOpen: state.isEdgeDialogOpen,
  setInitialElements: state.setInitialElements,
  setNodes: state.setNodes,
  setEdges: state.setEdges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  addEdge: state.addEdge,
  addNode: state.addNode,
  setIsNodeDialogOpen: state.setIsNodeDialogOpen,
  setIsEdgeDialogOpen: state.setIsEdgeDialogOpen,
  setIsDeleteDialogOpen: state.setIsDeleteDialogOpen,
});

// Create flow from values given
const LayoutFlow = ({
  initialNodes,
  initialEdges,
  hasLayout,
  edgesTypes,
  sendDataToParent,
  sendErrorToParent,
}) => {
  const {
    nodes,
    edges,
    isDeleteDialogOpen,
    isNodeDialogOpen,
    isEdgeDialogOpen,
    setIsDeleteDialogOpen,
    setIsNodeDialogOpen,
    setIsEdgeDialogOpen,
    setInitialElements,
    setNodes,
    setEdges,
    onNodesChange,
    onEdgesChange,
    addEdge,
    addNode,
  } = useStore(selector, shallow);

  // https://react.dev/reference/react/useRef
  const nodesRef = useRef([]);
  const edgesRef = useRef([]);
  const nodeLabelRef = useRef("");
  const edgeLabelRef = useRef("");
  const commandRef = useRef("");
  const roleRef = useRef("");
  const logTypeRef = useRef("");
  const selectedNodeRef = useRef(null);
  const selectedEdgeRef = useRef(null);
  const onDeleteRef = useRef(null);

  // From https://medium.com/@ozhanli/passing-data-from-child-to-parent-components-in-react-e347ea60b1bb
  function saveChanges() {
    // Check that all nodes have a label
    if (edgesRef.current.some((edge) => !edge.label)) {
      // Check that all edges have a label
      sendErrorToParent("noEdgeLabel");
      return;
    } else {
      const fixNodeNames = nodesRef.current.map((node) => {
        return {
          ...node,
          id: node.data.label,
        };
      });
      sendDataToParent(fixNodeNames, edgesRef.current);
    }
  }

  const onConnect = useCallback((connection) => {
    connection.markerEnd = { type: MarkerType.ArrowClosed };
    connection.style = {
      strokeWidth: 1.7,
    };
    connection.id = `${connection.source}-${connection.target}`;
    if (connection.source === connection.target) {
      connection.type = "selfconnecting";
    } else {
      connection.type = "positionable";
    }
    connection.data = {
      positionHandlers: [],
    };
    addEdge(connection);
  }, []);

  // Update nodes and edges with the layouted elements
  const onLayout = useCallback(
    (isLayouted) => {
      if (!isLayouted) {
        let layouted;
        if (nodesRef.current.length > 0 && edgesRef.current.length > 0) {
          layouted = getLayoutedElements(nodesRef.current, edgesRef.current);
        } else if (nodesRef.current.length > 0) {
          layouted = getLayoutedElements(nodesRef.current, initialEdges);
        } else if (edgesRef.current.length > 0) {
          layouted = getLayoutedElements(initialNodes, edgesRef.current);
        } else {
          layouted = getLayoutedElements(initialNodes, initialEdges);
        }

        setNodes([...layouted.nodes]);
        setEdges([...layouted.edges]);
      } else {
        setNodes([...initialNodes]);
        setEdges([...initialEdges]);
      }
    },
    // Changed dependencies so it can be used inside the useEffect
    [initialNodes, initialEdges, setNodes, setEdges]
  );

  useEffect(() => {
    setInitialElements(initialNodes, initialEdges);
    nodesRef.current = initialNodes;
    edgesRef.current = initialEdges;
  }, [setInitialElements, initialNodes, initialEdges]);

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
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  useEffect(() => {
    onLayout(hasLayout);
  }, [onLayout]);

  return (
    <>
      <div className="button-container-div">
        <button className="button" onClick={saveChanges}>
          Save changes
        </button>
        <button className="button" onClick={() => onLayout(false)}>
          Auto Layout
        </button>
        <button
          className="button"
          onClick={() => {
            const newNode: Node = {
              id: `Node ${nodes.length + 1}`,
              data: { label: `Node ${nodes.length + 1}`, initial: false },
              position: {
                x: nodes[Math.floor((nodes.length - 1) / 2)]?.position.x + 20,
                y: nodes[Math.floor((nodes.length - 1) / 2)]?.position.y + 20,
              },
              type: "standard",
            };

            addNode(newNode);
          }}
        >
          Add new state
        </button>
      </div>
      {/* Create a dialog trying to delete */}
      {isDeleteDialogOpen && <DeleteDialog onDeleteRef={onDeleteRef.current} />}
      {/* Create a dialog when double clicking on a node */}
      {isNodeDialogOpen && (
        <NodeLabelDialog
          nodeLabelRef={nodeLabelRef.current}
          selectedNodeRef={selectedNodeRef.current}
          sendErrorToParent={sendErrorToParent}
        />
      )}
      {/* Create a dialog when double clicking on an edge */}
      {isEdgeDialogOpen && (
        <EdgeLabelDialog
          commandRef={commandRef.current}
          roleRef={roleRef.current}
          logTypeRef={logTypeRef.current}
          edgeLabelRef={edgeLabelRef.current}
          selectedEdgeRef={selectedEdgeRef.current}
          sendErrorToParent={sendErrorToParent}
        />
      )}
      <div className="react-flow__container-div">
        {/* https://reactflow.dev/api-reference/react-flow#nodeorigin */}
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDoubleClick={(_, node) => {
            selectedNodeRef.current = node;
            nodeLabelRef.current = node.data.label?.toString() ?? "";
            setIsNodeDialogOpen(true);
          }}
          onEdgeDoubleClick={(_, edge) => {
            selectedEdgeRef.current = edge;
            commandRef.current = edge.label?.toString().split("@")[0] ?? "";
            roleRef.current = edge.label?.toString().split("@")[1] ?? "";
            logTypeRef.current =
              (edge.data.logType as string[])?.join(",") ?? "";
            edgeLabelRef.current = commandRef.current + "@" + roleRef.current;
            setIsEdgeDialogOpen(true);
          }}
          onBeforeDelete={(onBeforeDelete) => {
            onDeleteRef.current = onBeforeDelete;
            setIsDeleteDialogOpen(true);
            return Promise.resolve(false);
          }}
          edgeTypes={edgesTypes}
          fitView
          attributionPosition="top-right"
          selectNodesOnDrag={false}
        ></ReactFlow>
      </div>
    </>
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
    <>
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
    </>
  );
}

export default Flow;
