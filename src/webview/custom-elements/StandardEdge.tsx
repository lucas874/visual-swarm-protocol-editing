import React from "react";
import { BaseEdge, EdgeLabelRenderer, EdgeProps } from "@xyflow/react";
import { getSmoothStepPath, SmoothStepEdge } from "reactflow";

// Example from React Flow: https://reactflow.dev/examples/edges/custom-edges
export default function Standard(props: EdgeProps) {
  // Split props to match the following values
  const {
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    markerEnd,
    label,
  } = props;

  // Create a standard path for the edge
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} />
      {/* Add label to the edge (inspired by https://reactflow.dev/examples/edges/edge-label-renderer) */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              background: "white",
              padding: "3px",
              border: "solid #000",
              borderWidth: "thin",
              borderRadius: "4px",
              fontSize: "10px",
              color: "black",
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
