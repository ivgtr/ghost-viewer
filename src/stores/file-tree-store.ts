import { classifyFileKind } from "@/lib/nar/extract";
import { requestParse } from "@/lib/workers/worker-client";
import type { FileTreeNode } from "@/types";
import { createStore } from "./create-store";
import { useFileContentStore } from "./file-content-store";
import { useGhostStore } from "./ghost-store";
import { useParseStore } from "./parse-store";

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
			set({ selectedNodeId: nodeId });
			if (nodeId) {
				useFileContentStore.getState().decodeFile(nodeId);
				triggerParse(nodeId);
			}
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

function triggerParse(nodeId: string): void {
	if (classifyFileKind(nodeId) !== "dictionary") return;

	const { shioriType } = useGhostStore.getState();
	if (shioriType !== "yaya" && shioriType !== "satori") return;

	const buffer = useFileContentStore.getState().fileContents.get(nodeId);
	if (!buffer) return;

	const parseState = useParseStore.getState();
	parseState.startParse();

	const fileName = nodeId.slice(nodeId.lastIndexOf("/") + 1);

	requestParse({
		fileContent: buffer.slice(0),
		fileName,
		shioriType,
		onProgress: (percent) => useParseStore.getState().updateProgress(percent),
	})
		.then((result) => useParseStore.getState().succeedParse(result))
		.catch((err: unknown) => {
			const message = err instanceof Error ? err.message : "解析に失敗しました";
			useParseStore.getState().failParse(message);
		});
}
