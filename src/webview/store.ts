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
//  const [storeMetaInFile, setStoreMetaInFile] = React.useState(false);
export type RFState = {
  nodes: Node[];
  edges: Edge[];
  variables: Set<string>;
  isDeleteDialogOpen: boolean;
  isNodeDialogOpen: boolean;
  isEdgeDialogOpen: boolean;
  isStoreInMetaChecked: boolean;
  setInitialElements: (initialNodes: Node[], initialEdges: Edge[]) => void;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  addEdge: (edge: Edge) => void;
  addNode: (node: Node) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  updateInitialNode: (nodeId: string) => void;
  setIsNodeDialogOpen: (open: boolean) => void;
  updateEdgeLabel: (edgeId: string, label: string, logType: string[]) => void;
  setIsEdgeDialogOpen: (open: boolean) => void;
  deleteNodes: (nodeIds: string[]) => void;
  deleteEdges: (edgeIds: string[]) => void;
  setIsDeleteDialogOpen: (open: boolean) => void;
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setIsStoreInMetaChecked: (checked: boolean) => void;
  setVariables: (variables: Set<string>) => void;
  addVariable: (variable: string) => void;
  hasVariable: (variable: string) => boolean;
};

const useStore = createWithEqualityFn<RFState>((set, get) => ({
  nodes: [],
  edges: [],
  variables: new Set(),
  isDeleteDialogOpen: false,
  isNodeDialogOpen: false,
  isEdgeDialogOpen: false,
  isStoreInMetaChecked: false,
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
  updateInitialNode: (nodeId: string) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, data: { ...node.data, initial: true } };
        } else {
          return { ...node, data: { ...node.data, initial: false } };
        }
      }),
    });
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
  setIsNodeDialogOpen: (open: boolean) => {
    set({ isNodeDialogOpen: open });
  },
  setIsEdgeDialogOpen: (open: boolean) => {
    set({ isEdgeDialogOpen: open });
  },
  setIsDeleteDialogOpen: (open: boolean) => {
    set({ isDeleteDialogOpen: open });
  },
  setIsStoreInMetaChecked: (checked: boolean) => {
    set( { isStoreInMetaChecked: checked } )
  },
  setVariables: (variables: Set<string>) => {
    set({ variables })
  },
  addVariable: (variable: string) => {
    return get().variables.add(variable)
  },
  hasVariable: (variable: string): boolean => {
    return get().variables.has(variable)
  }
}));

export default useStore;
