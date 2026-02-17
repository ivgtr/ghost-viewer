import { findFirstUnquotedColon, lex } from "@/lib/parsers/kawari-lexer";
import { buildDicFunction } from "@/lib/parsers/shared";
import { tokenize } from "@/lib/sakura-script/tokenize";
import type { Dialogue, DicFunction } from "@/types";

function splitUnquotedComma(text: string): string[] {
	const parts: string[] = [];
	let current = "";
	let inQuote = false;

	for (let i = 0; i < text.length; i++) {
		const ch = text.charAt(i);
		if (ch === '"') {
			inQuote = !inQuote;
			current += ch;
		} else if (ch === "," && !inQuote) {
			parts.push(current);
			current = "";
		} else {
			current += ch;
		}
	}
	parts.push(current);
	return parts;
}

function parseEntryLine(value: string, line: number): { name: string; dialogues: Dialogue[] } {
	const colonIndex = findFirstUnquotedColon(value);
	const name = value.slice(0, colonIndex).trim();
	const rest = value.slice(colonIndex + 1);
	const parts = splitUnquotedComma(rest);

	const dialogues: Dialogue[] = [];
	for (const part of parts) {
		const rawText = part.trim();
		if (rawText === "") continue;
		dialogues.push({
			rawText,
			tokens: tokenize(rawText),
			startLine: line,
			endLine: line,
		});
	}

	return { name, dialogues };
}

export function parseKawariDic(text: string, filePath: string): DicFunction[] {
	const tokens = lex(text);
	const results: DicFunction[] = [];
	let inCrypt = false;

	for (const token of tokens) {
		if (token.type === "crypt_start") {
			inCrypt = true;
			continue;
		}
		if (token.type === "crypt_end") {
			inCrypt = false;
			continue;
		}
		if (inCrypt) continue;

		const { name, dialogues } = parseEntryLine(token.value, token.line);
		const names = splitUnquotedComma(name);
		for (const n of names) {
			results.push(
				buildDicFunction(
					{
						name: n.trim(),
						startLine: token.line,
						endLine: token.line,
						dialogues,
					},
					filePath,
				),
			);
		}
	}

	return results;
}
