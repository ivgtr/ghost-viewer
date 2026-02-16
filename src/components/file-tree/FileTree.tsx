import { FileTreeNode } from "@/components/file-tree/FileTreeNode";
import { useFileTreeStore } from "@/stores/file-tree-store";

export function FileTree() {
	const tree = useFileTreeStore((s) => s.tree);

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
					<FileTreeNode key={node.id} node={node} depth={0} />
				))}
			</ul>
		</div>
	);
}
