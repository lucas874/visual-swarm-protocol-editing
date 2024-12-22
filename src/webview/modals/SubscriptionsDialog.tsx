import React, { Dispatch, SetStateAction } from "react";

// https://stackoverflow.com/questions/64729482/typescript-usestate-setstate-in-child-with-argument
export interface SubscriptionsDialogProps {
  setIsDialogOpen: (value: boolean) => void;
  setSubscriptions: (value: Record<string, string[]>) => void;
  subRef: Record<string, string[]>;
}

function SubscriptionsDialog(props: SubscriptionsDialogProps) {
  const { setIsDialogOpen, setSubscriptions, subRef } = props;

  const subs = JSON.parse(JSON.stringify(subRef));
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
        {Object.keys(subs).map((role) => (
          <div className="row" key={role}>
            <label className="label">{role}</label>
            <input
              className="subscription-input float-right"
              type="text"
              placeholder="No subscriptions"
              onChange={(e) => (subs[role] = e.target.value.split(", "))}
              defaultValue={subs[role].join(", ")}
            />
          </div>
        ))}
        <div className="row float-right">
          <button
            className="button-cancel float-right"
            type="button"
            onClick={(event) => setIsDialogOpen(false)}
          >
            Cancel
          </button>
          <button
            className="button-dialog float-right"
            type="button"
            onClick={(e) => {
              setSubscriptions(subs);
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
