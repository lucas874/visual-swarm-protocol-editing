import React from "react";

const ClickableBaseEdge = ({
  id,
  path,
  style,
  markerEnd,
  markerStart,
  interactionWidth = 20,
  onMouseDown,
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
        onMouseDown={onMouseDown}
        fill="none"
      />
      {interactionWidth && (
        <path
          className="react-flow__edge-path__interactive"
          d={path}
          fill="none"
          strokeOpacity={0}
          strokeWidth={interactionWidth}
          onMouseDown={onMouseDown}
        />
      )}
    </>
  );
};

ClickableBaseEdge.displayName = "ClickableBaseEdge";

export default ClickableBaseEdge;
