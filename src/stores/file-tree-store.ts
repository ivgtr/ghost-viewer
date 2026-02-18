import type { FileTreeNode } from "@/types";
import { createStore } from "./create-store";
import { useFileContentStore } from "./file-content-store";

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
		selectNode: (nodeId) => {
			const prev = get().selectedNodeId;
			if (nodeId) {
				const expandedNodeIds = new Set(get().expandedNodeIds);
				const ancestors = findAncestorDirectoryIds(get().tree, nodeId);
				for (const ancestor of ancestors) {
					expandedNodeIds.add(ancestor);
				}
				set({ selectedNodeId: nodeId, expandedNodeIds });
				if (nodeId !== prev) {
					useFileContentStore.getState().decodeFile(nodeId);
				}
				return;
			}
			set({ selectedNodeId: nodeId });
		},
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

function findAncestorDirectoryIds(tree: FileTreeNode[], targetId: string): string[] {
	return findAncestorDirectoryIdsInNodes(tree, targetId, []) ?? [];
}

function findAncestorDirectoryIdsInNodes(
	nodes: FileTreeNode[],
	targetId: string,
	ancestors: string[],
): string[] | null {
	for (const node of nodes) {
		if (node.id === targetId) {
			return ancestors;
		}
		if (node.kind !== "directory") {
			continue;
		}
		const result = findAncestorDirectoryIdsInNodes(node.children, targetId, [
			...ancestors,
			node.id,
		]);
		if (result) {
			return result;
		}
	}
	return null;
}
