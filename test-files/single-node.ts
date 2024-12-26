// Simple protocol containing a single node
const test: SwarmProtocolType = {
  initial: "initial",
  transitions: [
    {
      source: "initial",
      target: "initial",
      label: { cmd: "request", role: "plant" },
    },
  ],
};
