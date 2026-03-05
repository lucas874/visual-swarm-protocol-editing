const newInitialState = "newInitialState";
const Helloooo = "Helloooo";
const cD = "cD";
const Node3 = "Node3";
const B = "B";
const cB = "cB";
const R1 = "R1";
const cA = "cA";
const E = "E";
const C = "C";
const A = "A";
const closed = "closed";
const got = "got";
const requested = "requested";
const D = "D";
const clozzzz = "clozzzz";
const request = "request";
const FL = "FL";
const get = "get";
const T = "T";
const deliver = "deliver";
const time = "time";

import { SwarmProtocolType } from "@actyx/machine-check";
import { Events, initialState } from "./warehouse_protocol_util";
import { MachineEvent } from "@actyx/machine-runner";
type PartPayload = { partName: string }
export const part = MachineEvent.design('part').withPayload<PartPayload>()

// Thes same has warehouse_protocol, but uses the string literal 'time' instead of referring to some defined event
export const warehouse = {
            initial: initialState,
            transitions: [
                { source: initialState, target: requested, label: { cmd: request, role: T, logType: [Events.partID.type]} },
                { source: requested, target: got, label: { cmd: get, role: FL, logType: [Events.pos.type]} },
                { source: got, target: initialState, label: { cmd: deliver, role: T, logType: [part.type]} },
                { source: initialState, target: closed, label: { cmd: clozzzz, role: D, logType: [time]} }
            ],
            metadata: 
            {
                layout: 
                {
                    nodes: [
                    { name: initialState, x: 286.5, y: -15 }, 
                    { name: requested, x: 75, y: 105.5 }, 
                    { name: got, x: 226, y: 241.5 }, 
                    { name: closed, x: 453.5, y: 130.5 }
                    ],
                    edges: [
                    ]
                },
                subscriptions: 
                {
                    T: [Events.partID.type, Events.pos.type, part.type, time], 
                    FL: [Events.partID.type, Events.pos.type, time], 
                    D: [Events.partID.type, part.type, time]
                }
            }
        }

namespace SomeNameSpace {
  export const warehouseSomeNameSpace = {
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
                  { name: initialState, x: 75, y: 192.5 },
                  { name: 1, x: 175, y: 18.5 },
                  { name: 2, x: 265, y: 105.5 },
                  { name: 3, x: 75, y: 279.5 },
                  { name: Node5, x: 275, y: 192.5 }
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

}

export const warehouse2 = {
            initial: initialState,
            transitions: [
                { source: initialState, target: "1", label: { cmd: "boink", role: T, logType: [Events.partID.type]} },
                { source: "1", target: "2", label: { cmd: "getz", role: FL, logType: [Events.pos.type]} },
                { source: "2", target: initialState, label: { cmd: "boinkver", role: T, logType: [part.type]} },
                { source: initialState, target: "3", label: { cmd: "closesss", role: D, logType: [time]} }
            ]
        }

export const warehouse3 = {
            initial: newInitialState,
            transitions: [
                { source: initialState, target: "1", label: { cmd: "boink", role: T, logType: [Events.partID.type]} },
                { source: "1", target: "2", label: { cmd: "getz", role: FL, logType: [Events.pos.type]} },
                { source: "2", target: initialState, label: { cmd: "boinkver", role: T, logType: [part.type]} },
                { source: initialState, target: "3", label: { cmd: "closesss", role: D, logType: [time]} },
                { source: "2", target: "Node hehe5", label: { cmd: "da", role: "RRRR", logType: ["ADsA"]} },
                { source: newInitialState, target: initialState, label: { cmd: "dsadad", role: "RAR", logType: ["ASDSS"]} }
            ],
            metadata:
            {
                layout:
                {
                    nodes: [
                    { name: initialState, x: 312.5, y: 37.5 },
                    { name: "1", x: -228.1300168634064, y: 91.19376053962898 },
                    { name: "2", x: 261.25, y: 287.5 },
                    { name: "3", x: 585, y: 192 },
                    { name: "Node hehe5", x: -48.63001686340641, y: 434.34416165504643 },
                    { name: newInitialState, x: 312.9000900620339, y: -178.84584083850282 }
                    ],
                    edges: [
                    ]
                },
                subscriptions:
                {
                    T: [],
                    FL: [],
                    D: [],
                    RRRR: [],
                    RAR: []
                }
            }
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
const myProtocol = {
            initial: initialState,
            transitions: [
                { source: initialState, target: "What", label: { cmd: cA, role: R1, logType: [A]} },
                { source: "What", target: Node3, label: { cmd: cB, role: R1, logType: [B]} },
                { source: "What", target: "Node 4", label: { cmd: "cC", role: "R2", logType: [C]} },
                { source: "Node 4", target: "What", label: { cmd: cD, role: R1, logType: [D]} },
                { source: "Node 4", target: Helloooo, label: { cmd: "cE", role: "R3", logType: [E]} }
            ]
        };
