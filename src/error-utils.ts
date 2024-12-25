import { checkSwarmProtocol, SwarmProtocolType } from "@actyx/machine-check";
import { SwarmProtocol, Transition } from "./types";

export interface WellFormednessCheck {
  name: string;
  transitions: Transition[];
  nodes: string[];
}

export function checkWellFormedness(
  swarmProtocol: SwarmProtocolType,
  protocol: SwarmProtocol
): { check: WellFormednessCheck; detail: string } {
  let hasSubscriptions = false;
  Object.keys(protocol.subscriptions).map((role) => {
    if (protocol.subscriptions[role].length > 0) {
      hasSubscriptions = true;
    }
  });
  // Check if the protocol is well-formed
  try {
    // If no subscriptions are defined, show a warning message, but save protocol
    if (!hasSubscriptions) {
      return {
        check: {
          name: "OK",
          transitions: [],
          nodes: [],
        },
        detail:
          "Well-formedness not checked. Protocol must have subscriptions to perform check.",
      };
    }

    console.log(protocol.subscriptions);

    const message = checkSwarmProtocol(swarmProtocol, protocol.subscriptions);

    let errorMessage: WellFormednessCheck = {
      name: "highlightEdges",
      transitions: [],
      nodes: [],
    };
    let errorText = "";

    if (message.type === "OK") {
      return {
        check: {
          name: "OK",
          transitions: [],
          nodes: [],
        },
        detail: "Protocol is well-formed.",
      };
    } else if (message.type === "ERROR") {
      let emptyLogType = [];
      for (let error of message.errors) {
        if (error.includes("guard event type")) {
          const logType = error.split(" ")[3];

          errorText = `Protocol has multiple transitions with the log type \"${logType}\". Affected transitions are highlighted in the visual editor.`;
          errorMessage.transitions = findMultipleGuardEvents(logType, protocol);

          break;
        } else if (error.includes("active role does not subscribe")) {
          let transition = error.split(" ")[14];
          let role = transition.split("@")[1].split("<")[0];

          errorText = `Active role (${role}) does not subscribe to guard event. Affected transitions are highlighted in the visual editor.`;
          errorMessage.transitions = findRoleTransition(transition, protocol);

          break;
        } else if (error.includes("subsequently involved role")) {
          let transition = error.split(" ")[11];
          let role = transition.split("@")[1].split("<")[0];

          errorText = `Subsequently involved role (${role}) does not subscribe to a guard event. Affected transitions are highlighted in the visual editor.`;
          errorMessage.transitions = findRoleTransition(transition, protocol);

          break;
        } else if (error.includes("log type must not be empty")) {
          let transition = error.split(" ")[6];
          emptyLogType.push(findRoleTransition(transition, protocol)[0]);
        } else {
          errorText = error;
        }
      }

      if (emptyLogType.length > 0) {
        errorText = `Some transitions have an empty log type. Affected transitions are highlighted in the visual editor.`;
        errorMessage.transitions = emptyLogType;
      }

      return {
        check: errorMessage,
        detail: errorText,
      };
    }
  } catch (error) {
    // In all other cases, show the error message
    return {
      check: {
        name: "error",
        transitions: [],
        nodes: [],
      },
      detail: error.message,
    };
  }
}

export function checkUnconnectedNodes(protocol: SwarmProtocol): string[] {
  let unconnectedNodes = [];
  protocol.layout.nodes.map((node) => {
    if (
      !protocol.transitions.some(
        (transition) =>
          transition.source === node.name || transition.target === node.name
      )
    ) {
      unconnectedNodes.push(node.name);
    }
  });

  return unconnectedNodes;
}

export function checkDuplicatedEdgeLabels(
  protocol: SwarmProtocol
): Transition[] {
  // Create a list of unique edges
  let uniqueLabels: string[] = [];
  let duplicatedLabels: string[] = [];
  let duplicatedEdges: Transition[] = [];

  // Check for duplicated edges
  for (let transition of protocol.transitions) {
    let label = transition.label.cmd + "@" + transition.label.role;
    if (!uniqueLabels.includes(label)) {
      uniqueLabels.push(label);
    } else {
      // Check if the duplicated label was already found
      if (!duplicatedLabels.includes(label)) {
        duplicatedLabels.push(label);
        // Add all transitions with the same label to the duplicatedEdges array
        protocol.transitions.map((t) => {
          if (t.label.cmd + "@" + t.label.role === label) {
            duplicatedEdges.push(t);
          }
        });
      }
    }
  }

  // If the length of the edges array is not equal to the size of the set, there are duplicates
  return duplicatedEdges;
}

export function hasInitial(protocol: SwarmProtocol): boolean {
  return protocol.initial !== "unknown";
}

export function findMultipleGuardEvents(
  logType: string,
  protocol: SwarmProtocol
): Transition[] {
  let guardEvents = protocol.transitions.filter((transition) =>
    transition.label.logType.includes(logType)
  );

  return guardEvents;
}

export function findRoleTransition(
  transition: string,
  protocol: SwarmProtocol
): Transition[] {
  let split = transition.split("--");
  let source = split[0].slice(1, -1);
  let target = split[2].slice(2, -1);

  let RoleTransition = protocol.transitions.find(
    (transition) => transition.source === source && transition.target === target
  );

  return [RoleTransition];
}
