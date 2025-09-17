import * as vscode from "vscode";
import { Occurrence, SwarmProtocolMetadata } from "./types";

const METADATA_KEY = "visual-swarm-protocol-editor.metadata"

// Types representing metadata for workspace
/* interface NodeData {
    name: string,
    x: number,
    y: number
}

interface EdgeData {
    id: string;
    positionHandlers: {
        x: number;
        y: number;
        active: number;
        isLabel: boolean;
    }[];
}

interface SwarmProtocolLayout {
    nodes: NodeData[],
    edges: EdgeData[]
}

interface SwarmProtocolMetadata {
    name: string,
    layout: SwarmProtocolLayout,
    subscriptions: Record<string, string[]>
} */
/* export type NodeLayout = {
  name: string;
  x: number;
  y: number;
};

export type PositionHandler = {
  x: number;
  y: number;
  active: number;
  isLabel: boolean;
};

export type EdgeLayout = {
  id: string;
  positionHandlers: PositionHandler[];
};

export type SwarmProtocolLayout = {
  nodes: NodeLayout[];
  edges: EdgeLayout[];
};

interface SwarmProtocolMetadata {
    name: string,
    layout: SwarmProtocolLayout,
    subscriptions: Record<string, string[]>
} */

interface FileMetadata {
    swarmProtocols: Record<string, SwarmProtocolMetadata>
}

interface WorkspaceMetadata {
    files: Record<string, FileMetadata>
}

// Mostly ChatGPT-generated
export class MetadataStore {
    constructor(private context: vscode.ExtensionContext) {}

    // Get workspace metadata, empty record returned if non-existent
    getAll(): WorkspaceMetadata {
        return this.context.workspaceState.get<WorkspaceMetadata>(METADATA_KEY, {
            files: {}
        });
    }

    // Replace all of workspace metadata
    async setAll(data: WorkspaceMetadata): Promise<void> {
        await this.context.workspaceState.update(METADATA_KEY, data)
    }

    // Get metadata for a single file, empty record returned if entry for file non-existent
    getFile(uri: vscode.Uri): FileMetadata {
        const all = this.getAll()
        return all.files.hasOwnProperty(uri.fsPath) ? all.files[uri.fsPath] : { swarmProtocols: {} }
    }

    // Set metadata for file
    async setFile(uri: vscode.Uri, data: FileMetadata): Promise<void> {
        const all = this.getAll()
        all.files[uri.fsPath] = data
        await this.setAll(all)
    }

    // Delete metadata for a file
    async deleteFile(uri: vscode.Uri): Promise<void> {
        const all = this.getAll()
        delete all.files[uri.fsPath]
        await this.setAll(all)
    }

    // Get some swarm protocol in some file
    getSwarmProtocolMetaData(uri: vscode.Uri, name: string): SwarmProtocolMetadata {
        const file = this.getFile(uri)
        return file.swarmProtocols.hasOwnProperty(name) ? file.swarmProtocols[name] : { layout: {}, subscriptions: {}}
    }

    // Get some swarm protocol in some file
    async setSwarmProtocolMetaData(uri: vscode.Uri, name: string, data: SwarmProtocolMetadata): Promise<void> {
        const file = this.getFile(uri)
        file.swarmProtocols[name] = data
        await this.setFile(uri, file)
    }

    // Aprotocol could have changed since last time visual tool was used and metadata was written
    // The metadata associated with some swarm protocol could then contain info about e.g. nodes
    // that do not exist anymore. Update metadata to reflect current state of protocol.
    async synchronizeStore(uri: vscode.Uri, occurrences: Occurrence[]): Promise<void> {
        //const file = this.getFile(uri)
        const newFileMeta = { swarmProtocols: {} }
        for (const occurrence of occurrences) {
            const meta = this.getSwarmProtocolMetaData(uri, occurrence.name)
            const nodes = new Set(occurrence.swarmProtocol.transitions.flatMap(t => [t.source, t.target]))
            nodes.add(occurrence.swarmProtocol.initial)
            // This is how edge ids are set in App.tsx e.g. on line 285. TODO: change how ids are generated.
            // There could be multiple transitions between same pair.
            const edgeIds = new Set(occurrence.swarmProtocol.transitions.map(t => `${t.source}-${t.target}`))

            const prunedNodes = meta.layout.nodes?.filter(nodeLayout => nodes.has(nodeLayout.name))
            const prunedEdges = meta.layout.edges?.filter(edgeLayout => edgeIds.has(edgeLayout.id))
            if (prunedNodes) {
                meta.layout.nodes = prunedNodes
            }
            if (prunedEdges) {
                meta.layout.edges = prunedEdges
            }
            newFileMeta.swarmProtocols[occurrence.name] = meta
        }

        await this.setFile(uri, newFileMeta)
    }
}