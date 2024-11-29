# Visual Swarm Protocol Editing

This Visual Studio Code extension is used as a way to visualise and edit elements of type SwarmProtocolType from the [@actyx/machine-runner](https://github.com/Actyx/machines/tree/master/machine-runner) library. This library is part of the set of libraries from Actyx called [machines](https://github.com/Actyx/machines).

The extension allows the user to visualise a protocol by using the VS Code command palette, and using the command `Visualise protocol`. The extension can also be opened using the keybinding Ctrl + Shift + E (Cmd + Shift + E for mac). The extension will show the flow described in the file, and from here it is possible to make and save changes. Below is an example how a protocol can look in the extension.

![flow-example](feature-images/flow-example.png)

## Features

### Creating new states

Once the flow has been visualised, it is possible to create a new state by pressing the button "Add new state" in the top left corner. This will result in a new state appearing near the current flow. It might be necessary to zoom out a bit to see the new state.

![add-node](feature-images/new-node.png)

### Creating new transitions

New edges are created by dragging from the input handle of a state to the output handle of a node. Input nodes are denoted by the colour red, and can only have transitions going into the state. Output handles are denoted by the blue colour, and these can only create outgoing transitions.

![handles](feature-images/handles.png)

> It is possible to drag edges from a red to a blue handle, it will however create a transition in the opposite direction.

### Renaming states and transitions

By double-clicking either a state or a transition it is possible to rename the label of the element. For states, only a name is required.

![rename-node](feature-images/rename-node.png)

For transitions, a command and role are required, to follow the syntax of the machine-check library. Here transitions are named by command@role.

![rename-edge](feature-images/rename-edge.png)

### Moving transitions

To move a transition, click on the transition, this will transform the label to a handle. It is then possible to drag the handle and move the edge. If more mobility is needed, it is possible to create more handles, by clicking the edge where the handle should be placed, and then dragging the new handle.

### Deleting states and transitions

The element can be deleted by selecting a state or transition and then pressing the backspace button on the keyboard. The user will be prompted with a dialogue asking if they are sure.

![delete](feature-images/delete.png)

### Autolayout

Pressing the auto layout button moves the states and transitions according to an algorithm. Pressing this button will also ensure that no nodes overlap.

### Saving changes

Changes can be saved by pressing the "Save changes" button or by pressing Ctrl + S on the keyboard (Cmd + S on Mac). The changes will then be reflected in the protocol, but the changes to the file are not saved automatically, this is up to the user. There is no formatting on the new protocol, this is to allow any auto-formatters the user may have installed to format on save.

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
- Transitions and labels may overlap with nodes. The problem can be solved by dragging nodes away from each other.
- It is not possible to move edges.

## Release Notes

This version is only meant for testing.

### 0.2.0

Added the possibility of movable edges. Create handles and drag edges, to create a simpler overview of the diagram.

### 0.1.0

The initial release of extension for testing purposes.
