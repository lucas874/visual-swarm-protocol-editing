import React from "react";
import useStore, { RFState } from "../store";
import { shallow } from "zustand/shallow";
import { send } from "process";

const selector = (state: RFState) => ({
  updateNodeLabel: state.updateNodeLabel,
  updateInitialNode: state.updateInitialNode,
  setIsNodeDialogOpen: state.setIsNodeDialogOpen,
});

function NodeLabelDialog({ nodeLabelRef, selectedNodeRef, sendErrorToParent }) {
  const { updateNodeLabel, updateInitialNode, setIsNodeDialogOpen } = useStore(
    selector,
    shallow
  );

  let isInitial = selectedNodeRef.data.initial;

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
        <div className="row">
          <label htmlFor="initial" className="label">
            Set as initial state
          </label>
          <input
            className="float-right"
            type="checkbox"
            id="initial"
            name="initial"
            defaultChecked={isInitial}
            onChange={(e) => (isInitial = e.target.checked)}
          />
        </div>
        <div className="row float-right">
          <button
            className="button-cancel float-right"
            type="button"
            onClick={(event) => setIsNodeDialogOpen(false)}
          >
            Cancel
          </button>
          <button
            className="button-dialog float-right"
            type="button"
            onClick={(e) => {
              if (!nodeLabelRef) {
                sendErrorToParent("noNodeLabel");
              } else {
                setIsNodeDialogOpen(false);
                updateNodeLabel(selectedNodeRef.id, nodeLabelRef);
                if (isInitial) {
                  updateInitialNode(selectedNodeRef.id);
                } else {
                  selectedNodeRef.data.initial = false;
                }
              }
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
