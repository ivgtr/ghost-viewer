import { lex } from "@/lib/parsers/satori-lexer";
import { buildDicFunction } from "@/lib/parsers/shared";
import type { Block } from "@/lib/parsers/shared";
import { tokenize } from "@/lib/sakura-script/tokenize";
import type { DicFunction } from "@/types";

export function parseSatoriDic(text: string, filePath: string): DicFunction[] {
	const tokens = lex(text);
	const results: DicFunction[] = [];
	let current: Block | null = null;

	for (const token of tokens) {
		switch (token.type) {
			case "event": {
				if (current) {
					results.push(buildDicFunction(current, filePath));
				}
				current = {
					name: token.value,
					startLine: token.line,
					endLine: token.line,
					dialogues: [],
				};
				break;
			}
			case "section": {
				if (current) {
					results.push(buildDicFunction(current, filePath));
					current = null;
				}
				break;
			}
			case "dialogue": {
				if (current) {
					const rawText = token.value;
					current.dialogues.push({
						tokens: tokenize(rawText),
						startLine: token.line,
						endLine: token.line,
						rawText,
					});
					current.endLine = token.line;
				}
				break;
			}
			case "text": {
				if (current) {
					current.endLine = token.line;
				}
				break;
			}
		}
	}

	if (current) {
		results.push(buildDicFunction(current, filePath));
	}

	return results;
}
