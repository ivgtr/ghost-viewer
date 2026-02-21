import { buildCatalogEntries } from "@/lib/analyzers/build-catalog";
import { getCategoryOrder } from "@/lib/analyzers/categorize-event";
import { filterCatalogEntries } from "@/lib/analyzers/search-catalog";
import { useCatalogStore } from "@/stores/catalog-store";
import { useGhostStore } from "@/stores/ghost-store";
import { useParseStore } from "@/stores/parse-store";
import { useViewStore } from "@/stores/view-store";
import { useCallback, useMemo, useState } from "react";
import { CatalogFilter } from "./CatalogFilter";
import { CatalogItem } from "./CatalogItem";

import type { CatalogEntry } from "@/types/catalog";
import type { MatchMode } from "@/lib/analyzers/search-catalog";

function buildInitialCategories(): Record<string, boolean> {
	const categories: Record<string, boolean> = {};
	for (const cat of getCategoryOrder()) {
		categories[cat] = true;
	}
	return categories;
}

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
	const [matchMode, setMatchMode] = useState<MatchMode>("partial");
	const [includeBody, setIncludeBody] = useState(false);
	const [enabledCategories, setEnabledCategories] = useState(buildInitialCategories);

	const entries = useMemo(() => buildCatalogEntries(parseResult?.functions ?? []), [parseResult]);

	const filtered = useMemo(
		() =>
			filterCatalogEntries(entries, {
				query: searchQuery,
				matchMode,
				includeBody,
				enabledCategories,
			}),
		[entries, searchQuery, matchMode, includeBody, enabledCategories],
	);

	const grouped = useMemo(() => {
		const categoryOrder = getCategoryOrder();
		const groups = new Map<string, CatalogEntry[]>();
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

	const handleItemSelect = useCallback(
		(name: string) => {
			selectFunction(name);
			showConversation();
		},
		[selectFunction, showConversation],
	);

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
			<CatalogFilter
				query={searchQuery}
				onQueryChange={setSearchQuery}
				matchMode={matchMode}
				onMatchModeChange={setMatchMode}
				includeBody={includeBody}
				onIncludeBodyChange={setIncludeBody}
				enabledCategories={enabledCategories}
				onEnabledCategoriesChange={setEnabledCategories}
			/>
			<div className="flex-1 overflow-auto">
				{grouped.map((group) => (
					<div key={group.category}>
						<div className="sticky top-0 z-10 border-b border-zinc-700 bg-zinc-800 px-4 py-1.5 text-xs font-semibold text-zinc-400">
							{group.category}
						</div>
						{group.entries.map((entry) => (
							<CatalogItem
								key={entry.name}
								name={entry.name}
								entry={entry}
								selected={entry.name === selectedFunctionName}
								onSelect={handleItemSelect}
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
