import { FileTreeIcon } from "@/components/file-tree/FileTreeIcon";
import { useFileTreeStore } from "@/stores/file-tree-store";
import { useViewStore } from "@/stores/view-store";
import type { FileTreeNode as FileTreeNodeType } from "@/types";

interface Props {
	node: FileTreeNodeType;
	depth: number;
	registerNodeRef: (nodeId: string, element: HTMLButtonElement | null) => void;
}

export function FileTreeNode({ node, depth, registerNodeRef }: Props) {
	const selectedNodeId = useFileTreeStore((s) => s.selectedNodeId);
	const expandedNodeIds = useFileTreeStore((s) => s.expandedNodeIds);
	const toggleNodeExpansion = useFileTreeStore((s) => s.toggleNodeExpansion);
	const selectNode = useFileTreeStore((s) => s.selectNode);
	const showCode = useViewStore((s) => s.showCode);
	const setJumpContext = useViewStore((s) => s.setJumpContext);

	const isDirectory = node.kind === "directory";
	const isExpanded = isDirectory && expandedNodeIds.has(node.id);
	const isSelected = node.id === selectedNodeId;

	const handleClick = () => {
		if (isDirectory) {
			toggleNodeExpansion(node.id);
		} else {
			selectNode(node.id);
			showCode();
			setJumpContext(null);
		}
	};

	return (
		<li
			role="treeitem"
			aria-expanded={isDirectory ? isExpanded : undefined}
			aria-selected={isSelected}
		>
			<button
				type="button"
				className={`flex w-full items-center gap-1.5 rounded px-1 py-0.5 text-left text-sm hover:bg-zinc-700/50 ${
					isSelected ? "bg-blue-500/20 text-blue-300" : "text-zinc-300"
				}`}
				style={{ paddingLeft: `${depth * 1.25}rem` }}
				onClick={handleClick}
				ref={(element) => registerNodeRef(node.id, element)}
			>
				<FileTreeIcon
					{...(isDirectory
						? { kind: "directory", expanded: isExpanded }
						: { kind: "file", fileKind: node.fileKind })}
				/>
				<span className="truncate">{node.name}</span>
			</button>
			{isDirectory && isExpanded && node.children.length > 0 && (
				<ul>
					{node.children.map((child) => (
						<FileTreeNode
							key={child.id}
							node={child}
							depth={depth + 1}
							registerNodeRef={registerNodeRef}
						/>
					))}
				</ul>
			)}
		</li>
	);
}
