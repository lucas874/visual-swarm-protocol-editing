import { SwarmProtocolType } from "@actyx/machine-check";
import { Events, initialState } from "./warehouse_protocol_util";
import { MachineEvent } from "@actyx/machine-runner";
type PartPayload = {partName: string}
export const part = MachineEvent.design('part').withPayload<PartPayload>()

// Thes same has warehouse_protocol, but uses the string literal 'time' instead of referring to some defined event
export const warehouse: SwarmProtocolType = {
  initial: initialState,
  transitions: [
    {source: '0', target: '1', label: {cmd: 'request', role: 'T', logType: [Events.partID.type]}},
    {source: '1', target: '2', label: {cmd: 'get', role: 'FL', logType: [Events.pos.type]}},
    {source: '2', target: '0', label: {cmd: 'deliver', role: 'T', logType: [part.type]}},
    {source: '0', target: '3', label: {cmd: 'close', role: 'D', logType: ['time']}},
  ]}

/*

export const warehouse: SwarmProtocolType = {initial:'0',layout:{nodes:[{name:'0',x:312.5,y:37.5},{name:'1',x:111.5,y:60.5},{name:'2',x:261.25,y:287.5},{name:'3',x:312.5,y:162.5}],edges:[]},subscriptions:{T:[],FL:[],D:[]},transitions:[{source:'0',target:'1',label:{cmd:'request',role:'T',logType:['partID']}},{source:'1',target:'2',label:{cmd:'get',role:'FL',logType:['pos']}},{source:'2',target:'0',label:{cmd:'deliver',role:'T',logType:['part']}},{source:'0',target:'3',label:{cmd:'close',role:'D',logType:['time']}}]}


*/