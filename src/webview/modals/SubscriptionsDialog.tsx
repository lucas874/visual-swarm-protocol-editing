import React, { Dispatch, SetStateAction } from "react";

// https://stackoverflow.com/questions/64729482/typescript-usestate-setstate-in-child-with-argument
export interface SubscriptionsDialogProps {
  setIsDialogOpen: (value: boolean) => void;
  setSubscriptions: (value: Record<string, string[]>) => void;
  subRef: Record<string, string[]>;
}

function SubscriptionsDialog(props: SubscriptionsDialogProps) {
  const { setIsDialogOpen, setSubscriptions, subRef } = props;
  return (
    <div className="overlay" onClick={(event) => setIsDialogOpen(false)}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <h2 className="label">Update subscriptions</h2>
        </div>
        <div className="row">
          <label className="label">
            Choose a role to see its subscriptions. Subscriptions are comma
            separated.
          </label>
        </div>
        {Object.keys(subRef).map((role) => (
          <div className="row">
            <label className="label">{role}</label>
            <input
              className="subscription-input float-right"
              type="text"
              placeholder="No subscriptions"
              onChange={(e) => (subRef[role] = e.target.value.split(", "))}
              defaultValue={subRef[role].join(", ")}
            />
          </div>
        ))}
        <div className="row float-right">
          <button
            className="button-cancel float-right"
            onClick={(event) => setIsDialogOpen(false)}
          >
            Cancel
          </button>
          <button
            className="button-dialog float-right"
            onClick={(e) => {
              setSubscriptions(subRef);
              setIsDialogOpen(false);
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default SubscriptionsDialog;
