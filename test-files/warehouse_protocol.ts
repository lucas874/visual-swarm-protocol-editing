import { SwarmProtocolType } from "@actyx/machine-check";
import { Events, initialState } from "./warehouse_protocol_util";
import { MachineEvent } from "@actyx/machine-runner";
type PartPayload = {partName: string}
export const part = MachineEvent.design('part').withPayload<PartPayload>()
const stateReqeuested = '1'
const stateGotPos = '2'
const stateClosed = '3'
const cmdRequest = 'request'
const cmdGet = 'get'
const cmdDeliver = 'deliver'
const cmdClose = 'close'
const T = 'T'
const FL = 'FL'
const D = 'D'

export const warehouse: SwarmProtocolType = {
  initial: initialState,
  transitions: [
    {source: initialState, target: stateReqeuested, label: {cmd: cmdRequest, role: T, logType: [Events.partID.type]}},
    {source: stateReqeuested, target: stateGotPos, label: {cmd: cmdGet, role: FL, logType: [Events.pos.type]}},
    {source: stateGotPos, target: initialState, label: {cmd: cmdDeliver, role: T, logType: [part.type]}},
    {source: initialState, target: stateClosed, label: {cmd: cmdClose, role: D, logType: [Events.time.type]}},
  ]}