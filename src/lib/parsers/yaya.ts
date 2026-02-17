import { buildDicFunction } from "@/lib/parsers/shared";
import type { Block } from "@/lib/parsers/shared";
import { tokenize } from "@/lib/sakura-script/tokenize";
import type { DicFunction } from "@/types";

const FUNC_DEF_RE = /^([\w.]+)\s*(?::\s*\w+\s*)?\{/;

// braceDepth === 0 で FUNC_DEF_RE にマッチしうる制御構文キーワード。
// 主な対象は else / do（キーワード直後に { が来る）。
// 他のキーワード（if, while 等）は条件式が介在するため通常マッチしないが、防御的に含める。
const RESERVED_KEYWORDS = new Set([
	"if",
	"else",
	"elseif",
	"while",
	"do",
	"for",
	"foreach",
	"switch",
	"case",
	"break",
	"continue",
]);

function scanCode(line: string, onCodeChar?: (ch: string, index: number) => void): number {
	let quoteChar: string | null = null;
	for (let i = 0; i < line.length; i++) {
		const ch = line.charAt(i);
		if (quoteChar !== null) {
			if (ch === "\\" && i + 1 < line.length) {
				i++;
				continue;
			}
			if (ch === quoteChar) quoteChar = null;
			continue;
		}
		if (ch === "/" && i + 1 < line.length && line[i + 1] === "/") return i;
		if (ch === '"' || ch === "'") {
			quoteChar = ch;
			continue;
		}
		onCodeChar?.(ch, i);
	}
	return line.length;
}

export function countBraces(line: string): { open: number; close: number } {
	let open = 0;
	let close = 0;
	scanCode(line, (ch) => {
		if (ch === "{") open++;
		else if (ch === "}") close++;
	});
	return { open, close };
}

function stripInlineComment(line: string): string {
	const end = scanCode(line);
	return end === line.length ? line : line.slice(0, end).trimEnd();
}

function extractStringContent(s: string): string | null {
	const dq = s.indexOf('"');
	const sq = s.indexOf("'");
	let start: number;
	let quote: string;
	if (dq === -1 && sq === -1) return null;
	if (dq === -1) {
		start = sq;
		quote = "'";
	} else if (sq === -1) {
		start = dq;
		quote = '"';
	} else if (dq < sq) {
		start = dq;
		quote = '"';
	} else {
		start = sq;
		quote = "'";
	}

	let result = "";
	for (let i = start + 1; i < s.length; i++) {
		const ch = s[i];
		if (ch === "\\" && i + 1 < s.length) {
			const next = s[i + 1];
			if (next === quote) {
				result += quote;
				i++;
				continue;
			}
			result += ch + next;
			i++;
			continue;
		}
		if (ch === quote) {
			return result;
		}
		result += ch;
	}

	return null;
}

function extractDialogue(line: string): string | null {
	const stripped = stripInlineComment(line).trim();
	if (stripped === "") return null;

	let target: string | null = null;

	if (stripped.startsWith('"') || stripped.startsWith("'")) {
		target = stripped;
	} else if (/^return\s+["']/.test(stripped)) {
		const dq = stripped.indexOf('"');
		const sq = stripped.indexOf("'");
		let pos: number;
		if (dq === -1) pos = sq;
		else if (sq === -1) pos = dq;
		else pos = Math.min(dq, sq);
		target = stripped.slice(pos);
	}

	if (target === null) return null;

	const content = extractStringContent(target);
	if (content === null || content === "") return null;

	return content;
}

export function parseYayaDic(text: string, filePath: string): DicFunction[] {
	const lines = text.split(/\r?\n/);
	const results: DicFunction[] = [];
	let current: Block | null = null;
	let braceDepth = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] as string;
		const trimmed = line.trim();

		if (trimmed === "" || trimmed.startsWith("#")) {
			continue;
		}

		if (braceDepth === 0) {
			if (trimmed.startsWith("//")) {
				continue;
			}

			const match = FUNC_DEF_RE.exec(trimmed);
			if (match) {
				const name = match[1] as string;
				if (RESERVED_KEYWORDS.has(name)) {
					const braces = countBraces(trimmed);
					braceDepth += braces.open - braces.close;
					continue;
				}
				current = {
					name,
					startLine: i,
					endLine: i,
					dialogues: [],
				};

				const braces = countBraces(trimmed);
				braceDepth += braces.open - braces.close;

				if (braceDepth === 0 && current) {
					const dialogueContent = extractDialogue(trimmed.slice(trimmed.indexOf("{") + 1));
					if (dialogueContent) {
						const tokens = tokenize(dialogueContent);
						current.dialogues.push({
							tokens,
							startLine: i,
							endLine: i,
							rawText: dialogueContent,
						});
					}
					results.push(buildDicFunction(current, filePath));
					current = null;
				}
			}
			continue;
		}

		const braces = countBraces(trimmed);
		braceDepth += braces.open - braces.close;

		if (current) {
			current.endLine = i;

			const dialogueContent = extractDialogue(trimmed);
			if (dialogueContent) {
				const tokens = tokenize(dialogueContent);
				current.dialogues.push({
					tokens,
					startLine: i,
					endLine: i,
					rawText: dialogueContent,
				});
			}

			if (braceDepth === 0) {
				results.push(buildDicFunction(current, filePath));
				current = null;
			}
		}
	}

	return results;
}
