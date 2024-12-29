import React from "react";

const ClickableBaseEdge = ({
  id,
  path,
  style,
  markerEnd,
  markerStart,
  interactionWidth = 20,
  onContextMenu,
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
        onContextMenu={onContextMenu}
        fill="none"
      />
      {interactionWidth && (
        <path
          className="react-flow__edge-path__interactive"
          d={path}
          fill="none"
          strokeOpacity={0}
          strokeWidth={interactionWidth}
          onContextMenu={onContextMenu}
        />
      )}
    </>
  );
};

ClickableBaseEdge.displayName = "ClickableBaseEdge";

export default ClickableBaseEdge;
