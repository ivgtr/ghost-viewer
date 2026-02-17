type KawariTokenType = "entry" | "crypt_start" | "crypt_end";

interface KawariToken {
	type: KawariTokenType;
	value: string;
	line: number;
}

export function findFirstUnquotedColon(text: string): number {
	let inQuote = false;
	for (let i = 0; i < text.length; i++) {
		const ch = text.charAt(i);
		if (ch === '"') {
			inQuote = !inQuote;
		} else if (ch === ":" && !inQuote) {
			return i;
		}
	}
	return -1;
}

export function lex(source: string): KawariToken[] {
	const tokens: KawariToken[] = [];
	let pos = 0;
	let line = 0;

	while (pos < source.length) {
		const lineStart = line;
		let content = "";
		let endedWithNewline = false;

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

			content += ch;
			pos++;
		}

		if (endedWithNewline) line++;

		if (content === "" || content.startsWith("#")) {
			continue;
		}

		if (content === ":crypt") {
			tokens.push({ type: "crypt_start", value: content, line: lineStart });
		} else if (content === ":endcrypt") {
			tokens.push({ type: "crypt_end", value: content, line: lineStart });
		} else if (findFirstUnquotedColon(content) !== -1) {
			tokens.push({ type: "entry", value: content, line: lineStart });
		}
	}

	return tokens;
}

export type { KawariToken, KawariTokenType };
