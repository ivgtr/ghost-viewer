import { buildCatalogEntries } from "@/lib/analyzers/build-catalog";
import { getCategoryOrder } from "@/lib/analyzers/categorize-event";
import { toEventDisplayName } from "@/lib/analyzers/event-name";
import { useCatalogStore } from "@/stores/catalog-store";
import { useGhostStore } from "@/stores/ghost-store";
import { useParseStore } from "@/stores/parse-store";
import { useViewStore } from "@/stores/view-store";
import type { CatalogEntry } from "@/types/catalog";
import { useMemo, useState } from "react";
import { CatalogItem } from "./CatalogItem";

export function ConversationCatalog() {
	const parseResult = useParseStore((s) => s.parseResult);
	const isParsing = useParseStore((s) => s.isParsing);
	const parseError = useParseStore((s) => s.parseError);
	const parsedFileCount = useParseStore((s) => s.parsedFileCount);
	const totalFileCount = useParseStore((s) => s.totalFileCount);
	const unsupportedShioriNotice = useGhostStore((s) => s.unsupportedShioriNotice);
	const selectedFunctionName = useCatalogStore((s) => s.selectedFunctionName);
	const selectFunction = useCatalogStore((s) => s.selectFunction);
	const showConversation = useViewStore((s) => s.showConversation);

	const [searchQuery, setSearchQuery] = useState("");

	const entries = useMemo(() => buildCatalogEntries(parseResult?.functions ?? []), [parseResult]);

	const filtered = useMemo(() => {
		if (!searchQuery) return entries;
		const lower = searchQuery.toLowerCase();
		return entries.filter((e) => {
			if (e.name.toLowerCase().includes(lower)) {
				return true;
			}
			return toEventDisplayName(e.name).toLowerCase().includes(lower);
		});
	}, [entries, searchQuery]);

	const grouped = useMemo(() => {
		const categoryOrder = getCategoryOrder();
		const groups = new Map<string, typeof filtered>();
		for (const entry of filtered) {
			const list = groups.get(entry.category);
			if (list) {
				list.push(entry);
			} else {
				groups.set(entry.category, [entry]);
			}
		}
		return categoryOrder
			.map((cat) => ({ category: cat, entries: groups.get(cat) }))
			.filter((g): g is { category: string; entries: CatalogEntry[] } => g.entries !== undefined);
	}, [filtered]);

	const handleItemClick = (name: string) => {
		selectFunction(name);
		showConversation();
	};

	if (isParsing) {
		return (
			<div className="flex h-full items-center justify-center text-zinc-400">
				解析中... {parsedFileCount} / {totalFileCount} ファイル
			</div>
		);
	}

	if (parseError) {
		return <div className="flex h-full items-center justify-center text-red-400">{parseError}</div>;
	}

	if ((!parseResult || entries.length === 0) && unsupportedShioriNotice) {
		return (
			<div className="flex h-full items-center justify-center text-zinc-500">
				{unsupportedShioriNotice}
			</div>
		);
	}

	if (!parseResult || entries.length === 0) {
		return (
			<div className="flex h-full items-center justify-center text-zinc-500">
				NAR/ZIP ファイルを読み込んでください
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<div className="border-b border-zinc-700 px-4 py-2">
				<input
					type="text"
					placeholder="イベント名で検索..."
					className="w-full rounded border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
				/>
			</div>
			<div className="flex-1 overflow-auto">
				{grouped.map((group) => (
					<div key={group.category}>
						<div className="sticky top-0 z-10 border-b border-zinc-700 bg-zinc-800 px-4 py-1.5 text-xs font-semibold text-zinc-400">
							{group.category}
						</div>
						{group.entries.map((entry) => (
							<CatalogItem
								key={entry.name}
								entry={entry}
								selected={entry.name === selectedFunctionName}
								onClick={() => handleItemClick(entry.name)}
							/>
						))}
					</div>
				))}
				{filtered.length === 0 && (
					<div className="flex items-center justify-center py-8 text-zinc-500 text-sm">
						一致するイベントがありません
					</div>
				)}
			</div>
		</div>
	);
}
