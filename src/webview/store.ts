// Template from: https://reactflow.dev/learn/tutorials/mind-map-app-with-react-flow
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnEdgesChange,
  type OnNodesChange,
} from "@xyflow/react";
import { createWithEqualityFn } from "zustand/traditional";

export type RFState = {
  nodes: Node[];
  edges: Edge[];
  setInitialElements: (initialNodes: Node[], initialEdges: Edge[]) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  addEdge: (edge: Edge) => void;
  addNode: (node: Node) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  updateEdgeLabel: (edgeId: string, label: string, logType: string[]) => void;
  deleteNodes: (nodeIds: string[]) => void;
  deleteEdges: (edgeIds: string[]) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
};

const useStore = createWithEqualityFn<RFState>((set, get) => ({
  nodes: [],
  edges: [],
  setInitialElements(initialNodes: Node[], initialEdges: Edge[]) {
    set({
      nodes: initialNodes,
      edges: initialEdges,
    });
  },
  setNodes: (setNodes: Node[]) => {
    set({
      nodes: setNodes,
    });
  },
  setEdges: (setEdges: Edge[]) => {
    set({
      edges: setEdges,
    });
  },
  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  addEdge: (edge: Edge) => {
    set({
      edges: [...get().edges, edge],
    });
  },
  addNode: (node: Node) => {
    set({
      nodes: [...get().nodes, node],
    });
  },
  updateNodeLabel: (nodeId: string, label: string) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: { ...node.data, label },
            id: label,
          };
        }
        return node;
      }),
      edges: get().edges.map((edge) => {
        if (edge.source === nodeId) {
          return { ...edge, source: label };
        } else if (edge.target === nodeId) {
          return { ...edge, target: label };
        }
        return edge;
      }),
    });
  },
  updateEdgeLabel: (edgeId: string, label: string, logType: string[]) => {
    console.log("updateEdgeLabel", edgeId, label, logType);
    set({
      edges: get().edges.map((edge) => {
        if (edge.id === edgeId) {
          return { ...edge, label: label, data: { ...edge.data, logType } };
        }
        return edge;
      }),
    });

    console.log(get().edges);
  },
  deleteNodes: (nodeIds: string[]) => {
    set({
      nodes: get().nodes.filter((node) => !nodeIds.includes(node.id)),
    });
  },
  deleteEdges: (edgeIds: string[]) => {
    set({
      edges: get().edges.filter((edge) => !edgeIds.includes(edge.id)),
    });
  },
}));

export default useStore;
