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
    layout: {
      nodes: [
        {
          name: initialState,
          x: 5,
          y: 5
        },
        {
          name: '1',
          x: 10,
          y: 10
        },
        {
          name: '2',
          x: 15,
          y: 15
        },
        {
          name: '3',
          x: 20,
          y: 20
        }
      ]},
    subscriptions: {
      D: [part.type, Events.partID.type, Events.time.type],
      FL: [Events.partID.type, Events.pos.type, Events.time.type],
      T: [
        part.type,
        Events.partID.type,
        Events.pos.type,
        Events.time.type,
      ],
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
],
    metadata: {
            layout: 
            {
                nodes: [
                { name: initialState, x: 372.24044016069394, y: 147.7786879703334 }, 
                { name: 1, x: 254.5, y: -65 }, 
                { name: 2, x: -212.4549917197644, y: 181.77067060856726 }, 
                { name: 3, x: 130, y: 279.5 }, 
                { name: Node5, x: -120.05737594066684, y: -43.35683038862781 }
                ],
                edges: [
                ]
            },
            subscriptions: 
            {
                T: [], 
                FL: [], 
                D: [], 
                r: []
            }
        }
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