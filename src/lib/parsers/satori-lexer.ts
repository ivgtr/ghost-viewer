type SatoriTokenType = "event" | "dialogue" | "section" | "text";

interface SatoriToken {
	type: SatoriTokenType;
	value: string;
	line: number;
}

function skipBlockComment(
	source: string,
	startPos: number,
	startLine: number,
): { pos: number; line: number } {
	let pos = startPos + 2;
	let line = startLine;
	while (pos < source.length) {
		const ch = source.charAt(pos);
		if (ch === "*" && source.charAt(pos + 1) === "/") {
			pos += 2;
			return { pos, line };
		}
		if (ch === "\n") {
			line++;
		} else if (ch === "\r") {
			line++;
			if (source.charAt(pos + 1) === "\n") pos++;
		}
		pos++;
	}
	return { pos, line };
}

export function lex(source: string): SatoriToken[] {
	const tokens: SatoriToken[] = [];
	let pos = 0;
	let line = 0;

	while (pos < source.length) {
		const lineStart = line;
		let content = "";
		let endedWithNewline = false;

		// Read one line, stripping block comments
		while (pos < source.length) {
			const ch = source.charAt(pos);

			if (ch === "\n") {
				pos++;
				endedWithNewline = true;
				break;
			}
			if (ch === "\r") {
				pos++;
				if (source.charAt(pos) === "\n") pos++;
				endedWithNewline = true;
				break;
			}

			if (ch === "/" && source.charAt(pos + 1) === "*") {
				const result = skipBlockComment(source, pos, line);
				pos = result.pos;
				line = result.line;
				continue;
			}

			content += ch;
			pos++;
		}

		if (endedWithNewline) line++;

		if (content === "" || content.startsWith("//") || content.startsWith("＃")) {
			continue;
		}

		const marker = content.charAt(0);
		if (marker === "＊") {
			tokens.push({ type: "event", value: content.slice(1).trim(), line: lineStart });
		} else if (marker === "：") {
			tokens.push({ type: "dialogue", value: content.slice(1), line: lineStart });
		} else if (marker === "＠" || marker === "＄") {
			tokens.push({ type: "section", value: content.slice(1), line: lineStart });
		} else {
			tokens.push({ type: "text", value: content, line: lineStart });
		}
	}

	return tokens;
}

export type { SatoriToken, SatoriTokenType };
