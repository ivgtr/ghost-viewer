import type { Dialogue, DicFunction } from "@/types";

export interface Block {
	name: string;
	condition?: string | null;
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
	const dicFunction: DicFunction = {
		name: block.name,
		filePath,
		startLine: block.startLine,
		endLine: block.endLine,
		dialogues: block.dialogues,
	};
	if (block.condition !== undefined) {
		dicFunction.condition = block.condition;
	}
	return dicFunction;
}
