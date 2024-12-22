import React from "react";
import useStore, { RFState } from "../store";
import { shallow } from "zustand/shallow";

const selector = (state: RFState) => ({
  updateEdgeLabel: state.updateEdgeLabel,
  setIsEdgeDialogOpen: state.setIsEdgeDialogOpen,
});

function EdgeLabelDialog({
  commandRef,
  roleRef,
  logTypeRef,
  edgeLabelRef,
  selectedEdgeRef,
  sendErrorToParent,
}) {
  const { updateEdgeLabel, setIsEdgeDialogOpen } = useStore(selector, shallow);

  return (
    <div className="overlay" onClick={(event) => setIsEdgeDialogOpen(false)}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <h2 className="label">Rename transition</h2>
        </div>
        <div className="row">
          <label className="label">
            Change the current command and/or role of the transition. A log type
            can optionally be added.
          </label>
        </div>
        <div className="row">
          <label className="label">Command</label>
          <input
            className="input float-right"
            type="text"
            placeholder="Add command"
            onChange={(e) => {
              commandRef = e.target.value;
              edgeLabelRef = commandRef + "@" + roleRef;
            }}
            defaultValue={commandRef}
          />
        </div>
        <div className="row">
          <label className="label">Role</label>
          <input
            className="input"
            type="text"
            placeholder="Add role"
            onChange={(e) => {
              roleRef = e.target.value;
              edgeLabelRef = commandRef + "@" + roleRef;
            }}
            defaultValue={roleRef}
          />
        </div>
        <div className="row">
          <label className="label">Log type (comma separated)</label>
          <input
            className="input"
            type="text"
            placeholder="Add log type"
            onChange={(e) => {
              logTypeRef = e.target.value;
              edgeLabelRef = commandRef + "@" + roleRef;
            }}
            defaultValue={logTypeRef}
          />
        </div>
        <div className="row float-right">
          <button
            className="button-cancel"
            onClick={(event) => setIsEdgeDialogOpen(false)}
          >
            Cancel
          </button>
          <button
            className="button-dialog"
            onClick={(e) => {
              if (!commandRef) {
                sendErrorToParent("noCommand");
              } else if (!roleRef) {
                sendErrorToParent("noRole");
              } else {
                setIsEdgeDialogOpen(false);
                updateEdgeLabel(
                  selectedEdgeRef.id,
                  edgeLabelRef,
                  logTypeRef.split(",")
                );
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

export default EdgeLabelDialog;
