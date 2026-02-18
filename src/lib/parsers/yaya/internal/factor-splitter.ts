import type { Factor } from "./types";

function splitFactors(source: string): Factor[] {
	const factors: Factor[] = [];
	let buffer = "";
	let tokenStartLine = 1;
	let line = 1;
	let inSingle = false;
	let inDouble = false;

	function flush(): void {
		const trimmed = buffer.trim();
		if (trimmed.length > 0) {
			factors.push({ text: trimmed, line: tokenStartLine });
		}
		buffer = "";
	}

	for (let i = 0; i < source.length; i++) {
		const ch = source.charAt(i);

		if (ch === "\n") {
			if (buffer.length === 0) {
				tokenStartLine = line + 1;
			}
			buffer += ch;
			line++;
			continue;
		}

		if (ch === '"' && !inSingle) {
			inDouble = !inDouble;
			if (buffer.length === 0) {
				tokenStartLine = line;
			}
			buffer += ch;
			continue;
		}
		if (ch === "'" && !inDouble) {
			inSingle = !inSingle;
			if (buffer.length === 0) {
				tokenStartLine = line;
			}
			buffer += ch;
			continue;
		}

		if (!inSingle && !inDouble && (ch === "{" || ch === "}" || ch === ";")) {
			flush();
			if (ch !== ";") {
				factors.push({ text: ch, line });
			}
			tokenStartLine = line;
			continue;
		}

		if (buffer.trim().length === 0 && !/\s/u.test(ch)) {
			tokenStartLine = line;
		}
		buffer += ch;
	}

	flush();
	return factors;
}

export { splitFactors };
