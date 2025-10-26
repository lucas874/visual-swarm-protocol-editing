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
    getFile(fileName: string): FileMetadata {
        const uri = vscode.Uri.file(fileName)
        const all = this.getAll()
        return all.files.hasOwnProperty(uri.fsPath) ? all.files[uri.fsPath] : { swarmProtocols: {} }
    }

    // Set metadata for file
    async setFile(fileName: string, data: FileMetadata): Promise<void> {
        const uri = vscode.Uri.file(fileName)
        const all = this.getAll()
        all.files[uri.fsPath] = data
        await this.setAll(all)
    }

    // Delete metadata for a file
    async deleteFile(fileName: string): Promise<void> {
        const uri = vscode.Uri.file(fileName)
        const all = this.getAll()
        delete all.files[uri.fsPath]
        await this.setAll(all)
    }

    // Get some swarm protocol in some file
    getSwarmProtocolMetaData(fileName: string, name: string): SwarmProtocolMetadata {
        const file = this.getFile(fileName)
        return file.swarmProtocols.hasOwnProperty(name) ? file.swarmProtocols[name] : { layout: {}, subscriptions: {}}
    }

    // Get some swarm protocol in some file
    async setSwarmProtocolMetaData(fileName: string, name: string, data: SwarmProtocolMetadata): Promise<void> {
        const file = this.getFile(fileName)
        file.swarmProtocols[name] = data
        await this.setFile(fileName, file)
    }

    // A protocol could have changed since last time visual tool was used and metadata was written
    // The metadata associated with some swarm protocol could then contain info about e.g. nodes
    // that do not exist anymore. If a protocol has a value for its metadata field (i.e. it is not undefined)
    // this value has priority over data in store and is written. Update metadata to reflect current state of protocol.
    async synchronizeStore(fileName: string, occurrences: Occurrence[]): Promise<void> {
        //const file = this.getFile(uri)
        const newFileMeta = { swarmProtocols: {} }
        for (const occurrence of occurrences) {
            const meta = occurrence.swarmProtocol.metadata ? occurrence.swarmProtocol.metadata : this.getSwarmProtocolMetaData(fileName, occurrence.name)
            const nodes = new Set(occurrence.swarmProtocol.transitions.flatMap(t => [t.source, t.target]))
            nodes.add(occurrence.swarmProtocol.initial)

            const edgeIds = new Set(occurrence.swarmProtocol.transitions.map(t => t.id))

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

        await this.setFile(fileName, newFileMeta)
    }
}