const haha = "haha";
const sol = "sol";
const fa = "fa";
const mi = "mi";
const re = "re";
const CMDZ = "CMDZ";
const by = "by";
const ba = "ba";
const ing = "ing";
const Bo = "Bo";
const R = "R";
const okokokoCommand = "okokokoCommand";
const f = "f";
const e = "e";
const d = "d";
const c = "c";
const b = "b";
const a = "a";
const okCommand = "okCommand";
const niceCommand = "niceCommand";
const C = "C";
const B = "B";
const A = "A";
const someCommand = "someCommand";
const receiptState = "receiptState";
const second = "second";
const first = "first";
const finalRole = "finalRole";
const finalCommand = "finalCommand";
const finalState = "finalState";
const rideFinishedState = "rideFinishedState";
const rideState = "rideState";
const selectedState = "selectedState";
const arrivedState = "arrivedState";
const requestedState = "requestedState";
const Arrived = "Arrived";
const Arrive = "Arrive";
const startRecording = "startRecording";
const makeRequest = "makeRequest";
const Receipt = "Receipt";
const O = "O";
const makeReceipt = "makeReceipt";
const Finished = "Finished";
const Finish = "Finish";
const Recorded = "Recorded";
const Started = "Started";
const Start = "Start";
const Cancelled = "Cancelled";
const Cancel = "Cancel";
const Selected = "Selected";
const Select = "Select";
const Offered = "Offered";
const T = "T";
const Offer = "Offer";
const Requested = "Requested";
const P = "P";
const InitialState = "InitialState";

// Taxi example from "Behavioural Types for Local-First Software"
const protocol = {
  initial: InitialState,
  transitions: [
    {
      source: InitialState,
      target: requestedState,
      label: { cmd: makeRequest, role: P, logType: [Requested] },
    },
    {
      source: requestedState,
      target: requestedState,
      label: { cmd: Offer, role: T, logType: [Offered] },
    },
    {
      source: requestedState,
      target: selectedState,
      label: { cmd: Select, role: P, logType: [Selected] },
    },
    {
      source: selectedState,
      target: arrivedState,
      label: { cmd: Arrive, role: T, logType: [Arrived] },
    },
    {
      source: arrivedState,
      target: rideState,
      label: { cmd: Start, role: P, logType: [Started] },
    },
    {
      source: rideState,
      target: rideState,
      label: { cmd: startRecording, role: T, logType: [Recorded] },
    },
    {
      source: rideState,
      target: rideFinishedState,
      label: { cmd: Finish, role: P, logType: [Finished] },
    },
    {
      source: rideFinishedState,
      target: receiptState,
      label: { cmd: makeReceipt, role: O, logType: [Receipt] },
    },
    {
      source: selectedState,
      target: rideFinishedState,
      label: { cmd: Cancel, role: P, logType: [Cancelled] },
    },
      {source: receiptState, target: "Node 8", label: { cmd: finalCommand, role: finalRole, logType: [first, second]}},
      {source: receiptState, target: "anotherState", label: { cmd: someCommand, role: O, logType: [A, B, C]}},
      {source: "Node 8", target: "Node 10", label: { cmd: niceCommand, role: O, logType: [Bo, ing, ba, by]}},
      {source: "Node 10", target: "Node 11", label: { cmd: okCommand, role: T, logType: [a, b, c, d, e, f]}},
      {source: "Node 11", target: "Node 12", label: { cmd: okokokoCommand, role: R, logType: ["o", "p", "q", "r", "s", "t"]}},
      {source: "Node 8", target: "Node 13", label: { cmd: CMDZ, role: R, logType: ["do", re, mi, fa, sol, haha]}}
],
    metadata: {
          layout:
          {
              nodes: [
              { name: InitialState, x: 166.08130345987445, y: -128.29457133807105 },
              { name: requestedState, x: 145.00000000000003, y: 59.0286632388528 },
              { name: selectedState, x: 145, y: 187.5 },
              { name: arrivedState, x: -32.05652849190567, y: 259.81130569838115 },
              { name: rideState, x: -68.44307251519436, y: 408.64132122976423 },
              { name: rideFinishedState, x: 150.5, y: 531 },
              { name: receiptState, x: 183.30194683948886, y: 732.1266390731727 },
              { name: "Node 8" },
              { name: "anotherState", x: 7.248843807458286, y: 934.8410606624462 }
              ],
              edges: [
              ]
          },
          subscriptions:
          {
              P: [],
              T: [],
              O: [],
              finalRole: []
          }
      }
};