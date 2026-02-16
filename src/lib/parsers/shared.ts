import type { Dialogue, DicFunction } from "@/types";

export interface Block {
	name: string;
	startLine: number;
	endLine: number;
	dialogues: Dialogue[];
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
