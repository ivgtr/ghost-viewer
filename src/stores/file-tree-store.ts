import type { FileTreeNode } from "@/types";
import { createStore } from "./create-store";

interface FileTreeState {
	tree: FileTreeNode[];
	selectedNodeId: string | null;
	setTree: (tree: FileTreeNode[]) => void;
	selectNode: (nodeId: string | null) => void;
	reset: () => void;
}

export const useFileTreeStore = createStore<FileTreeState>(
	{
		tree: [],
		selectedNodeId: null,
	},
	(set) => ({
		setTree: (tree) => set({ tree }),
		selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
	}),
);
