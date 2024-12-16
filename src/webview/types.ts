// Define types of nodes and transitions for protocols
export type InitialNode = {
  name: string;
};

export type Transition = {
  source: string;
  target: string;
  label: TransitionLabel;
};

export type TransitionLabel = {
  cmd: string;
  logType?: string[];
  role: string;
};

export type NodeLayout = {
  name: string;
  x?: number;
  y?: number;
};

export type PositionHandler = {
  x: number;
  y: number;
  active: number;
  isLabel: boolean;
};

export type EdgeLayout = {
  id: string;
  positionHandlers: PositionHandler[];
};

export type LayoutType = {
  nodes?: NodeLayout[];
  edges?: EdgeLayout[];
};

export interface SwarmProtocol {
  initial: InitialNode;
  layout?: LayoutType;
  subscriptions?: Record<string, string[]>;
  transitions: Transition[];
}
