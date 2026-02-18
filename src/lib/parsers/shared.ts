import type { Dialogue, DicFunction } from "@/types";

export interface Block {
	name: string;
	startLine: number;
	endLine: number;
	dialogues: Dialogue[];
}

export function isVisibleDialogue(dialogue: Dialogue): boolean {
	return dialogue.tokens.some(
		(t) =>
			t.tokenType === "text" ||
			t.tokenType === "variable" ||
			t.tokenType === "choice" ||
			t.tokenType === "surface",
	);
}

export function buildDicFunction(block: Block, filePath: string): DicFunction {
	return {
		name: block.name,
		filePath,
		startLine: block.startLine,
		endLine: block.endLine,
		dialogues: block.dialogues,
	};
}
