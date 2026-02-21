import { FileTreeNode } from "@/components/file-tree/FileTreeNode";
import { useNarFileInput } from "@/hooks/use-nar-file-input";
import { useFileTreeStore } from "@/stores/file-tree-store";
import { useGhostStore } from "@/stores/ghost-store";
import { useCallback, useEffect, useRef } from "react";

export function FileTree() {
	const tree = useFileTreeStore((s) => s.tree);
	const selectedNodeId = useFileTreeStore((s) => s.selectedNodeId);
	const fileName = useGhostStore((s) => s.fileName);
	const nodeRefs = useRef(new Map<string, HTMLButtonElement>());
	const { inputRef, accept, handleChange, triggerFileSelect } = useNarFileInput();

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
		<div className="flex h-full flex-col overflow-hidden">
			<div className="flex items-center justify-between border-b border-zinc-700 px-3 py-1.5">
				<span className="truncate text-xs text-zinc-300">{fileName}</span>
				<button
					type="button"
					onClick={triggerFileSelect}
					className="shrink-0 ml-2 text-zinc-400 hover:text-zinc-200"
					title="別のファイルを開く"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
						className="size-4"
						aria-hidden="true"
					>
						<path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6.879a1.5 1.5 0 0 1 1.06.44l4.122 4.12A1.5 1.5 0 0 1 17 7.622V16.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16.5v-13Z" />
					</svg>
				</button>
				<input
					ref={inputRef}
					type="file"
					accept={accept}
					className="hidden"
					onChange={handleChange}
				/>
			</div>
			<div className="flex-1 overflow-y-auto p-2">
				<ul role="tree">
					{tree.map((node) => (
						<FileTreeNode key={node.id} node={node} depth={0} registerNodeRef={registerNodeRef} />
					))}
				</ul>
			</div>
		</div>
	);
}
