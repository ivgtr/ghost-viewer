import type { BaseNode, SourceLocation } from "../core/ast";
import type { SectionMarker } from "../satori-lexer";

interface SatoriProgram extends BaseNode {
	type: "Program";
	body: SatoriTopLevelNode[];
	filePath?: string;
	loc: SourceLocation;
}

interface EventDecl extends BaseNode {
	type: "EventDecl";
	name: string;
	lines: SatoriLineNode[];
	loc: SourceLocation;
}

interface DialogueLine extends BaseNode {
	type: "DialogueLine";
	rawText: string;
	loc: SourceLocation;
}

interface TextLine extends BaseNode {
	type: "TextLine";
	value: string;
	loc: SourceLocation;
}

interface SectionSeparator extends BaseNode {
	type: "SectionSeparator";
	name: string;
	marker: SectionMarker;
	loc: SourceLocation;
}

interface SectionBlock extends BaseNode {
	type: "SectionBlock";
	separator: SectionSeparator;
	lines: SatoriLineNode[];
	loc: SourceLocation;
}

type SatoriLineNode = DialogueLine | TextLine;
type SatoriTopLevelNode = EventDecl | SectionBlock;

export type {
	SatoriProgram,
	EventDecl,
	DialogueLine,
	TextLine,
	SectionSeparator,
	SectionBlock,
	SatoriLineNode,
	SatoriTopLevelNode,
};
