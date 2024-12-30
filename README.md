# Visual Swarm Protocol Editing

This Visual Studio Code extension is used as a way to visualise, edit and verify elements of the type `SwarmProtocolType` from the [@actyx/machine-runner](https://github.com/Actyx/machines/tree/master/machine-runner) library. This library is part of the GitHub repository from Actyx called [machines](https://github.com/Actyx/machines).

The extension allows the user to visualise a protocol by using the VS Code command palette and using the command `Visualise protocol`. The extension can also be opened using the keybinding Ctrl + Shift + E (Cmd + Shift + E for Mac). The extension will show the flow described in the file, and from here, it is possible to make and save changes. When the protocol is saved, the program will perform a well-formedness check.

## Features

### Creating new states

Once the flow has been visualised, it is possible to create a new state by pressing the button "Add new state" in the top left corner. This will result in a new state appearing near the current flow.

### Creating new transitions

New edges are created by dragging from the input handle of a state to the output handle of a state. Input handles are denoted by the colour red and can only have transitions going into the state. Output handles are denoted by the blue colour, and these can only create outgoing transitions.

> It is possible to drag edges from a red to a blue handle; it will, however, create a transition in the opposite direction.

### Renaming states and transitions

By double-clicking either a state or a transition, it is possible to rename the label of the element. For states, the name of the label can be changed, and it is possible to select this state as the initial state. This will discard any other states as initial states. 

For transitions it is possible to change the command, role or log type of the transition. The command and role are required to follow the syntax of swarm protocols, where transitions are named in the format "command"@"role".

### Moving transitions

To move a transition, right-click on the transition; this will transform the label to a handle and place it where the transition was clicked. It is then possible to drag the handle to move the transition. If more mobility is needed, it is possible to create more handles by right-clicking the transition where the handle should be placed and then dragging the new handle. Handles can be deleted by right-clicking the handle to be removed.

### Deleting states and transitions

An element can be deleted by selecting a state or transition and then pressing the backspace button on the keyboard. The user will be prompted with a dialogue asking if they are sure.

### Autolayout

Pressing the auto layout button moves the states and transitions according to an algorithm. Pressing this button will also ensure that no nodes overlap.

### Changing subscriptions

The subscriptions of a protocol can be added manually as a key in the protocol or by editing them directly in the extension. Pressing the "Subscriptions" button opens a popup where the subscriptions of each role can be edited. Subscriptions are not required.

Below is an example of a protocol containing subscriptions.

```typescript
const protocol: SwarmProtocolType = {
  initial: "idle",
  subscriptions: {
    robot: [ "move", "break", "stop" ],
    other: [ "move", "break", "stop" ]
  },
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

### Saving changes

Changes can be saved by pressing the "Save changes" button or by pressing Ctrl + S on the keyboard (Cmd + S on Mac). The changes will then be reflected in the protocol, but the changes to the file are not saved automatically; this is up to the user. 

When the protocol is saved, a well-formedness check is automatically performed, if subscriptions are included in the protocol. Here, both the well-formedness and other minor formatting errors are checked. If any issues are found, the user is informed, and given the opportunity to fix these issues. Affected elements are highlighted by a red colour. The changes will not be saved if the protocol is not well-formed.
If the protocol does not contain any subscriptions, the well-formedness is not checked. The user will only be warned about duplicated transition labels and unconnected states.

There is no formatting on the new protocol, this is to allow any auto-formatters the user may have installed to format on save.

When the protocol is well-formed, it will be saved along with some layout information, used when the protocol is opened again.

```typescript
const protocol: SwarmProtocolType = {
  initial: "idle",
  layout: {
    nodes: [
      { name: "idle", x: 148.75, y: 37.5 },
      { name: "moving", x: 28.246894750614587, y: 162.5 },
      { name: "breaking", x: 148.75, y: 287.5 },
    ],
    edges: [],
  },
  subscriptions: {
    robot: ["move", "break", "stop"],
    other: ["move", "break", "stop"],
  },
  transitions: [
    {
      source: "idle",
      target: "moving",
      label: { cmd: "move", role: "robot", logType: ["move"] },
    },
    {
      source: "moving",
      target: "breaking",
      label: { cmd: "break", role: "other", logType: ["break"] },
    },
    {
      source: "breaking",
      target: "idle",
      label: { cmd: "stop", role: "robot", logType: ["stop"] },
    },
  ],
};
```

## Requirements

Visual Studio Code v. 1.93.0 or later.

For the visualisation of a protocol to work, a variable must be initialised with the type `SwarmProtocolType`. See the example below.

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

- It is possible to drag a transition going from output to input, but it will create a transition in the opposite direction.
- Transitions and labels may overlap with states. The problem can be solved by dragging states away from each other or dragging labels.
