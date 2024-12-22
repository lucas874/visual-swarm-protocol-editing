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
  isDeleteDialogOpen: boolean;
  isNodeDialogOpen: boolean;
  isEdgeDialogOpen: boolean;
  setInitialElements: (initialNodes: Node[], initialEdges: Edge[]) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  addEdge: (edge: Edge) => void;
  addNode: (node: Node) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  setIsNodeDialogOpen: (open: boolean) => void;
  updateEdgeLabel: (edgeId: string, label: string, logType: string[]) => void;
  setIsEdgeDialogOpen: (open: boolean) => void;
  deleteNodes: (nodeIds: string[]) => void;
  deleteEdges: (edgeIds: string[]) => void;
  setIsDeleteDialogOpen: (open: boolean) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
};

const useStore = createWithEqualityFn<RFState>((set, get) => ({
  nodes: [],
  edges: [],
  isDeleteDialogOpen: false,
  isNodeDialogOpen: false,
  isEdgeDialogOpen: false,
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
        if (edge.source === nodeId && edge.target === nodeId) {
          return { ...edge, source: label, target: label };
        } else if (edge.source === nodeId) {
          return { ...edge, source: label };
        } else if (edge.target === nodeId) {
          return { ...edge, target: label };
        }
        return edge;
      }),
    });
  },
  setIsNodeDialogOpen: (open: boolean) => {
    set({ isNodeDialogOpen: open });
  },
  updateEdgeLabel: (edgeId: string, label: string, logType: string[]) => {
    set({
      edges: get().edges.map((edge) => {
        if (edge.id === edgeId) {
          return { ...edge, label: label, data: { ...edge.data, logType } };
        }
        return edge;
      }),
    });
  },
  setIsEdgeDialogOpen: (open: boolean) => {
    set({ isEdgeDialogOpen: open });
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
  setIsDeleteDialogOpen: (open: boolean) => {
    set({ isDeleteDialogOpen: open });
  },
}));

export default useStore;
