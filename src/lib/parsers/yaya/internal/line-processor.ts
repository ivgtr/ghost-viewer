interface CommentStripResult {
	text: string;
	inBlockComment: boolean;
}

interface HeredocState {
	quote: "'" | '"';
	lines: string[];
}

function processLineSource(source: string): string {
	const normalized = source.charCodeAt(0) === 0xfeff ? source.slice(1) : source;
	const physicalLines = normalized.split(/\r\n|\n|\r/);

	let inBlockComment = false;
	let heredoc: HeredocState | null = null;
	let logicalLine = "";
	const output: string[] = [];

	for (const rawLine of physicalLines) {
		let currentLine = rawLine;
		if (heredoc) {
			const line = rawLine.trimStart();
			const terminator = `${heredoc.quote}>>`;
			const terminatorIndex = line.indexOf(terminator);
			if (terminatorIndex >= 0) {
				const inlineContent = line.slice(0, terminatorIndex);
				if (inlineContent.length > 0) {
					heredoc.lines.push(inlineContent);
				}

				const content = heredoc.lines.join("\n");
				logicalLine += JSON.stringify(content);
				heredoc = null;

				const tail = line.slice(terminatorIndex + terminator.length).trim();
				currentLine = tail;
			} else {
				heredoc.lines.push(line);
				output.push("");
				continue;
			}
		}

		const stripped = stripCommentsOutsideQuotes(currentLine, inBlockComment);
		inBlockComment = stripped.inBlockComment;

		let line = stripped.text;
		if (line.trimStart().startsWith("#")) {
			line = "";
		}

		if (line.trim().length === 0) {
			if (logicalLine.length > 0 && !logicalLine.endsWith("\n")) {
				output.push(logicalLine);
				logicalLine = "";
			} else {
				output.push("");
			}
			continue;
		}

		const heredocQuote = detectHeredocOpenAtLineEnd(line);
		if (heredocQuote) {
			line = removeTrailingHeredocMarker(line, heredocQuote);
			heredoc = { quote: heredocQuote, lines: [] };
		}

		const joined = logicalLine.length > 0 ? `${logicalLine}${line}` : line;
		const trimmedRight = joined.replace(/[ \t]+$/u, "");
		if (trimmedRight.endsWith("/")) {
			logicalLine = trimmedRight.slice(0, -1);
			output.push("");
			continue;
		}

		logicalLine = "";
		output.push(trimmedRight);
	}

	if (heredoc) {
		const content = heredoc.lines.join("\n");
		logicalLine += JSON.stringify(content);
	}

	if (logicalLine.length > 0) {
		output.push(logicalLine);
	}

	return output.join("\n");
}

function stripCommentsOutsideQuotes(
	line: string,
	startInBlockComment: boolean,
): CommentStripResult {
	let inBlockComment = startInBlockComment;
	let inSingle = false;
	let inDouble = false;
	let result = "";

	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		const next = line[i + 1] ?? "";

		if (inBlockComment) {
			if (ch === "*" && next === "/") {
				inBlockComment = false;
				i++;
			}
			continue;
		}

		if (!inSingle && !inDouble) {
			if (ch === "/" && next === "*") {
				inBlockComment = true;
				i++;
				continue;
			}
			if (ch === "/" && next === "/") {
				break;
			}
		}

		if (ch === '"' && !inSingle) {
			inDouble = !inDouble;
			result += ch;
			continue;
		}
		if (ch === "'" && !inDouble) {
			inSingle = !inSingle;
			result += ch;
			continue;
		}

		result += ch;
	}

	return { text: result, inBlockComment };
}

function detectHeredocOpenAtLineEnd(line: string): "'" | '"' | null {
	const trimmed = line.replace(/[ \t]+$/u, "");
	if (trimmed.endsWith("<<'")) {
		return "'";
	}
	if (trimmed.endsWith('<<"')) {
		return '"';
	}
	return null;
}

function removeTrailingHeredocMarker(line: string, quote: "'" | '"'): string {
	const marker = `<<${quote}`;
	const endTrimmed = line.replace(/[ \t]+$/u, "");
	return endTrimmed.slice(0, endTrimmed.length - marker.length);
}

export { processLineSource };
