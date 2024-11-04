import React from "react";
import {
  BaseEdge,
  BezierEdge,
  EdgeLabelRenderer,
  EdgeProps,
} from "@xyflow/react";

export default function NewEdgeWithLabel(props: EdgeProps) {
  const [value, setValue] = React.useState("");

  const { sourceX, sourceY, targetX, targetY, id, markerEnd, label } = props;

  const handleChange = (event) => {
    setValue(event.target.value);
    // data.onChange(id, event.target.value);
  };

  return (
    <g>
      <path
        d={`M${sourceX},${sourceY} C${sourceX},${sourceY + 50} ${targetX},${
          targetY - 50
        } ${targetX},${targetY}`}
        stroke="#222"
        strokeWidth={2}
        fill="none"
      />
      <foreignObject
        width={80}
        height={40}
        x={(sourceX + targetX) / 2 - 40}
        y={(sourceY + targetY) / 2 - 20}
      >
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder="Label"
          style={{
            width: "100%",
            border: "1px solid #ddd",
            borderRadius: 3,
            padding: 4,
          }}
        />
      </foreignObject>
    </g>
  );
}
