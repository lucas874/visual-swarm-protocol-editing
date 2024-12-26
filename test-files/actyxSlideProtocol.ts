// From Roland Kuhn, used with permission.
// https://docs.google.com/presentation/d/19QxLcPS-zKCULilVfLVd_0-MVTDhixxUxXJfkcl1cME/edit#slide=id.g2f070d7ab69_0_25
import {
  SwarmProtocolType,
  checkProjection,
  checkSwarmProtocol,
} from "@actyx/machine-check";

const protocol: SwarmProtocolType = {
  initial: "Initial",
  transitions: [
    {
      source: "Initial",
      target: "Created",
      label: {
        cmd: "create",
        role: "ForLogisticianManager",
        logType: ["Created"],
      },
    },
    {
      source: "Created",
      target: "Activated",
      label: {
        cmd: "activate",
        role: "ForLogisticianManager",
        logType: ["Activated"],
      },
    },
    {
      source: "Activated",
      target: "Activated",
      label: {
        cmd: "request",
        role: "ForOrderRequester",
        logType: ["Requested"],
      },
    },
    {
      source: "Activated",
      target: "Granted",
      label: {
        cmd: "grant",
        role: "ForOrderRequester",
        logType: ["ApplicationGranted"],
      },
    },
    {
      source: "Granted",
      target: "Assigned",
      label: {
        cmd: "accept",
        role: "ForOrderRequester",
        logType: ["ApplicationAccepted"],
      },
    },
    {
      source: "Assigned",
      target: "RequestStarted",
      label: {
        cmd: "startRequest",
        role: "ForLogisticianTransporter",
        logType: ["RequestStarted"],
      },
    },
    {
      source: "RequestStarted",
      target: "RequestDone",
      label: {
        cmd: "requestDone",
        role: "ForLogisticianTransporter",
        logType: ["RequestDone"],
      },
    },
    {
      source: "RequestDone",
      target: "RequestStarted",
      label: {
        cmd: "startNewRequest",
        role: "ForLogisticianTransporter",
        logType: ["NewRequestStarted"],
      },
    },
    {
      source: "RequestDone",
      target: "Done",
      label: {
        cmd: "done",
        role: "ForLogisticianTransporter",
        logType: ["Done"],
      },
    },
    {
      source: "Activated",
      target: "Failed",
      label: {
        cmd: "revoke",
        role: "ForOrderRequester",
        logType: ["NoApplicationReceived"],
      },
    },
    {
      source: "Granted",
      target: "Failed",
      label: {
        cmd: "abort",
        role: "ForOrderRequester",
        logType: ["ApplicationTimedOut"],
      },
    },
    {
      source: "Assigned",
      target: "Failed",
      label: {
        cmd: "startFailed",
        role: "ForLogisticianTransporter",
        logType: ["RequestStartFailed"],
      },
    },
    {
      source: "Failed",
      target: "Activated",
      label: { cmd: "reset", role: "ForOrderRequester", logType: ["Reset"] },
    },
    {
      source: "RequestStarted",
      target: "Failed",
      label: {
        cmd: "requestFailed",
        role: "ForLogisticianTransporter",
        logType: ["RequestFailed"],
      },
    },
    {
      source: "RequestDone",
      target: "Failed",
      label: {
        cmd: "fail",
        role: "ForLogisticianTransporter",
        logType: ["Failed"],
      },
    },
  ],
};
