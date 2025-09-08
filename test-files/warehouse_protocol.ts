import { SwarmProtocolType } from "@actyx/machine-check";
import { Events, initialState } from "./warehouse_protocol_util";

export const warehouse: SwarmProtocolType = {
  initial: initialState,
  transitions: [
    {source: '0', target: '1', label: {cmd: 'request', role: 'T', logType: ["Events.partID.type"]}},
    {source: '1', target: '2', label: {cmd: 'get', role: 'FL', logType: ["Events.pos.type"]}},
    {source: '2', target: '0', label: {cmd: 'deliver', role: 'T', logType: ["Events.part.type"]}},
    {source: '0', target: '3', label: {cmd: 'close', role: 'D', logType: ["Events.time.type"]}},
  ]}