// Define types of nodes and transitions for protocols
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
  initial: string;
  layout?: LayoutType;
  subscriptions?: Record<string, string[]>;
  transitions: Transition[];
}

export type Occurrence = { name: string, jsonObject: SwarmProtocol }

export type BuildProtocol = { command: "buildProtocol", data: Occurrence[] }
export type HighLightEdges = { command: "highlightEdges", data: { protocol: string, transitions: Transition[] } }
export type HighlightNodes = { command: "highlightNodes", data: { protocol: string, nodes: string[] } }
export type MessageEventPayload = BuildProtocol | HighLightEdges | HighlightNodes