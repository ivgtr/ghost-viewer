import { isVisibleDialogue } from "@/lib/parsers/shared";
import type { Dialogue, DicFunction } from "@/types/shiori";

export function lookupDialoguesByFunctionName(name: string, functions: DicFunction[]): Dialogue[] {
	return flattenVisibleDialogueEntries(name, functions).map((entry) => entry.dialogue);
}

interface SourceLocation {
	filePath: string;
	startLine: number;
	endLine: number;
}

export function lookupSourceLocation(
	functionName: string,
	dialogueIndex: number,
	functions: DicFunction[],
): SourceLocation | null {
	const entry = flattenVisibleDialogueEntries(functionName, functions)[dialogueIndex];
	if (!entry) {
		return null;
	}
	return {
		filePath: entry.filePath,
		startLine: entry.dialogue.startLine,
		endLine: entry.dialogue.endLine,
	};
}

export function lookupDialogueCondition(
	functionName: string,
	dialogueIndex: number,
	functions: DicFunction[],
): string | null {
	const entry = flattenVisibleDialogueEntries(functionName, functions)[dialogueIndex];
	if (!entry) {
		return null;
	}
	const condition = entry.condition?.trim();
	if (!condition) {
		return null;
	}
	return condition;
}

interface VisibleDialogueEntry {
	dialogue: Dialogue;
	filePath: string;
	condition: string | null;
}

function flattenVisibleDialogueEntries(
	functionName: string,
	functions: DicFunction[],
): VisibleDialogueEntry[] {
	const entries: VisibleDialogueEntry[] = [];
	for (const fn of functions) {
		if (fn.name !== functionName) {
			continue;
		}
		const condition = fn.condition ?? null;
		for (const dialogue of fn.dialogues) {
			if (!isVisibleDialogue(dialogue)) {
				continue;
			}
			entries.push({
				dialogue,
				filePath: fn.filePath,
				condition,
			});
		}
	}
	return entries;
}
