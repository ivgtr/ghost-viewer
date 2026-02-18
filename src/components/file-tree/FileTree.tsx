import { FileTreeNode } from "@/components/file-tree/FileTreeNode";
import { useFileTreeStore } from "@/stores/file-tree-store";
import { useCallback, useEffect, useRef } from "react";

export function FileTree() {
	const tree = useFileTreeStore((s) => s.tree);
	const selectedNodeId = useFileTreeStore((s) => s.selectedNodeId);
	const nodeRefs = useRef(new Map<string, HTMLButtonElement>());

	const registerNodeRef = useCallback((nodeId: string, element: HTMLButtonElement | null) => {
		if (element) {
			nodeRefs.current.set(nodeId, element);
			return;
		}
		nodeRefs.current.delete(nodeId);
	}, []);

	useEffect(() => {
		if (!selectedNodeId) {
			return;
		}
		const selectedNode = nodeRefs.current.get(selectedNodeId);
		if (!selectedNode) {
			return;
		}
		selectedNode.scrollIntoView({ behavior: "smooth", block: "center" });
	}, [selectedNodeId]);

	if (tree.length === 0) {
		return (
			<div className="flex h-full items-center justify-center text-sm text-zinc-500">
				ファイルがありません
			</div>
		);
	}

	return (
		<div className="h-full overflow-y-auto p-2">
			<ul role="tree">
				{tree.map((node) => (
					<FileTreeNode key={node.id} node={node} depth={0} registerNodeRef={registerNodeRef} />
				))}
			</ul>
		</div>
	);
}
