import { getNodesBounds, getViewportForBounds, Panel } from "@xyflow/react";
import useStore, { RFState } from "../store";
import { shallow } from "zustand/shallow";
import { toPng } from "html-to-image";
import React from "react";

// From: https://reactflow.dev/examples/misc/download-image
function downloadPNG(url) {
  const a = document.createElement("a");

  a.setAttribute("href", url);
  a.setAttribute("download", "image.png");
  a.click();
}

const width = 1024;
const height = 768;

const selector = (state: RFState) => ({
  nodes: state.nodes,
});

function DownloadButton() {
  const { nodes } = useStore(selector, shallow);
  const onClick = () => {
    const bounds = getNodesBounds(nodes);
    const viewPort = getViewportForBounds(bounds, width, height, 1, 2, 2);

    toPng(document.querySelector(".react-flow__viewport") as HTMLElement, {
      backgroundColor: "white",
      width: width,
      height: height,
      style: {
        // width: width,
        // height: height,
        transform: `translate(${viewPort.x}px, ${viewPort.y}px) scale(${viewPort.zoom})`,
      },
    }).then(downloadPNG);
  };

  return (
    // <Panel position="top-right">
    <button onClick={onClick} className="button float-right" type="button">
      Export to PNG
    </button>
    // </Panel>
  );
}

export default DownloadButton;
