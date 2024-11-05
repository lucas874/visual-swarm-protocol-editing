import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  EdgeProps,
} from "@xyflow/react";
import { on } from "events";
import React from "react";

// Example from React Flow: https://reactflow.dev/examples/edges/custom-edges
export default function EditableLabelEdge({
  props,
  onLabelChange,
}: {
  props: EdgeProps;
  onLabelChange: any;
}) {
  // Split props to match the following values
  const {
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    id,
    markerEnd,
    label,
  } = props;

  // Create a path for the edge
  const path = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  }).toString();

  return (
    <>
      <BaseEdge path={path} markerEnd={markerEnd} />
      <EdgeLabelRenderer>
        {/* Position the label in the middle of the edge */}
        <div
          style={{
            position: "absolute",
            transform: `translate(${sourceX - 175}px, ${
              (targetY + sourceY) / 2 - 10
            }px)`,
            background: "white",
            padding: "3px",
            borderRadius: "2px",
            fontSize: "10px",
            color: "black",
          }}
        >
          {label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
