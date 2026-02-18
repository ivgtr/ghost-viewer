import type { SakuraScriptToken, SakuraScriptTokenType } from "@/types/sakura-script";

function createToken(
	tokenType: SakuraScriptTokenType,
	raw: string,
	value: string,
	offset: number,
): SakuraScriptToken {
	return { tokenType, raw, value, offset };
}

function findClosing(input: string, openPos: number, openChar: string, closeChar: string): number {
	let depth = 1;
	for (let i = openPos + 1; i < input.length; i++) {
		if (input[i] === openChar) {
			depth++;
		} else if (input[i] === closeChar) {
			depth--;
			if (depth === 0) return i;
		}
	}
	return -1;
}

function tryConsumeBracket(
	input: string,
	pos: number,
	baseLen: number,
	tokenType: SakuraScriptTokenType,
): { token: SakuraScriptToken; nextCursor: number } | null {
	const bracketStart = pos + baseLen;
	if (input[bracketStart] !== "[") return null;
	const closePos = findClosing(input, bracketStart, "[", "]");
	if (closePos === -1) {
		const raw = input.slice(pos);
		return { token: createToken("unknown", raw, raw, pos), nextCursor: input.length };
	}
	const raw = input.slice(pos, closePos + 1);
	const value = input.slice(bracketStart + 1, closePos);
	return { token: createToken(tokenType, raw, value, pos), nextCursor: closePos + 1 };
}

function handleTagWithDigitOrBracket(
	input: string,
	pos: number,
	tokenType: SakuraScriptTokenType,
): { token: SakuraScriptToken; nextCursor: number } {
	const afterTag = input[pos + 2];
	if (afterTag !== undefined && afterTag >= "0" && afterTag <= "9") {
		const raw = input.slice(pos, pos + 3);
		return { token: createToken(tokenType, raw, afterTag, pos), nextCursor: pos + 3 };
	}
	const bracket = tryConsumeBracket(input, pos, 2, tokenType);
	if (bracket) return bracket;
	const raw = input.slice(pos, pos + 2);
	return { token: createToken("unknown", raw, raw, pos), nextCursor: pos + 2 };
}

function tryParseTag(
	input: string,
	pos: number,
): { token: SakuraScriptToken; nextCursor: number } | null {
	const next = input[pos + 1];
	if (next === undefined) {
		return { token: createToken("unknown", "\\", "\\", pos), nextCursor: pos + 1 };
	}

	// \0〜\9 — charSwitch (ブラケット付きは unknown)
	if (next >= "0" && next <= "9") {
		const bracket = tryConsumeBracket(input, pos, 2, "unknown");
		if (bracket) return bracket;
		const raw = input.slice(pos, pos + 2);
		return { token: createToken("charSwitch", raw, next, pos), nextCursor: pos + 2 };
	}

	// \h = \0, \u = \1 — charSwitch エイリアス
	if (next === "h") {
		const raw = input.slice(pos, pos + 2);
		return { token: createToken("charSwitch", raw, "0", pos), nextCursor: pos + 2 };
	}
	if (next === "u") {
		const raw = input.slice(pos, pos + 2);
		return { token: createToken("charSwitch", raw, "1", pos), nextCursor: pos + 2 };
	}

	// \p[N], \pN — charSwitch
	if (next === "p") return handleTagWithDigitOrBracket(input, pos, "charSwitch");

	// \s[N], \sN — surface
	if (next === "s") return handleTagWithDigitOrBracket(input, pos, "surface");

	// \q[label,ID] — choice
	if (next === "q") {
		if (input[pos + 2] !== "[") {
			const raw = input.slice(pos, pos + 2);
			return { token: createToken("unknown", raw, raw, pos), nextCursor: pos + 2 };
		}
		const closePos = findClosing(input, pos + 2, "[", "]");
		if (closePos === -1) {
			const raw = input.slice(pos);
			return { token: createToken("unknown", raw, raw, pos), nextCursor: input.length };
		}
		const raw = input.slice(pos, closePos + 1);
		const value = input.slice(pos + 3, closePos);
		return { token: createToken("choice", raw, value, pos), nextCursor: closePos + 1 };
	}

	// \![raise,...] — raise / unknown
	if (next === "!") {
		if (input[pos + 2] !== "[") {
			const raw = input.slice(pos, pos + 2);
			return { token: createToken("unknown", raw, raw, pos), nextCursor: pos + 2 };
		}
		const closePos = findClosing(input, pos + 2, "[", "]");
		if (closePos === -1) {
			const raw = input.slice(pos);
			return { token: createToken("unknown", raw, raw, pos), nextCursor: input.length };
		}
		const bracketContent = input.slice(pos + 3, closePos);
		const raw = input.slice(pos, closePos + 1);
		if (bracketContent.startsWith("raise,")) {
			const value = bracketContent.slice(6);
			return { token: createToken("raise", raw, value, pos), nextCursor: closePos + 1 };
		}
		return { token: createToken("unknown", raw, raw, pos), nextCursor: closePos + 1 };
	}

	// \_ prefix — \_a, \_w
	if (next === "_") {
		const third = input[pos + 2];

		// \_a[ID] or \_a (anchor end)
		if (third === "a") {
			if (input[pos + 3] === "[") {
				const closePos = findClosing(input, pos + 3, "[", "]");
				if (closePos === -1) {
					const raw = input.slice(pos);
					return { token: createToken("unknown", raw, raw, pos), nextCursor: input.length };
				}
				const raw = input.slice(pos, closePos + 1);
				const value = input.slice(pos + 4, closePos);
				return { token: createToken("marker", raw, value, pos), nextCursor: closePos + 1 };
			}
			const raw = input.slice(pos, pos + 3);
			return { token: createToken("marker", raw, "", pos), nextCursor: pos + 3 };
		}

		// \_w[N]
		if (third === "w") {
			if (input[pos + 3] !== "[") {
				const raw = input.slice(pos, pos + 3);
				return { token: createToken("unknown", raw, raw, pos), nextCursor: pos + 3 };
			}
			const closePos = findClosing(input, pos + 3, "[", "]");
			if (closePos === -1) {
				const raw = input.slice(pos);
				return { token: createToken("unknown", raw, raw, pos), nextCursor: input.length };
			}
			const raw = input.slice(pos, closePos + 1);
			const value = input.slice(pos + 4, closePos);
			return { token: createToken("wait", raw, value, pos), nextCursor: closePos + 1 };
		}

		// \_ + unknown — 3文字消費 + オプショナルブラケット
		if (third === undefined) {
			const raw = input.slice(pos, pos + 2);
			return { token: createToken("unknown", raw, raw, pos), nextCursor: pos + 2 };
		}
		const bracket = tryConsumeBracket(input, pos, 3, "unknown");
		if (bracket) return bracket;
		const raw = input.slice(pos, pos + 3);
		return { token: createToken("unknown", raw, raw, pos), nextCursor: pos + 3 };
	}

	// \w, \wN — wait
	if (next === "w") {
		const digit = input[pos + 2];
		if (digit !== undefined && digit >= "0" && digit <= "9") {
			const raw = input.slice(pos, pos + 3);
			return { token: createToken("wait", raw, digit, pos), nextCursor: pos + 3 };
		}
		const raw = input.slice(pos, pos + 2);
		return { token: createToken("wait", raw, "", pos), nextCursor: pos + 2 };
	}

	// \x — wait (オプションブラケット対応)
	if (next === "x") {
		const bracket = tryConsumeBracket(input, pos, 2, "wait");
		if (bracket) return bracket;
		const raw = input.slice(pos, pos + 2);
		return { token: createToken("wait", raw, "", pos), nextCursor: pos + 2 };
	}

	// \n, \n[N] — marker
	if (next === "n") {
		if (input[pos + 2] === "[") {
			const closePos = findClosing(input, pos + 2, "[", "]");
			if (closePos !== -1) {
				const raw = input.slice(pos, closePos + 1);
				const value = input.slice(pos + 3, closePos);
				return { token: createToken("marker", raw, value, pos), nextCursor: closePos + 1 };
			}
		}
		const raw = input.slice(pos, pos + 2);
		return { token: createToken("marker", raw, "", pos), nextCursor: pos + 2 };
	}

	// \e, \t — marker
	if (next === "e" || next === "t") {
		const raw = input.slice(pos, pos + 2);
		return { token: createToken("marker", raw, "", pos), nextCursor: pos + 2 };
	}

	// \b[N], \bN — balloon
	if (next === "b") return handleTagWithDigitOrBracket(input, pos, "balloon");

	// \c — marker (オプションブラケット対応)
	if (next === "c") {
		const bracket = tryConsumeBracket(input, pos, 2, "marker");
		if (bracket) return bracket;
		const raw = input.slice(pos, pos + 2);
		return { token: createToken("marker", raw, "", pos), nextCursor: pos + 2 };
	}

	// unknown tag — ブラケットがあれば含めて消費
	const bracket = tryConsumeBracket(input, pos, 2, "unknown");
	if (bracket) return bracket;
	const raw = input.slice(pos, pos + 2);
	return { token: createToken("unknown", raw, raw, pos), nextCursor: pos + 2 };
}

const EVAL_DIRECTIVE_PREFIX = ":eval=:";

function consumeEvalDirective(
	input: string,
	pos: number,
): { token: SakuraScriptToken; nextCursor: number } | null {
	if (!input.startsWith(EVAL_DIRECTIVE_PREFIX, pos)) {
		return null;
	}

	let cursor = pos + EVAL_DIRECTIVE_PREFIX.length;
	let inSingle = false;
	let inDouble = false;
	let parenDepth = 0;
	let bracketDepth = 0;
	let braceDepth = 0;
	let sawStructuredExpression = false;

	while (cursor < input.length) {
		const ch = input[cursor];
		const next = input[cursor + 1];

		if ((inSingle || inDouble) && ch === "\\") {
			cursor += next === undefined ? 1 : 2;
			continue;
		}

		if (!inDouble && ch === "'") {
			inSingle = !inSingle;
			cursor++;
			continue;
		}
		if (!inSingle && ch === '"') {
			inDouble = !inDouble;
			cursor++;
			continue;
		}
		if (inSingle || inDouble) {
			cursor++;
			continue;
		}

		if (ch === "(") {
			parenDepth++;
			sawStructuredExpression = true;
			cursor++;
			continue;
		}
		if (ch === "[") {
			bracketDepth++;
			sawStructuredExpression = true;
			cursor++;
			continue;
		}
		if (ch === "{") {
			braceDepth++;
			sawStructuredExpression = true;
			cursor++;
			continue;
		}
		if (ch === ")") {
			parenDepth = Math.max(0, parenDepth - 1);
			cursor++;
			if (sawStructuredExpression && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
				break;
			}
			continue;
		}
		if (ch === "]") {
			bracketDepth = Math.max(0, bracketDepth - 1);
			cursor++;
			if (sawStructuredExpression && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
				break;
			}
			continue;
		}
		if (ch === "}") {
			braceDepth = Math.max(0, braceDepth - 1);
			cursor++;
			if (sawStructuredExpression && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
				break;
			}
			continue;
		}

		if (!sawStructuredExpression && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
			if (ch === "\\" || ch === "\n" || ch === "\r" || ch === "\t" || ch === " ") {
				break;
			}
		}

		cursor++;
	}

	const raw = input.slice(pos, cursor);
	const value = input.slice(pos + EVAL_DIRECTIVE_PREFIX.length, cursor).trim();
	return {
		token: createToken("directive", raw, value, pos),
		nextCursor: cursor,
	};
}

export function tokenize(input: string): SakuraScriptToken[] {
	const tokens: SakuraScriptToken[] = [];
	let cursor = 0;
	let textStart = -1;

	function flushText(end: number): void {
		if (textStart !== -1) {
			const text = input.slice(textStart, end);
			tokens.push(createToken("text", text, text, textStart));
			textStart = -1;
		}
	}

	while (cursor < input.length) {
		const directive = consumeEvalDirective(input, cursor);
		if (directive) {
			flushText(cursor);
			tokens.push(directive.token);
			cursor = directive.nextCursor;
		} else if (input[cursor] === "\\") {
			flushText(cursor);
			const result = tryParseTag(input, cursor);
			if (result) {
				tokens.push(result.token);
				cursor = result.nextCursor;
			}
		} else if (input[cursor] === "%" && input[cursor + 1] === "(") {
			flushText(cursor);
			const closePos = findClosing(input, cursor + 1, "(", ")");
			if (closePos === -1) {
				tokens.push(createToken("unknown", input.slice(cursor), input.slice(cursor), cursor));
				cursor = input.length;
			} else {
				const raw = input.slice(cursor, closePos + 1);
				const value = input.slice(cursor + 2, closePos);
				tokens.push(createToken("variable", raw, value, cursor));
				cursor = closePos + 1;
			}
		} else {
			if (textStart === -1) {
				textStart = cursor;
			}
			cursor++;
		}
	}

	flushText(cursor);
	return tokens;
}
