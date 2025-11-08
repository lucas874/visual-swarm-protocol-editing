import React, { Dispatch, SetStateAction } from "react";
import { Occurrence, SwarmProtocol } from "../../types";

// https://stackoverflow.com/questions/64729482/typescript-usestate-setstate-in-child-with-argument
export interface CreateNewProtocolProps {
  setIsNewProtocolDialogOpen: (value: boolean) => void;
  setOccurrences: (occurences: Map<string, Occurrence>) => void;
  occurences: Map<string, Occurrence>;
}

function NewProtocolDialog(props: CreateNewProtocolProps) {
  const { setIsNewProtocolDialogOpen, setOccurrences, occurences } = props;
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
              const newOccurrence = { name: newProtocolName, swarmProtocol: { initial: "initialState", transitions: [] } }
              occurences.set(newProtocolName, newOccurrence)
              setOccurrences(occurences);
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
