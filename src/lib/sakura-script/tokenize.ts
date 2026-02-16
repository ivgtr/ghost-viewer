import type { SakuraScriptToken, SakuraScriptTokenType } from "@/types/sakura-script";

function createToken(
	tokenType: SakuraScriptTokenType,
	raw: string,
	value: string,
	offset: number,
): SakuraScriptToken {
	return { tokenType, raw, value, offset };
}

function findClosingBracket(input: string, openPos: number): number {
	let depth = 1;
	for (let i = openPos + 1; i < input.length; i++) {
		if (input[i] === "[") {
			depth++;
		} else if (input[i] === "]") {
			depth--;
			if (depth === 0) return i;
		}
	}
	return -1;
}

function tryParseTag(
	input: string,
	pos: number,
): { token: SakuraScriptToken; nextCursor: number } | null {
	const next = input[pos + 1];
	if (next === undefined) {
		return { token: createToken("unknown", "\\", "\\", pos), nextCursor: pos + 1 };
	}

	// \0, \1 — charSwitch
	if (next === "0" || next === "1") {
		const raw = input.slice(pos, pos + 2);
		return { token: createToken("charSwitch", raw, next, pos), nextCursor: pos + 2 };
	}

	// \s[N] — surface
	if (next === "s") {
		if (input[pos + 2] !== "[") {
			const raw = input.slice(pos, pos + 2);
			return { token: createToken("unknown", raw, raw, pos), nextCursor: pos + 2 };
		}
		const closePos = findClosingBracket(input, pos + 2);
		if (closePos === -1) {
			const raw = input.slice(pos);
			return { token: createToken("unknown", raw, raw, pos), nextCursor: input.length };
		}
		const raw = input.slice(pos, closePos + 1);
		const value = input.slice(pos + 3, closePos);
		return { token: createToken("surface", raw, value, pos), nextCursor: closePos + 1 };
	}

	// \q[label,ID] — choice
	if (next === "q") {
		if (input[pos + 2] !== "[") {
			const raw = input.slice(pos, pos + 2);
			return { token: createToken("unknown", raw, raw, pos), nextCursor: pos + 2 };
		}
		const closePos = findClosingBracket(input, pos + 2);
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
		const closePos = findClosingBracket(input, pos + 2);
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
				const closePos = findClosingBracket(input, pos + 3);
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
			const closePos = findClosingBracket(input, pos + 3);
			if (closePos === -1) {
				const raw = input.slice(pos);
				return { token: createToken("unknown", raw, raw, pos), nextCursor: input.length };
			}
			const raw = input.slice(pos, closePos + 1);
			const value = input.slice(pos + 4, closePos);
			return { token: createToken("wait", raw, value, pos), nextCursor: closePos + 1 };
		}

		// \_ + unknown
		const raw = input.slice(pos, pos + 2);
		return { token: createToken("unknown", raw, raw, pos), nextCursor: pos + 2 };
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

	// \x — wait
	if (next === "x") {
		const raw = input.slice(pos, pos + 2);
		return { token: createToken("wait", raw, "", pos), nextCursor: pos + 2 };
	}

	// \n — marker
	if (next === "n") {
		const raw = input.slice(pos, pos + 2);
		return { token: createToken("marker", raw, "", pos), nextCursor: pos + 2 };
	}

	// \e — marker
	if (next === "e") {
		const raw = input.slice(pos, pos + 2);
		return { token: createToken("marker", raw, "", pos), nextCursor: pos + 2 };
	}

	// unknown tag
	const raw = input.slice(pos, pos + 2);
	return { token: createToken("unknown", raw, raw, pos), nextCursor: pos + 2 };
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
		if (input[cursor] === "\\") {
			flushText(cursor);
			const result = tryParseTag(input, cursor);
			if (result) {
				tokens.push(result.token);
				cursor = result.nextCursor;
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
