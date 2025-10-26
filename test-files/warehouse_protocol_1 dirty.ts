import { SwarmProtocolType } from "@actyx/machine-check";
import { Events, initialState } from "./warehouse_protocol_util";
import { MachineEvent } from "@actyx/machine-runner";
type PartPayload = { partName: string }
export const part = MachineEvent.design('part').withPayload<PartPayload>()

// Thes same has warehouse_protocol, but uses the string literal 'time' instead of referring to some defined event
export const warehouse = {
  initial: initialState,
  transitions: [
    { source: initialState, target: 1, label: { cmd: request, role: T, logType: [Events.partID.type] } },
    { source: 1, target: 2, label: { cmd: get, role: FL, logType: [Events.pos.type] } },
    { source: 2, target: initialState, label: { cmd: deliver, role: T, logType: [part.type] } },
    { source: initialState, target: 3, label: { cmd: close, role: D, logType: [time] } },
  ],
  metadata: {
          layout: 
          {
              nodes: [
              { name: initialState, x: -148.87594452313766, y: -289.65949569098757 }, 
              { name: 1, x: -28.163539850088526, y: -130.16858022227973 }, 
              { name: 2, x: -11.619853708974503, y: 35.196583261827584 }, 
              { name: 3, x: -289.3198001343866, y: -69.69588296717959 }
              ],
              edges: [
              ]
          },
          subscriptions: 
          {
              T: [], 
              FL: [], 
              D: []
          }
      }
}

export const warehouse2 = {
  initial: initialState,
  transitions: [
    { source: initialState, target: 1, label: { cmd: boink, role: T, logType: [Events.partID.type] } },
    { source: 1, target: 2, label: { cmd: getz, role: FL, logType: [Events.pos.type] } },
    { source: 2, target: initialState, label: { cmd: boinkver, role: T, logType: [part.type] } },
    { source: initialState, target: 3, label: { cmd: closesss, role: D, logType: [time] } },
      {source: 2, target: Node5, label: { cmd: C, role: r, logType: [t]}}
]
}

export const warehouse3 = {
  initial: initialState,
  transitions: [
    { source: initialState, target: 1, label: { cmd: boink, role: T, logType: [Events.partID.type] } },
    { source: 1, target: 2, label: { cmd: getz, role: FL, logType: [Events.pos.type] } },
    { source: 2, target: initialState, label: { cmd: boinkver, role: T, logType: [part.type] } },
    { source: initialState, target: 3, label: { cmd: closesss, role: D, logType: [time] } },
  ],
  metadata: {
    layout: {
      nodes: [
        { name: initialState, x: 312.5, y: 37.5 },
        { name: '1', x: 11.36998313659359, y: 91.69376053962898 },
        { name: '2', x: 261.25, y: 287.5 },
        { name: '3', x: 312.5, y: 162.5 }],
        edges: []
      },
      subscriptions: { T: [], FL: [], D: [] } }
}

// First transition does not have 'cmd', second does not have a proper label, third does not have an source, final does not have a target
// Really, the others are not either. They refer to identifiers that do not exist, have integers for source and targets. But still
// everything like this parsed as strings so its okay.
export const notValidSwarmProtocol = {
  initial: initialState,
  transitions: [
    { source: initialState, target: 1, label: { role: T, logType: [Events.partID.type] } },
    { source: 1, target: 2, label: "a" },
    { target: initialState, label: { cmd: boinkver, role: T, logType: [part.type] } },
    { source: 3, label: { cmd: closesss, role: D, logType: [time] } },
  ],
  metadata: {
    layout: {
      nodes: [
        { name: initialState, x: 312.5, y: 37.5 },
        { name: '1', x: 11.36998313659359, y: 91.69376053962898 },
        { name: '2', x: 261.25, y: 287.5 },
        { name: '3', x: 312.5, y: 162.5 }],
        edges: []
      },
      subscriptions: { T: [], FL: [], D: [] } }
}

/*

export const kurt: SwarmProtocolType = {initial:'0',layout:{nodes:[{name:'0',x:312.5,y:37.5},{name:'1',x:11.36998313659359,y:91.69376053962898},{name:'2',x:261.25,y:287.5},{name:'3',x:312.5,y:162.5}],edges:[]},subscriptions:{T:[],FL:[],D:[]},transitions:[{source:'0',target:'1',label:{cmd:'request',role:'T',logType:['Events.partID.type']}},{source:'1',target:'2',label:{cmd:'get',role:'FL',logType:['Events.pos.type']}},{source:'2',target:'0',label:{cmd:'deliver',role:'T',logType:['part.type']}},{source:'0',target:'3',label:{cmd:'close',role:'D',logType:['time']}}]}


*/