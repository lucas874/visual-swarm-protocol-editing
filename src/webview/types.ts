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
  logType: string[];
  role: string;
};

export type LayoutType = {
  name: string;
  x?: number;
  y?: number;
};

export interface SwarmProtocol {
  initial: InitialNode;
  layout?: LayoutType[];
  transitions: Transition[];
}
