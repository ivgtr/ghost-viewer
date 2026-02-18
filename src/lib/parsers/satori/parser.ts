import { lex } from "@/lib/parsers/satori-lexer";
import type { SatoriToken } from "@/lib/parsers/satori-lexer";

import type { SourceLocation } from "../core/ast";
import type {
	DialogueLine,
	EventDecl,
	SatoriLineNode,
	SatoriProgram,
	SatoriTopLevelNode,
	SectionBlock,
	SectionSeparator,
	TextLine,
} from "./ast";

function createZeroLoc(): SourceLocation {
	return {
		start: { line: 0, column: 0 },
		end: { line: 0, column: 0 },
	};
}

function createTokenLoc(token: SatoriToken): SourceLocation {
	return {
		start: { line: token.line, column: 0 },
		end: { line: token.line, column: token.value.length + 1 },
	};
}

function mergeLoc(start: SourceLocation, end: SourceLocation): SourceLocation {
	return {
		start: start.start,
		end: end.end,
	};
}

function createDialogueLine(token: SatoriToken): DialogueLine {
	return {
		type: "DialogueLine",
		rawText: token.value,
		loc: createTokenLoc(token),
	};
}

function createTextLine(token: SatoriToken): TextLine {
	return {
		type: "TextLine",
		value: token.value,
		loc: createTokenLoc(token),
	};
}

function appendLine(target: EventDecl | SectionBlock, line: SatoriLineNode): void {
	target.lines.push(line);
	target.loc = mergeLoc(target.loc, line.loc);
}

export function parseSatoriTokens(tokens: SatoriToken[], filePath?: string): SatoriProgram {
	const body: SatoriTopLevelNode[] = [];
	let currentEvent: EventDecl | null = null;
	let currentSection: SectionBlock | null = null;

	function closeCurrentBlock(): void {
		if (currentEvent) {
			body.push(currentEvent);
			currentEvent = null;
		}
		if (currentSection) {
			body.push(currentSection);
			currentSection = null;
		}
	}

	for (const token of tokens) {
		switch (token.type) {
			case "event": {
				closeCurrentBlock();
				const loc = createTokenLoc(token);
				currentEvent = {
					type: "EventDecl",
					name: token.value,
					lines: [],
					loc,
				};
				break;
			}
			case "section": {
				closeCurrentBlock();
				const separator: SectionSeparator = {
					type: "SectionSeparator",
					name: token.value,
					loc: createTokenLoc(token),
				};
				currentSection = {
					type: "SectionBlock",
					separator,
					lines: [],
					loc: separator.loc,
				};
				break;
			}
			case "dialogue": {
				const line = createDialogueLine(token);
				if (currentEvent) {
					appendLine(currentEvent, line);
				} else if (currentSection) {
					appendLine(currentSection, line);
				}
				break;
			}
			case "text": {
				const line = createTextLine(token);
				if (currentEvent) {
					appendLine(currentEvent, line);
				} else if (currentSection) {
					appendLine(currentSection, line);
				}
				break;
			}
		}
	}

	closeCurrentBlock();

	const firstToken = tokens[0];
	const lastToken = tokens[tokens.length - 1];
	const programLoc =
		firstToken && lastToken
			? mergeLoc(createTokenLoc(firstToken), createTokenLoc(lastToken))
			: createZeroLoc();

	return {
		type: "Program",
		body,
		filePath,
		loc: programLoc,
	};
}

export function parseSatori(source: string, filePath?: string): SatoriProgram {
	return parseSatoriTokens(lex(source), filePath);
}
