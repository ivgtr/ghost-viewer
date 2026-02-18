import { isVisibleDialogue } from "@/lib/parsers/shared";
import type { CatalogEntry, DicFunction } from "@/types";
import { categorizeEvent } from "./categorize-event";

const PREVIEW_MAX_LENGTH = 50;

export function buildCatalogEntries(functions: DicFunction[]): CatalogEntry[] {
	const merged = new Map<string, DicFunction>();
	for (const fn of functions) {
		const visibleDialogues = fn.dialogues.filter(isVisibleDialogue);
		if (visibleDialogues.length === 0) {
			continue;
		}
		const existing = merged.get(fn.name);
		if (existing) {
			existing.dialogues.push(...visibleDialogues);
		} else {
			merged.set(fn.name, { ...fn, dialogues: [...visibleDialogues] });
		}
	}

	const entries: CatalogEntry[] = [];
	for (const fn of merged.values()) {
		entries.push({
			name: fn.name,
			dialogueCount: fn.dialogues.length,
			preview: buildPreview(fn),
			category: categorizeEvent(fn.name),
		});
	}

	return entries
		.filter((e) => e.dialogueCount > 0)
		.sort((a, b) => b.dialogueCount - a.dialogueCount || a.name.localeCompare(b.name));
}

function buildPreview(fn: DicFunction): string {
	const first = fn.dialogues[0];
	if (!first) return "";
	const texts: string[] = [];
	for (const token of first.tokens) {
		if (token.tokenType === "text") texts.push(token.value);
		else if (token.tokenType === "variable") texts.push(token.raw);
	}
	const joined = texts.join("");
	return joined.length > PREVIEW_MAX_LENGTH ? `${joined.slice(0, PREVIEW_MAX_LENGTH)}...` : joined;
}
