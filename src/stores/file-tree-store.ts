import type { FileTreeNode } from "@/types";
import { createStore } from "./create-store";

interface FileTreeState {
	tree: FileTreeNode[];
	selectedNodeId: string | null;
	expandedNodeIds: Set<string>;
	setTree: (tree: FileTreeNode[]) => void;
	selectNode: (nodeId: string | null) => void;
	toggleNodeExpansion: (nodeId: string) => void;
	reset: () => void;
}

export const useFileTreeStore = createStore<FileTreeState>(
	{
		tree: [],
		selectedNodeId: null,
		expandedNodeIds: new Set<string>(),
	},
	(set, get) => ({
		setTree: (tree) => {
			const expandedNodeIds = new Set<string>();
			for (const node of tree) {
				if (node.kind === "directory") {
					expandedNodeIds.add(node.id);
				}
			}
			set({ tree, expandedNodeIds });
		},
		selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
		toggleNodeExpansion: (nodeId) => {
			const next = new Set(get().expandedNodeIds);
			if (next.has(nodeId)) {
				next.delete(nodeId);
			} else {
				next.add(nodeId);
			}
			set({ expandedNodeIds: next });
		},
	}),
);
