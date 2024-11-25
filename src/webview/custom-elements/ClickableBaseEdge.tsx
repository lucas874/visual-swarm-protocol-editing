import React from "react";

const ClickableBaseEdge = ({
  id,
  path,
  style,
  markerEnd,
  markerStart,
  interactionWidth = 20,
  onClick,
}) => {
  return (
    <>
      <path
        className="react-flow__edge-path"
        id={id}
        d={path}
        style={style}
        markerEnd={markerEnd}
        markerStart={markerStart}
        onClick={onClick}
        fill="none"
      />
      {interactionWidth && (
        <path
          className="react-flow__edge-path__interactive"
          d={path}
          fill="none"
          strokeOpacity={0}
          strokeWidth={interactionWidth}
          onClick={onClick}
        />
      )}
    </>
  );
};

ClickableBaseEdge.displayName = "ClickableBaseEdge";

export default ClickableBaseEdge;
