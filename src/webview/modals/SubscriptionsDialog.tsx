function SubscriptionsDialog({ setIsDialogOpen, setSubscriptions, subRef }) {
  return (
    <div className="overlay" onClick={setIsDialogOpen(false)}>
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
              onChange={(e) =>
                (subRef.current[role] = e.target.value.split(", "))
              }
              defaultValue={subRef[role].join(", ")}
            />
          </div>
        ))}
        <div className="row float-right">
          <button
            className="button-cancel float-right"
            onClick={setIsDialogOpen(false)}
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
