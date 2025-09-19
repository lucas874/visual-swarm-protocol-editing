import { SwarmProtocolType } from "@actyx/machine-check";
import { Events, initialState } from "./warehouse_protocol_util";
import { MachineEvent } from "@actyx/machine-runner";
type PartPayload = {partName: string}
export const part = MachineEvent.design('part').withPayload<PartPayload>()

export const warehouse = {"initial":"initialState","transitions":[{"source":"initialState","target":"1","label":{"cmd":"request","role":"T","logType":["Events.partID.type"]}},{"source":"1","target":"boing","label":{"cmd":"get","role":"FL","logType":["Events.pos.type"]}},{"source":"boing","target":"initialState","label":{"cmd":"deliver","role":"T","logType":["part.type"]}},{"source":"initialState","target":"3","label":{"cmd":"helLo","role":"D","logType":["Events.time.type"]}}]}