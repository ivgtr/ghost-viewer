import type { BodyToken, ClassifiedFunction, ClassifiedProgram, Factor } from "./types";

function classifyStatements(factors: Factor[]): ClassifiedProgram {
	const functions: ClassifiedFunction[] = [];
	let separators = 0;

	let current: ClassifiedFunction | null = null;
	let depth = 0;
	let expectingOpen = false;

	for (const factor of factors) {
		const text = factor.text;

		if (!current) {
			if (text === "--") {
				separators++;
				continue;
			}

			const header = parseFunctionHeader(text, factor.line);
			if (!header) {
				continue;
			}

			current = {
				name: header.name,
				returnType: header.returnType,
				bodyTokens: [],
				line: factor.line,
				endLine: factor.line,
			};
			expectingOpen = true;
			continue;
		}

		if (expectingOpen) {
			if (text !== "{") {
				throw new Error(`Expected function body opener but got "${text}" at line ${factor.line}`);
			}
			expectingOpen = false;
			depth = 1;
			continue;
		}

		if (text === "{") {
			depth++;
			current.bodyTokens.push(makeBodyToken(text, factor.line));
			continue;
		}

		if (text === "}") {
			depth--;
			if (depth < 0) {
				throw new Error(`Unexpected closing brace at line ${factor.line}`);
			}
			if (depth === 0) {
				current.bodyTokens = addSimpleIfBrace(current.bodyTokens);
				current.endLine = factor.line;
				functions.push(current);
				current = null;
				expectingOpen = false;
				continue;
			}
			current.bodyTokens.push(makeBodyToken(text, factor.line));
			continue;
		}

		for (const token of splitBlockStatements(text, factor.line)) {
			current.bodyTokens.push(token);
		}
	}

	if (current) {
		throw new Error(`Unclosed function "${current.name}" at line ${current.line}`);
	}

	return { functions, separators };
}

function parseFunctionHeader(
	text: string,
	line: number,
): { name: string; returnType?: string } | null {
	if (text === "{" || text === "}" || text === "--") {
		return null;
	}
	const cleaned = text.replace(/\s+/gu, " ").trim();
	if (cleaned.length === 0) {
		return null;
	}

	const colonIndex = findTopLevelColon(cleaned);
	if (colonIndex < 0) {
		return { name: cleaned };
	}

	const name = cleaned.slice(0, colonIndex).trim();
	const returnType = cleaned.slice(colonIndex + 1).trim();
	if (name.length === 0) {
		throw new Error(`Invalid function header at line ${line}`);
	}
	return returnType.length > 0 ? { name, returnType } : { name };
}

function findTopLevelColon(text: string): number {
	let inSingle = false;
	let inDouble = false;
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (ch === '"' && !inSingle) {
			inDouble = !inDouble;
			continue;
		}
		if (ch === "'" && !inDouble) {
			inSingle = !inSingle;
			continue;
		}
		if (!inSingle && !inDouble && ch === ":") {
			return i;
		}
	}
	return -1;
}

function makeBodyToken(text: string, line: number): BodyToken {
	return { text, line };
}

function addSimpleIfBrace(tokens: BodyToken[]): BodyToken[] {
	const out: BodyToken[] = [];

	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (!token) {
			continue;
		}

		out.push(token);

		if (!isSimpleBodyControlKeyword(token.text)) {
			continue;
		}

		const next = tokens[i + 1];
		const nextText = next?.text ?? "";
		if (nextText === "{") {
			continue;
		}

		if (!next || nextText === "}" || isElseChainKeyword(nextText)) {
			out.push(makeBodyToken("{", token.line));
			out.push(makeBodyToken("}", token.line));
			continue;
		}

		out.push(makeBodyToken("{", token.line));
		out.push(next);
		out.push(makeBodyToken("}", next.line));
		i++;
	}

	return out;
}

function isSimpleBodyControlKeyword(token: string): boolean {
	const head = firstWord(token);
	return (
		head === "if" || head === "elseif" || head === "else" || head === "when" || head === "others"
	);
}

function isElseChainKeyword(token: string): boolean {
	const head = firstWord(token);
	return head === "elseif" || head === "else" || head === "when" || head === "others";
}

function firstWord(text: string): string {
	const trimmed = text.trimStart();
	const match = /^[^\s]+/u.exec(trimmed);
	return match ? match[0] : "";
}

function splitBlockStatements(text: string, startLine: number): BodyToken[] {
	if (!text.includes("\n") && !text.includes("\r")) {
		return [makeBodyToken(text, startLine)];
	}

	const tokens: BodyToken[] = [];
	const lines = text.split(/\r\n|\n|\r/u);
	for (const [index, line] of lines.entries()) {
		const trimmed = line.trim();
		if (trimmed.length > 0) {
			tokens.push(makeBodyToken(trimmed, startLine + index));
		}
	}
	return tokens;
}

export { classifyStatements };
