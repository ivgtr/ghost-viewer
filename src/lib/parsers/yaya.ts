import { buildDicFunction } from "@/lib/parsers/shared";
import type { Block } from "@/lib/parsers/shared";
import { tokenize } from "@/lib/sakura-script/tokenize";
import type { DicFunction } from "@/types";

const FUNC_DEF_RE = /^([\w.]+)\s*(?::\s*\w+\s*)?\{/;

export function countBraces(line: string): { open: number; close: number } {
	let open = 0;
	let close = 0;
	let inString = false;

	for (let i = 0; i < line.length; i++) {
		const ch = line[i];

		if (inString) {
			if (ch === "\\" && i + 1 < line.length) {
				i++;
				continue;
			}
			if (ch === '"') {
				inString = false;
			}
			continue;
		}

		if (ch === "/" && i + 1 < line.length && line[i + 1] === "/") {
			break;
		}

		if (ch === '"') {
			inString = true;
			continue;
		}

		if (ch === "{") {
			open++;
		} else if (ch === "}") {
			close++;
		}
	}

	return { open, close };
}

function stripInlineComment(line: string): string {
	let inString = false;

	for (let i = 0; i < line.length; i++) {
		const ch = line[i];

		if (inString) {
			if (ch === "\\" && i + 1 < line.length) {
				i++;
				continue;
			}
			if (ch === '"') {
				inString = false;
			}
			continue;
		}

		if (ch === "/" && i + 1 < line.length && line[i + 1] === "/") {
			return line.slice(0, i).trimEnd();
		}

		if (ch === '"') {
			inString = true;
		}
	}

	return line;
}

function extractStringContent(s: string): string | null {
	const start = s.indexOf('"');
	if (start === -1) return null;

	let result = "";
	for (let i = start + 1; i < s.length; i++) {
		const ch = s[i];
		if (ch === "\\" && i + 1 < s.length) {
			const next = s[i + 1];
			if (next === '"') {
				result += '"';
				i++;
				continue;
			}
			result += ch + next;
			i++;
			continue;
		}
		if (ch === '"') {
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

	if (stripped.startsWith('"')) {
		target = stripped;
	} else if (/^return\s+"/.test(stripped)) {
		target = stripped.slice(stripped.indexOf('"'));
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
