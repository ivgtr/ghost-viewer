import { toEventDisplayName } from "@/lib/analyzers/event-name";
import { useFileTreeStore } from "@/stores/file-tree-store";
import { useViewStore } from "@/stores/view-store";
import { TextViewer } from "./TextViewer";

function formatLineRange(startLine: number, endLine: number): string {
	const start = startLine + 1;
	const end = endLine + 1;
	if (start === end) {
		return `${start}行`;
	}
	return `${start}-${end}行`;
}

export function CodeViewerPanel() {
	const selectedNodeId = useFileTreeStore((s) => s.selectedNodeId);
	const jumpContext = useViewStore((s) => s.jumpContext);

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden">
			<div className="border-b border-zinc-700 px-4 py-2">
				{jumpContext ? (
					<div className="min-w-0">
						<p className="truncate text-sm font-medium text-zinc-200">
							{`ジャンプ元: ${toEventDisplayName(jumpContext.functionName)} / バリアント ${jumpContext.variantIndex + 1}`}
						</p>
						<p className="truncate text-xs text-zinc-400">
							{`${jumpContext.filePath} (${formatLineRange(jumpContext.startLine, jumpContext.endLine)})`}
						</p>
					</div>
				) : (
					<div className="min-w-0">
						<p className="truncate text-sm font-medium text-zinc-200">コードビュー</p>
						<p className="truncate text-xs text-zinc-400">{selectedNodeId ?? "ファイル未選択"}</p>
					</div>
				)}
			</div>
			<div className="min-h-0 flex-1">
				<TextViewer />
			</div>
		</div>
	);
}
