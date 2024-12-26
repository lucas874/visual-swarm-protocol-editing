// File from Lucas Clorius. Used with permission.
import { describe, expect, it } from "@jest/globals";
import {
  SwarmProtocolType,
  MachineType,
  checkSwarmProtocol,
} from "@actyx/machine-check";
import { MachineEvent, SwarmProtocol } from "@actyx/machine-runner";
import { Subscription } from "../../../machines/machine-runner/lib/esm/test-utils/mock-runner";

/*
 * example from CoPLaWS slides by Florian Furbach
 *
 */

export namespace Events {
  export const partID = MachineEvent.design("partID").withoutPayload();
  export const part = MachineEvent.design("part").withoutPayload();
  export const position = MachineEvent.design("position").withoutPayload();
  export const time = MachineEvent.design("time").withoutPayload();
  export const car = MachineEvent.design("car").withoutPayload();
}

const G1: SwarmProtocolType = {
  initial: "0",
  transitions: [
    { source: "0", target: "1", label: { cmd: "request", role: "T" } },
    { source: "1", target: "2", label: { cmd: "get", role: "FL" } },
    { source: "3", target: "0", label: { cmd: "deliver", role: "T" } },
    { source: "0", target: "3", label: { cmd: "close", role: "D" } },
  ],
};

const G2: SwarmProtocolType = {
  initial: "0",
  transitions: [
    { source: "0", target: "1", label: { cmd: "request", role: "T" } },
    { source: "1", target: "2", label: { cmd: "deliver", role: "T" } },
    { source: "2", target: "3", label: { cmd: "build", role: "F" } },
  ],
};

const subscription1 = {
  D: [Events.part.type, Events.partID.type, Events.time.type],
  FL: [Events.partID.type, Events.position.type, Events.time.type],
  T: [
    Events.part.type,
    Events.partID.type,
    Events.position.type,
    Events.time.type,
  ],
};

describe("swarmProtocol", () => {
  it("should be well-formed", () => {
    expect(checkSwarmProtocol(G1, subscription1)).toEqual({ type: "OK" });
  });
});
