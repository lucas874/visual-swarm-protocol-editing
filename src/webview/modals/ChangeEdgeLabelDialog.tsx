import React, {useState} from "react";
import useStore, { RFState } from "../store";
import { shallow } from "zustand/shallow";

const selector = (state: RFState) => ({
  edges: state.edges,
  updateEdgeLabel: state.updateEdgeLabel,
  setIsEdgeDialogOpen: state.setIsEdgeDialogOpen,
  addVariable: state.addVariable,
  hasVariable: state.hasVariable,
});

function EdgeLabelDialog({
  commandRef,
  roleRef,
  logTypeRef,
  edgeLabelRef,
  selectedEdgeRef,
  sendErrorToParent,
  sendNewRoleToParent,
}) {
  const { edges, updateEdgeLabel, setIsEdgeDialogOpen, addVariable, hasVariable } = useStore(
    selector,
    shallow
  );

  let isCmdNameStringLiteral: boolean = !hasVariable(commandRef);
  let isRoleNameStringLiteral: boolean = !hasVariable(roleRef);
  let isLogTypeStringLiteral: boolean = !hasVariable(logTypeRef.split(",").every((eventType: string) => hasVariable(eventType)));

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
              edgeLabelRef = `${commandRef}@${roleRef}${logTypeRef ? "<" + logTypeRef + ">" : ""}`;
            }}
            defaultValue={commandRef}
          />
        <div>
          <input
            type="checkbox"
            id="isCmdNameStringLiteral"
            name="isCmdNameStringLiteral"
            defaultChecked={isCmdNameStringLiteral}
            onChange={(event) => {
              isCmdNameStringLiteral = (event.target as HTMLInputElement).checked
            }} />
          <label htmlFor="isCmdNameStringLiteral">String literal.</label>
        </div>
        </div>
        <div className="row">
          <label className="label">Role</label>
          <input
            className="input"
            type="text"
            placeholder="Add role"
            onChange={(e) => {
              roleRef = e.target.value;
              edgeLabelRef = `${commandRef}@${roleRef}${logTypeRef ? "<" + logTypeRef + ">" : ""}`;
            }}
            defaultValue={roleRef}
          />
        <div>
          <input
            type="checkbox"
            id="isRoleNameStringLiteral"
            name="isRoleNameStringLiteral"
            defaultChecked={isRoleNameStringLiteral}
            onChange={(event) => {
              isRoleNameStringLiteral = (event.target as HTMLInputElement).checked
            }}
          />
          <label htmlFor="isRoleNameStringLiteral">String literal.</label>
        </div>
        </div>
        <div className="row">
          <label className="label">Log type (comma separated)</label>
          <input
            className="input"
            type="text"
            placeholder="Add log type"
            onChange={(e) => {
              logTypeRef = e.target.value;
              edgeLabelRef = `${commandRef}@${roleRef}${logTypeRef ? "<" + logTypeRef + ">" : ""}`;
            }}
            defaultValue={logTypeRef}
          />
        <div>
          <input
            type="checkbox"
            id="isLogTypeNameStringLiteral"
            name="isLogTypeNameStringLiteral"
            defaultChecked={isLogTypeStringLiteral}
            onChange={(event) => {
              isLogTypeStringLiteral = (event.target as HTMLInputElement).checked
           }}
          />
          <label htmlFor="isLogTypeNameStringLiteral">String literal.</label>
        </div>
        </div>
        <div className="row float-right">
          <button
            className="button-cancel"
            type="button"
            onClick={(event) => setIsEdgeDialogOpen(false)}
          >
            Cancel
          </button>
          <button
            className="button-dialog"
            type="button"
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
                  logTypeRef === "" || logTypeRef === null
                    ? []
                    : logTypeRef.split(",")
                );
                if (!isCmdNameStringLiteral) { addVariable(commandRef) }
                if (!isRoleNameStringLiteral) { addVariable(roleRef) }
                if (!isLogTypeStringLiteral && logTypeRef) { logTypeRef.split(",").forEach((eventType: string) => addVariable(eventType)) }

                // Check if role already exists in protocol, otherwise add it to subscriptions. COME BACK HERE.
                if (
                  !edges.some(
                    (edge) => edge.label?.toString().split("@")[1].split("<")[0] === roleRef
                  )
                ) {
                  sendNewRoleToParent(roleRef);
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

export default EdgeLabelDialog;