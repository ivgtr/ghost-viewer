import { isVisibleDialogue } from "@/lib/parsers/shared";
import type { Dialogue, DicFunction } from "@/types/shiori";

export function lookupDialoguesByFunctionName(name: string, functions: DicFunction[]): Dialogue[] {
	return functions.filter((fn) => fn.name === name).flatMap((fn) => getVisibleDialogues(fn));
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
	const matching = functions.filter((fn) => fn.name === functionName);
	let offset = 0;
	for (const fn of matching) {
		const visibleDialogues = getVisibleDialogues(fn);
		if (dialogueIndex < offset + visibleDialogues.length) {
			const dialogue = visibleDialogues[dialogueIndex - offset];
			if (!dialogue) return null;
			return {
				filePath: fn.filePath,
				startLine: dialogue.startLine,
				endLine: dialogue.endLine,
			};
		}
		offset += visibleDialogues.length;
	}
	return null;
}

function getVisibleDialogues(fn: DicFunction): Dialogue[] {
	return fn.dialogues.filter(isVisibleDialogue);
}
