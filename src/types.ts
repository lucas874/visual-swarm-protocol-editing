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

export type SwarmProtocolMetadata = {
    layout: LayoutType;
    subscriptions: Record<string, string[]>;
}

export interface SwarmProtocol {
  initial: string;
  transitions: Transition[];
  metadata?: SwarmProtocolMetadata
}

// Start and end pos are the source file text positions (in characters from beginning of file) 
//of the swarm protocol occurrence.  
export type Position = { startPos: number, endPos: number }
export type Occurrence = { name: string, swarmProtocol: SwarmProtocol, swarmProtocolOriginal: SwarmProtocol, position: Position }

export type BuildProtocol = { command: "buildProtocol", data: Occurrence[] }
export type HighLightEdges = { command: "highlightEdges", data: { protocol: SwarmProtocol, transitions: Transition[] } }
export type HighlightNodes = { command: "highlightNodes", data: { protocol: SwarmProtocol, nodes: string[] } }
export type ChangeProtocol = { command: "changeProtocol", data: Occurrence }
export type MessageEventPayload = BuildProtocol | HighLightEdges | HighlightNodes | ChangeProtocol