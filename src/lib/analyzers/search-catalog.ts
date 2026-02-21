import { toEventDisplayName } from "@/lib/analyzers/event-name";
import type { CatalogEntry } from "@/types/catalog";

export type MatchMode = "partial" | "prefix" | "exact";

export interface CatalogFilter {
	query: string;
	matchMode: MatchMode;
	includeBody: boolean;
	enabledCategories: Record<string, boolean>;
}

function matchText(text: string, query: string, mode: MatchMode): boolean {
	switch (mode) {
		case "partial":
			return text.includes(query);
		case "prefix":
			return text.startsWith(query);
		case "exact":
			return text === query;
	}
}

export function filterCatalogEntries(
	entries: CatalogEntry[],
	filter: CatalogFilter,
): CatalogEntry[] {
	const hasCategoryFilter = Object.values(filter.enabledCategories).some((v) => !v);

	let result = entries;

	if (hasCategoryFilter) {
		result = result.filter((e) => filter.enabledCategories[e.category] !== false);
	}

	if (!filter.query) return result;

	const lower = filter.query.toLowerCase();

	return result.filter((e) => {
		if (matchText(e.name.toLowerCase(), lower, filter.matchMode)) return true;
		if (matchText(toEventDisplayName(e.name).toLowerCase(), lower, filter.matchMode)) return true;
		if (filter.includeBody && matchText(e.searchText.toLowerCase(), lower, filter.matchMode))
			return true;
		return false;
	});
}
