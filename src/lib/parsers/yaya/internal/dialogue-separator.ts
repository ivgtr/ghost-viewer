interface ConventionalSplitSegment {
	value: string;
	line: number;
}

interface LogicalLine {
	content: string;
	breakToken: string;
	lineOffset: number;
}

interface LineBreakToken {
	length: number;
	raw: string;
}

const CONVENTIONAL_SEPARATOR_PATTERN = /^([=-])\1{7,}$/u;

function isConventionalSeparatorLine(line: string): boolean {
	const trimmed = line.trim();
	if (trimmed.length === 0) {
		return false;
	}
	return CONVENTIONAL_SEPARATOR_PATTERN.test(trimmed);
}

function splitExtractedStringByConventionalSeparators(
	value: string,
	baseLine: number,
): ConventionalSplitSegment[] {
	const lines = splitLogicalLines(value);
	const segments: ConventionalSplitSegment[] = [];

	let segmentStart: number | null = null;

	for (const [index, line] of lines.entries()) {
		if (isConventionalSeparatorLine(line.content)) {
			pushSegment(segments, lines, segmentStart, index - 1, baseLine);
			segmentStart = null;
			continue;
		}

		if (segmentStart === null) {
			segmentStart = index;
		}
	}

	pushSegment(segments, lines, segmentStart, lines.length - 1, baseLine);

	return segments;
}

function pushSegment(
	segments: ConventionalSplitSegment[],
	lines: LogicalLine[],
	start: number | null,
	end: number,
	baseLine: number,
): void {
	if (start === null || start > end) {
		return;
	}

	const first = lines[start];
	if (!first) {
		return;
	}

	let value = "";
	for (let i = start; i <= end; i++) {
		const line = lines[i];
		if (!line) {
			continue;
		}
		value += line.content;
		if (i < end) {
			value += line.breakToken;
		}
	}

	if (value.length === 0) {
		return;
	}

	segments.push({
		value,
		line: baseLine + first.lineOffset,
	});
}

function splitLogicalLines(value: string): LogicalLine[] {
	const lines: LogicalLine[] = [];

	let cursor = 0;
	let start = 0;
	let lineOffset = 0;

	while (cursor < value.length) {
		const breakToken = consumeLineBreakToken(value, cursor);
		if (!breakToken) {
			cursor++;
			continue;
		}

		lines.push({
			content: value.slice(start, cursor),
			breakToken: breakToken.raw,
			lineOffset,
		});

		lineOffset++;
		cursor += breakToken.length;
		start = cursor;
	}

	lines.push({
		content: value.slice(start),
		breakToken: "",
		lineOffset,
	});

	return lines;
}

function consumeLineBreakToken(value: string, cursor: number): LineBreakToken | null {
	const ch = value[cursor];
	const next = value[cursor + 1];

	if (ch === "\r" && next === "\n") {
		return { length: 2, raw: "\r\n" };
	}
	if (ch === "\n") {
		return { length: 1, raw: "\n" };
	}
	if (ch === "\r") {
		return { length: 1, raw: "\r" };
	}

	const prev = value[cursor - 1];
	const hasEscapePrefix = prev === "\\";
	if (hasEscapePrefix) {
		return null;
	}

	if (value.startsWith("\\r\\n", cursor)) {
		return { length: 4, raw: "\\r\\n" };
	}
	if (value.startsWith("\\n", cursor)) {
		return { length: 2, raw: "\\n" };
	}
	if (value.startsWith("\\r", cursor)) {
		return { length: 2, raw: "\\r" };
	}

	return null;
}

export { isConventionalSeparatorLine, splitExtractedStringByConventionalSeparators };
export type { ConventionalSplitSegment };
