import { getCategoryOrder } from "@/lib/analyzers/categorize-event";
import { useState } from "react";

import type { MatchMode } from "@/lib/analyzers/search-catalog";

interface CatalogFilterProps {
	query: string;
	onQueryChange: (query: string) => void;
	matchMode: MatchMode;
	onMatchModeChange: (mode: MatchMode) => void;
	includeBody: boolean;
	onIncludeBodyChange: (includeBody: boolean) => void;
	enabledCategories: Record<string, boolean>;
	onEnabledCategoriesChange: (categories: Record<string, boolean>) => void;
}

const MATCH_MODE_LABELS: Record<MatchMode, string> = {
	partial: "部分一致",
	prefix: "前方一致",
	exact: "完全一致",
};

function isMatchMode(value: string): value is MatchMode {
	return value in MATCH_MODE_LABELS;
}

export function CatalogFilter({
	query,
	onQueryChange,
	matchMode,
	onMatchModeChange,
	includeBody,
	onIncludeBodyChange,
	enabledCategories,
	onEnabledCategoriesChange,
}: CatalogFilterProps) {
	const [isOpen, setIsOpen] = useState(false);
	const categories = getCategoryOrder();

	const allEnabled = categories.every((cat) => enabledCategories[cat] !== false);

	const toggleAll = () => {
		const next: Record<string, boolean> = {};
		const newValue = !allEnabled;
		for (const cat of categories) {
			next[cat] = newValue;
		}
		onEnabledCategoriesChange(next);
	};

	const toggleCategory = (category: string) => {
		onEnabledCategoriesChange({
			...enabledCategories,
			[category]: !enabledCategories[category],
		});
	};

	return (
		<div className="border-b border-zinc-700 px-4 py-2">
			<div className="flex gap-2">
				<input
					type="text"
					placeholder={includeBody ? "イベント名・会話本文で検索..." : "イベント名で検索..."}
					className="min-w-0 flex-1 rounded border border-zinc-600 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-200 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
					value={query}
					onChange={(e) => onQueryChange(e.target.value)}
				/>
				<select
					className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-sm text-zinc-200 focus:border-zinc-500 focus:outline-none"
					value={matchMode}
					onChange={(e) => {
						if (isMatchMode(e.target.value)) onMatchModeChange(e.target.value);
					}}
				>
					{(["partial", "prefix", "exact"] as const).map((value) => (
						<option key={value} value={value}>
							{MATCH_MODE_LABELS[value]}
						</option>
					))}
				</select>
			</div>
			<button
				type="button"
				className="mt-1.5 text-xs text-zinc-400 hover:text-zinc-300"
				onClick={() => setIsOpen(!isOpen)}
			>
				{isOpen ? "▼" : "▶"} フィルター
			</button>
			{isOpen && (
				<div className="mt-1.5 space-y-2">
					<label className="flex items-center gap-2 text-xs text-zinc-300">
						<input
							type="checkbox"
							checked={includeBody}
							onChange={(e) => onIncludeBodyChange(e.target.checked)}
							className="accent-zinc-500"
						/>
						会話本文も検索
					</label>
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1">
						<span className="text-xs text-zinc-400">カテゴリ:</span>
						<button
							type="button"
							className="text-xs text-zinc-400 underline hover:text-zinc-300"
							onClick={toggleAll}
						>
							{allEnabled ? "全解除" : "全選択"}
						</button>
					</div>
					<div className="flex flex-wrap gap-x-3 gap-y-1">
						{categories.map((cat) => (
							<label key={cat} className="flex items-center gap-1 text-xs text-zinc-300">
								<input
									type="checkbox"
									checked={enabledCategories[cat] !== false}
									onChange={() => toggleCategory(cat)}
									className="accent-zinc-500"
								/>
								{cat}
							</label>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
