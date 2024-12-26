// Simple protocol written for the readme
const protocol: SwarmProtocolType = {
  initial: "idle",
  transitions: [
    {
      source: "idle",
      target: "moving",
      label: { cmd: "move", role: "robot" },
    },
    {
      source: "moving",
      target: "breaking",
      label: { cmd: "break", role: "other" },
    },
    {
      source: "breaking",
      target: "idle",
      label: { cmd: "stop", role: "robot" },
    },
  ],
};
