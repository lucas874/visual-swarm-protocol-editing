// From the readme of the machine-check library
// https://github.com/Actyx/machines/blob/master/machine-check/README.md
import { Door, Control, HangarBay } from "./example-proto.js";
import {
  SwarmProtocolType,
  checkProjection,
  checkSwarmProtocol,
} from "@actyx/machine-check";

const swarmProtocol: SwarmProtocolType = {
  initial: "Initial",
  subscriptions: {
    Control: ["closing", "closed", "opening", "opened", "opening2", "closing2"],
    Door: ["closing", "closed", "opening", "opened", "opening2", "closing2"],
  },
  transitions: [
    {
      source: "Closed",
      target: "Opening",
      label: { cmd: "open", role: "Control", logType: ["opening"] },
    },
    {
      source: "Opening",
      target: "Opening",
      label: { cmd: "update", role: "Door", logType: ["opening2"] },
    },
    {
      source: "Opening",
      target: "Open",
      label: { cmd: "open", role: "Door", logType: ["opened"] },
    },
    {
      source: "Open",
      target: "Closing",
      label: { cmd: "close", role: "Control", logType: ["closing"] },
    },
    {
      source: "Closing",
      target: "Closing",
      label: { cmd: "update", role: "Door", logType: ["closing2"] },
    },
    {
      source: "Closing",
      target: "Closed",
      label: { cmd: "close", role: "Door", logType: ["closed"] },
    },
  ],
};

const subscriptions = {
  Control: ["closing", "closed", "opening", "opened"],
  Door: ["closing", "closed", "opening", "opened"],
};
