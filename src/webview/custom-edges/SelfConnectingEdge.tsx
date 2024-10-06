import React from "react";
import { BaseEdge, BezierEdge, EdgeProps } from "@xyflow/react";

// Example from React Flow: https://reactflow.dev/examples/edges/custom-edges
export default function SelfConnecting(props: EdgeProps) {
  // we are using the default bezier edge when source and target are not the same
  if (props.source !== props.target) {
    return <BezierEdge {...props} />;
  }

  // Split props to match the following values
  const { sourceX, sourceY, targetX, targetY, id, markerEnd } = props;

  // Set radius
  const radiusX = 100;
  const radiusY = (sourceY - targetY) * 0.7;

  // Create a path for the edge that loops back to same node
  const edgePath = `M ${sourceX - 5} ${sourceY} A ${radiusX} ${radiusY} 0 1 0 ${
    targetX + 2
  } ${targetY}`;

  return <BaseEdge path={edgePath} markerEnd={markerEnd} />;
}
