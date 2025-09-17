import * as vscode from "vscode";
import { SwarmProtocolMetadata } from "./types";

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
    getSwarmProtocolMetaData(uri: vscode.Uri, name: string): SwarmProtocolMetadata | undefined {
        const file = this.getFile(uri)
        return file.swarmProtocols[name]
    }

    // Get some swarm protocol in some file
    async setSwarmProtocolMetaData(uri: vscode.Uri, name: string, data: SwarmProtocolMetadata): Promise<void> {
        const file = this.getFile(uri)
        file.swarmProtocols[name] = data
        await this.setFile(uri, file)
    }
}