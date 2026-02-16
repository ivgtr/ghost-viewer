import type { CatalogEntry, DicFunction } from "@/types";

const PREVIEW_MAX_LENGTH = 50;

export function buildCatalogEntries(functions: DicFunction[]): CatalogEntry[] {
	const merged = new Map<string, DicFunction>();
	for (const fn of functions) {
		const existing = merged.get(fn.name);
		if (existing) {
			existing.dialogues.push(...fn.dialogues);
		} else {
			merged.set(fn.name, { ...fn, dialogues: [...fn.dialogues] });
		}
	}

	const entries: CatalogEntry[] = [];
	for (const fn of merged.values()) {
		entries.push({
			name: fn.name,
			dialogueCount: fn.dialogues.length,
			preview: buildPreview(fn),
		});
	}

	entries.sort((a, b) => a.name.localeCompare(b.name));
	return entries;
}

function buildPreview(fn: DicFunction): string {
	const first = fn.dialogues[0];
	if (!first) return "";
	const texts: string[] = [];
	for (const token of first.tokens) {
		if (token.tokenType === "text") texts.push(token.value);
	}
	const joined = texts.join("");
	return joined.length > PREVIEW_MAX_LENGTH ? `${joined.slice(0, PREVIEW_MAX_LENGTH)}...` : joined;
}
