import { normalizeSatoriBodyLine } from "@/lib/parsers/satori/communicate-line";

type SatoriTokenType = "event" | "dialogue" | "section" | "text";

type SectionMarker = "＠" | "＄";
const INLINE_EVENT_SEPARATOR = "＃＃＃インラインイベント";

interface SatoriBaseToken {
	type: Exclude<SatoriTokenType, "section">;
	value: string;
	line: number;
}

interface SatoriSectionToken {
	type: "section";
	value: string;
	line: number;
	marker: SectionMarker;
}

type SatoriToken = SatoriBaseToken | SatoriSectionToken;

function createToken(
	type: Exclude<SatoriTokenType, "section">,
	value: string,
	line: number,
): SatoriBaseToken {
	return { type, value, line };
}

function createSectionToken(
	value: string,
	line: number,
	marker: SectionMarker,
): SatoriSectionToken {
	return {
		type: "section",
		value,
		line,
		marker,
	};
}

function isSectionMarker(marker: string): marker is SectionMarker {
	return marker === "＠" || marker === "＄";
}

function createLineToken(content: string, line: number): SatoriToken {
	const marker = content.charAt(0);
	if (marker === "＊") {
		return createToken("event", content.slice(1), line);
	}
	if (marker === "：") {
		return createToken("dialogue", content.slice(1), line);
	}
	if (isSectionMarker(marker)) {
		return createSectionToken(content.slice(1), line, marker);
	}
	return createToken("text", content, line);
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

function hasOddLineEndEscape(content: string): boolean {
	const match = /(φ+)$/.exec(content);
	if (!match) {
		return false;
	}
	return (match[1]?.length ?? 0) % 2 === 1;
}

export function lex(source: string): SatoriToken[] {
	const tokens: SatoriToken[] = [];
	let pos = 0;
	let line = 0;
	let forceNextText = false;

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

		const forceTextForCurrentLine = forceNextText;
		forceNextText = false;

		if (!forceTextForCurrentLine && content === INLINE_EVENT_SEPARATOR) {
			forceNextText = true;
			continue;
		}

		if (content === "" || content.startsWith("//") || content.startsWith("＃")) {
			continue;
		}
		const normalizedContent = normalizeSatoriBodyLine(content);

		if (forceTextForCurrentLine) {
			tokens.push(createToken("text", normalizedContent, lineStart));
		} else {
			tokens.push(createLineToken(normalizedContent, lineStart));
		}
		if (hasOddLineEndEscape(normalizedContent)) {
			forceNextText = true;
		}
	}

	return tokens;
}

export type { SatoriToken, SatoriTokenType, SectionMarker };
