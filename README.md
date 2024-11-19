# Visual Swarm Protocol Editing

This Visual Studio Code extension is used as a way to visualise and edit elements of type SwarmProtocolType from the [@actyx/machine-runner](https://github.com/Actyx/machines/tree/master/machine-runner) library. This library is part of the set of libraries from Actyx called [machines](https://github.com/Actyx/machines).

The extension allows the user to visualise a protocol by using the VS Code command palette, and using the command `Visualise protocol`. The extension can also be opened using the keybinding Ctrl + Shift + E (Cmd + Shift + E for mac). The extension will show the flow described in the file, and from here it is possible to make and save changes.

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

![flow-example](feature-images/flow-example.png)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

For the visualisation of a protocol to work, it is important that a variable is initialised with the type `SwarmProtocolType`. See the example below.

```typescript
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
```

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 0.1.0

Initial realease of extension for testing purposes.
