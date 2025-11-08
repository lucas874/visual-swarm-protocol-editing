import React, { Dispatch, SetStateAction } from "react";
import { Occurrence, SwarmProtocol } from "../../types";
import isIdentifier from "is-identifier";

// https://stackoverflow.com/questions/64729482/typescript-usestate-setstate-in-child-with-argument
export interface CreateNewProtocolProps {
  setIsNewProtocolDialogOpen: (value: boolean) => void;
  sendNewProtocolToExtension: (protocolName: string) => void;
}

function NewProtocolDialog(props: CreateNewProtocolProps) {
  const { setIsNewProtocolDialogOpen, sendNewProtocolToExtension } = props;
  let newProtocolName = ""

  return (
    <div className="overlay" onClick={(event) => setIsNewProtocolDialogOpen(false)}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <h2 className="label">Create new protocol</h2>
        </div>
        {<div className="row" key="newProtocol">
            <input
              className="subscription-input float-right"
              type="text"
              placeholder="Protocol name"
              onChange={(e) => (newProtocolName = e.target.value)}
            />
        </div>}
        <div className="row float-right">
          <button
            className="button-cancel float-right"
            type="button"
            onClick={(event) => setIsNewProtocolDialogOpen(false)}
          >
            Cancel
          </button>
          <button
            className="button-dialog float-right"
            type="button"
            onClick={(e) => {
              // TODO: show error message if invalid protocol name
              if (isIdentifier(newProtocolName)) {
                sendNewProtocolToExtension(newProtocolName)
              }
              setIsNewProtocolDialogOpen(false);
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default NewProtocolDialog;
