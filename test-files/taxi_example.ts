// Taxi example from "Behavioural Types for Local-First Software"
const protocol: SwarmProtocolType = {
  initial: "1",
  transitions: [
    {
      source: "1",
      target: "2",
      label: { cmd: "Request", role: "P", logType: ["Request"] },
    },
    {
      source: "2",
      target: "2",
      label: { cmd: "Offer", role: "T", logType: ["Offer"] },
    },
    {
      source: "2",
      target: "3",
      label: { cmd: "Select", role: "P", logType: ["Select"] },
    },
    {
      source: "3",
      target: "4",
      label: { cmd: "Arrive", role: "T", logType: ["Arrive"] },
    },
    {
      source: "4",
      target: "5",
      label: { cmd: "Start", role: "P", logType: ["Start"] },
    },
    {
      source: "5",
      target: "5",
      label: { cmd: "Record", role: "T", logType: ["Record"] },
    },
    {
      source: "5",
      target: "6",
      label: { cmd: "Finish", role: "P", logType: ["Finish"] },
    },
    {
      source: "6",
      target: "7",
      label: { cmd: "Receipt", role: "O", logType: ["Receipt"] },
    },
    {
      source: "3",
      target: "6",
      label: { cmd: "Cancel", role: "P", logType: ["Cancel"] },
    },
  ],
};
