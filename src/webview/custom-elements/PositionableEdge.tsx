import React from "react";
import {
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
  useReactFlow,
} from "@xyflow/react";
import { shallow } from "zustand/shallow";
import useStore, { RFState } from "../store";
import ClickableBaseEdge from "./ClickableBaseEdge";
import "./PositionableEdge.css";

const selector = (state: RFState) => ({
  edges: state.edges,
  setEdges: state.setEdges,
});

export default function PositionableEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
  } = props;

  const reactFlowInstance = useReactFlow();
  const { edges, setEdges } = useStore(selector, shallow);
  const type = data?.type ?? "positionable";
  const positionHandlers = (data?.positionHandlers ?? []) as {
    x: number;
    y: number;
    active: number;
  }[];
  const edgeSegmentsCount = positionHandlers.length + 1;

  let edgeSegments = [];
  for (let i = 0; i < edgeSegmentsCount; i++) {
    let segmentSourceX, segmentSourceY, segmentTargetX, segmentTargetY;

    if (i === 0) {
      segmentSourceX = sourceX;
      segmentSourceY = sourceY;
    } else {
      const handler = positionHandlers[i - 1];
      segmentSourceX = handler.x;
      segmentSourceY = handler.y;
    }

    if (i === edgeSegmentsCount - 1) {
      segmentTargetX = targetX;
      segmentTargetY = targetY;
    } else {
      const handler = positionHandlers[i];
      segmentTargetX = handler.x;
      segmentTargetY = handler.y;
    }

    const [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX: segmentSourceX,
      sourceY: segmentSourceY,
      sourcePosition,
      targetX: segmentTargetX,
      targetY: segmentTargetY,
      targetPosition,
    });

    edgeSegments.push({ edgePath, labelX, labelY });

    // console.log(edgeSegments);
  }

  return (
    <>
      {edgeSegments.map((segment, index) => (
        <ClickableBaseEdge
          key={`edge${id}_segments${index}`}
          id={id}
          path={segment.edgePath}
          markerEnd={markerEnd}
          markerStart={props.markerStart}
          style={style}
          onClick={(event) => {
            const position = reactFlowInstance.screenToFlowPosition({
              x: event.clientX,
              y: event.clientY,
            });

            setEdges(
              edges.map((edge) => {
                if (edge.id === id) {
                  (
                    edge.data.positionHandlers as {
                      x: number;
                      y: number;
                      active: number;
                    }[]
                  ).splice(index, 0, {
                    x: position.x,
                    y: position.y,
                    active: -1,
                  });
                }
                return edge;
              })
            );
          }}
        />
      ))}
      {positionHandlers.map((handler, handlerIndex) => (
        <EdgeLabelRenderer key={`edge${id}_label${handlerIndex}`}>
          <div
            className="nopan positionHandlerContainer"
            style={{
              transform: `translate(-50%, -50%) translate(${handler.x}px, ${handler.y}px)`,
            }}
          >
            <div
              className={`positionHandlerEventContainer ${handler.active} ${
                `${handler.active ?? -1}` !== "-1" ? "active" : ""
              }`}
              data-active={handler.active ?? -1}
              onMouseMove={(event) => {
                let eventTarget: any = event.target;
                let activeEdge = parseInt(eventTarget.dataset.active ?? "-1");

                if (activeEdge === -1) {
                  return;
                }

                const position = reactFlowInstance.screenToFlowPosition({
                  x: event.clientX,
                  y: event.clientY,
                });

                setEdges(
                  edges.map((edge) => {
                    if (edge.id === id) {
                      //   edge.id = Math.random().toString();
                      edge.data.positionHandlers[handlerIndex] = {
                        x: position.x,
                        y: position.y,
                        active: activeEdge,
                      };
                    }
                    return edge;
                  })
                );
              }}
              onMouseUp={() => {
                setEdges(
                  edges.map((edge) => {
                    const handlersLength = (edge.data.positionHandlers as any[])
                      .length;
                    for (let i = 0; i < handlersLength; i++) {
                      edge.data.positionHandlers[i].active = -1;
                    }
                    return edge;
                  })
                );
              }}
            >
              <button
                className="positionHandler"
                data-active={handler.active ?? -1}
                onMouseDown={() => {
                  const edgeIndex = edges.findIndex((edge) => edge.id === id);
                  setEdges(
                    edges.map((edge) => {
                      if (edge.id === id) {
                        edge.data.positionHandlers[handlerIndex].active =
                          edgeIndex;
                      }
                      return edge;
                    })
                  );
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  setEdges(
                    edges.map((edge) => {
                      if (edge.id === id) {
                        edge.id = Math.random().toString();
                        (
                          edge.data.positionHandlers as {
                            x: number;
                            y: number;
                            active: number;
                          }[]
                        ).splice(handlerIndex, 1);
                      }
                      return edge;
                    })
                  );
                }}
              />
            </div>
          </div>
        </EdgeLabelRenderer>
      ))}
    </>
  );
}
