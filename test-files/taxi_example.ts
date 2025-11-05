// Taxi example from "Behavioural Types for Local-First Software"
const protocol: SwarmProtocolType = {
  initial: "1",
  transitions: [
    {
      source: "1",
      target: "2",
      label: { cmd: "Request", role: "P", logType: ["Request"] },
    },
    {
      source: "2",
      target: "2",
      label: { cmd: "Offer", role: "T", logType: ["Offer"] },
    },
    {
      source: "2",
      target: "3",
      label: { cmd: "Select", role: "P", logType: ["Select"] },
    },
    {
      source: "3",
      target: "4",
      label: { cmd: "Arrive", role: "T", logType: ["Arrive"] },
    },
    {
      source: "4",
      target: "5",
      label: { cmd: "Start", role: "P", logType: ["Start"] },
    },
    {
      source: "5",
      target: "5",
      label: { cmd: "Record", role: "T", logType: ["Record"] },
    },
    {
      source: "5",
      target: "6",
      label: { cmd: "Finish", role: "P", logType: ["Finish"] },
    },
    {
      source: "6",
      target: "7",
      label: { cmd: "Receipt", role: "O", logType: ["Receipt"] },
    },
    {
      source: "3",
      target: "6",
      label: { cmd: "Cancel", role: "P", logType: ["Cancel"] },
    },
  ],
    metadata: {
            layout: 
            {
                nodes: [
                { name: "1", x: 155.2765580111702, y: -443.48520114446205 }, 
                { name: "2", x: 32.56905792738, y: -1.4759173320459809 }, 
                { name: "3", x: 145, y: 187.5 }, 
                { name: "4", x: 75, y: 272.5 }, 
                { name: "5", x: -95.5, y: 497.00000000000006 }, 
                { name: "6", x: 266.1357608034274, y: 789.9546490808219 }, 
                { name: "7", x: 308.74026817547224, y: 1055.2975472628896 }
                ],
                edges: [
                ]
            },
            subscriptions: 
            {
                P: [], 
                T: [], 
                O: []
            }
        }
};
