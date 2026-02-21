import { toEventDisplayName } from "@/lib/analyzers/event-name";
import { memo } from "react";

import type { CatalogEntry } from "@/types";

interface CatalogItemProps {
	name: string;
	entry: CatalogEntry;
	selected: boolean;
	onSelect: (name: string) => void;
}

export const CatalogItem = memo(function CatalogItem({
	name,
	entry,
	selected,
	onSelect,
}: CatalogItemProps) {
	return (
		<button
			type="button"
			className={`w-full text-left px-4 py-3 border-b border-zinc-700/50 transition-colors ${
				selected ? "bg-zinc-700/60" : "hover:bg-zinc-800/60"
			}`}
			onClick={() => onSelect(name)}
		>
			<div className="flex items-center justify-between gap-2">
				<span className="text-sm font-medium text-zinc-200 truncate">
					{toEventDisplayName(entry.name)}
				</span>
				<span className="shrink-0 rounded-full bg-zinc-600 px-2 py-0.5 text-xs text-zinc-300">
					{entry.dialogueCount}
				</span>
			</div>
			{entry.preview && <p className="mt-1 text-xs text-zinc-400 truncate">{entry.preview}</p>}
		</button>
	);
});
