// From an Actyx workshop
// https://github.com/Actyx/workshop-plant-watering-robot/blob/master/src/protocol.ts
import { SwarmProtocolType } from "@actyx/machine-check";
import { MachineEvent, SwarmProtocol } from "@actyx/machine-runner";
import * as z from "zod";
import { Pos } from "./types";

// protocol shape
export const PROTOCOL: SwarmProtocolType = {
  initial: "initial",
  transitions: [
    {
      source: "initial",
      target: "requested",
      label: { cmd: "request", role: "plant", logType: ["request"] },
    },
    {
      source: "requested",
      target: "requested",
      label: { cmd: "offer", role: "robot", logType: ["offer"] },
    },
    {
      source: "requested",
      target: "assigned",
      label: { cmd: "assign", role: "plant", logType: ["assign"] },
    },
    {
      source: "requested",
      target: "failed2",
      label: { cmd: "fail", role: "robot", logType: ["fail"] },
    },
    {
      source: "assigned",
      target: "moving",
      label: { cmd: "start", role: "robot", logType: ["start"] },
    },
    {
      source: "assigned",
      target: "failed2",
      label: { cmd: "fail2", role: "plant", logType: ["fail2"] },
    },
    {
      source: "moving",
      target: "moving",
      label: { cmd: "move", role: "robot", logType: ["move"] },
    },
    {
      source: "moving",
      target: "done",
      label: { cmd: "done", role: "robot", logType: ["done"] },
    },
    {
      source: "moving",
      target: "failed2",
      label: { cmd: "fail3", role: "robot", logType: ["fail3"] },
    },
  ],
};

// events
export namespace Event {
  export const RequestPayload = z.object({
    plantId: z.string(),
    position: Pos,
    reqId: z.string(),
  });
  export type RequestPayloadType = z.TypeOf<typeof RequestPayload>;
  export const Request = MachineEvent.design("request").withZod(RequestPayload);

  export const OfferPayload = z.object({ robotId: z.string(), position: Pos });
  export type OfferPayloadType = z.TypeOf<typeof OfferPayload>;
  export const Offer = MachineEvent.design("offer").withZod(OfferPayload);

  export const AssignPayload = z.object({ robotId: z.string() });
  export type AssignPayloadType = z.TypeOf<typeof AssignPayload>;
  export const Assign = MachineEvent.design("assign").withZod(AssignPayload);

  export const AcceptPayload = z.object({ position: Pos });
  export type AcceptPayloadType = z.TypeOf<typeof AcceptPayload>;
  export const Accept = MachineEvent.design("accept").withZod(AcceptPayload);

  export const MovePayload = z.object({ position: Pos });
  export type MovePayloadType = z.TypeOf<typeof MovePayload>;
  export const Move = MachineEvent.design("move").withZod(MovePayload);

  export const FinishPayload = z.object({ plantId: z.string() });
  export type FinishPayloadType = z.TypeOf<typeof FinishPayload>;
  export const Finish = MachineEvent.design("finish").withZod(FinishPayload);

  export const FailPayload = z.object({ robotId: z.string() });
  export type FailPayloadType = z.TypeOf<typeof FailPayload>;
  export const Fail = MachineEvent.design("fail").withZod(FailPayload);

  export const Fail2Payload = z.object({ robotId: z.string() });
  export type Fail2PayloadType = z.TypeOf<typeof Fail2Payload>;
  export const Fail2 = MachineEvent.design("fail2").withZod(Fail2Payload);

  export const Fail3Payload = z.object({ robotId: z.string() });
  export type Fail3PayloadType = z.TypeOf<typeof Fail3Payload>;
  export const Fail3 = MachineEvent.design("fail3").withZod(Fail3Payload);

  export const All = [
    Request,
    Offer,
    Assign,
    Accept,
    Move,
    Finish,
    Fail,
    Fail2,
    Fail3,
  ] as const;
}

// protocol declaration
export const wateringProtocol = SwarmProtocol.make(
  "wateringProtocol",
  Event.All
);
