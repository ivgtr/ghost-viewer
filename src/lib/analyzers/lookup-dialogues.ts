import type { Dialogue, DicFunction } from "@/types/shiori";

export function lookupDialoguesByFunctionName(name: string, functions: DicFunction[]): Dialogue[] {
	return functions.filter((fn) => fn.name === name).flatMap((fn) => fn.dialogues);
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
		if (dialogueIndex < offset + fn.dialogues.length) {
			const dialogue = fn.dialogues[dialogueIndex - offset];
			if (!dialogue) return null;
			return {
				filePath: fn.filePath,
				startLine: dialogue.startLine,
				endLine: dialogue.endLine,
			};
		}
		offset += fn.dialogues.length;
	}
	return null;
}
