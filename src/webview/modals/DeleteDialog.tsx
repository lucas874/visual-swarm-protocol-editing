import React from "react";
import useStore, { RFState } from "../store";
import { shallow } from "zustand/shallow";

const selector = (state: RFState) => ({
  deleteNodes: state.deleteNodes,
  deleteEdges: state.deleteEdges,
  setIsDeleteDialogOpen: state.setIsDeleteDialogOpen,
});

function DeleteDialog({ onDeleteRef }) {
  const { deleteNodes, deleteEdges, setIsDeleteDialogOpen } = useStore(
    selector,
    shallow
  );

  return (
    <div className="overlay" onClick={(event) => setIsDeleteDialogOpen(false)}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <h2 className="label">Are you sure you want to delete?</h2>
        </div>
        <div className="row">
          <label className="label">This action cannot be undone</label>
        </div>
        <div className="row float-right">
          <button
            className="button-cancel float-right"
            onClick={(event) => setIsDeleteDialogOpen(false)}
          >
            Cancel
          </button>
          <button
            className="button-dialog-delete float-right"
            onClick={(e) => {
              deleteEdges(onDeleteRef.edges.map((edge) => edge.id));
              deleteNodes(onDeleteRef.nodes.map((node) => node.id));
              setIsDeleteDialogOpen(false);
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default DeleteDialog;
