import React from "react";
import useStore, { RFState } from "../store";
import { shallow } from "zustand/shallow";

const selector = (state: RFState) => ({
  updateNodeLabel: state.updateNodeLabel,
  setIsNodeDialogOpen: state.setIsNodeDialogOpen,
});

function NodeLabelDialog({ nodeLabelRef, selectedNodeRef }) {
  const { updateNodeLabel, setIsNodeDialogOpen } = useStore(selector, shallow);

  return (
    <div className="overlay" onClick={(event) => setIsNodeDialogOpen(false)}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <h2 className="label">Rename state</h2>
        </div>
        <div className="row">
          <label className="label">Change the current name of the state</label>
        </div>
        <div className="row">
          <label className="label">Label</label>
          <input
            className="input float-right"
            type="text"
            placeholder="Add label"
            onChange={(e) => (nodeLabelRef = e.target.value)}
            defaultValue={nodeLabelRef}
          />
        </div>
        <div className="row float-right">
          <button
            className="button-cancel float-right"
            onClick={(event) => setIsNodeDialogOpen(false)}
          >
            Cancel
          </button>
          <button
            className="button-dialog float-right"
            onClick={(e) => {
              setIsNodeDialogOpen(false);
              updateNodeLabel(selectedNodeRef.id, nodeLabelRef);
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default NodeLabelDialog;
