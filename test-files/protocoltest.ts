// This protocol was received from the actyx machine-check library, has been modified
// https://github.com/Actyx/machines/blob/master/machine-check/README.md
import { Door, Control, HangarBay } from "./example-proto.js";
import {
  SwarmProtocolType,
  checkProjection,
  checkSwarmProtocol,
} from "@actyx/machine-check";

const swarmProtocol: SwarmProtocolType = {
  initial: "Closed",
  subscriptions: {
    Door: ["closing", "closed", "opening", "opened"],
    Control: ["closing", "closed", "opening", "opened"],
  },
  transitions: [
    {
      source: "Closed",
      target: "Opening",
      label: { cmd: "open", role: "Control", logType: ["Opening"] },
    },
    {
      source: "Opening",
      target: "Opening",
      label: { cmd: "update", role: "Control" },
    },
    {
      source: "Opening",
      target: "Open",
      label: { cmd: "open", role: "Door", logType: ["Open"] },
    },
    {
      source: "Open",
      target: "Closing",
      label: { cmd: "close", role: "Control" },
    },
    {
      source: "Closing",
      target: "Closing",
      label: { cmd: "update", role: "Door" },
    },
    {
      source: "Closing",
      target: "Closed",
      label: { cmd: "close", role: "Door" },
    },
  ],
};

const subscriptions = {
  Control: ["closing", "closed", "opening", "opened"],
  Door: ["closing", "closed", "opening", "opened"],
};
