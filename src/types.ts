import { Project, PropertyAssignment } from "ts-morph"

// Define types of nodes and transitions for protocols
export type Transition = {
  source: string;
  target: string;
  label: TransitionLabel;
  edgeId: number;
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
  nodeIds?: Record<string, number>,
}

// Start and end pos are the source file text positions (in characters from beginning of file)
//of the swarm protocol occurrence.
export type Position = { startPos: number, endPos: number }

export type LabelAST = { cmd: PropertyAssignment, logType: PropertyAssignment, role: PropertyAssignment }
// AST nodes representing a tranistion in a SwarmProtocolType.
export type TransitionAST = { source: PropertyAssignment, target: PropertyAssignment,  label: LabelAST, edgeId?: number }
// The AST of a SwarmProtocolType
export type SwarmProtocolAST = { name: string, initial: PropertyAssignment, transitions: TransitionAST[] }

// We can not use the AST stuff in occurrence, because we pass occurrences around the extension and the webview
// using postMessage and message argument of postMessage "must be a string or other json serializable object." (from docs).
export type Occurrence = { name: string, swarmProtocol: SwarmProtocol }
export type OccurrenceInfo = { occurrence: Occurrence, swarmProtocolAST: SwarmProtocolAST }

// For writing
export type ProtocolDiff = { name: string, old: SwarmProtocol, new: SwarmProtocol }

export type BuildProtocol = { command: "buildProtocol", data: Occurrence[] }
export type HighLightEdges = { command: "highlightEdges", data: { protocol: SwarmProtocol, transitions: Transition[] } }
export type HighlightNodes = { command: "highlightNodes", data: { protocol: SwarmProtocol, nodes: string[] } }
export type ChangeProtocol = { command: "changeProtocol", data: Occurrence }
export type MessageEventPayload = BuildProtocol | HighLightEdges | HighlightNodes | ChangeProtocol