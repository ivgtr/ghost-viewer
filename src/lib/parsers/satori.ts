import { tokenize } from "@/lib/sakura-script/tokenize";
import type { Dialogue, DicFunction } from "@/types";

interface Block {
	name: string;
	startLine: number;
	endLine: number;
	dialogues: Dialogue[];
}

function isComment(line: string): boolean {
	return line.startsWith("//") || line.startsWith("＃");
}

function buildDicFunction(block: Block, filePath: string): DicFunction {
	return {
		name: block.name,
		filePath,
		startLine: block.startLine,
		endLine: block.endLine,
		dialogues: block.dialogues,
	};
}

export function parseSatoriDic(text: string, filePath: string): DicFunction[] {
	const lines = text.split(/\r?\n/);
	const results: DicFunction[] = [];
	let current: Block | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] as string;

		if (line === "" || isComment(line)) {
			continue;
		}

		if (line.startsWith("＊")) {
			if (current) {
				results.push(buildDicFunction(current, filePath));
			}
			current = {
				name: line.slice(1).trim(),
				startLine: i,
				endLine: i,
				dialogues: [],
			};
			continue;
		}

		if (line.startsWith("＠") || line.startsWith("＄")) {
			if (current) {
				results.push(buildDicFunction(current, filePath));
				current = null;
			}
			continue;
		}

		if (line.startsWith("：")) {
			if (current) {
				const rawText = line.slice(1);
				const tokens = tokenize(rawText);
				current.dialogues.push({
					tokens,
					startLine: i,
					endLine: i,
					rawText,
				});
				current.endLine = i;
			}
			continue;
		}

		if (current) {
			current.endLine = i;
		}
	}

	if (current) {
		results.push(buildDicFunction(current, filePath));
	}

	return results;
}
