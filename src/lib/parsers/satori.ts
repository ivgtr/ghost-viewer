import type { DialogueLine, EventDecl, SatoriLineNode } from "@/lib/parsers/satori/ast";
import { parseSatori } from "@/lib/parsers/satori/parser";
import { buildDicFunction } from "@/lib/parsers/shared";
import type { Block } from "@/lib/parsers/shared";
import { tokenize } from "@/lib/sakura-script/tokenize";
import type { Dialogue, DicFunction } from "@/types";

function isEventDecl(node: { type: string }): node is EventDecl {
	return node.type === "EventDecl";
}

function isDialogueLine(line: SatoriLineNode): line is DialogueLine {
	return line.type === "DialogueLine";
}

function toDialogue(line: DialogueLine): Dialogue {
	const rawText = line.rawText;
	return {
		tokens: tokenize(rawText),
		startLine: line.loc.start.line,
		endLine: line.loc.end.line,
		rawText,
	};
}

function toBlock(event: EventDecl): Block {
	const dialogues = event.lines.filter(isDialogueLine).map(toDialogue);
	return {
		name: event.name,
		startLine: event.loc.start.line,
		endLine: event.loc.end.line,
		dialogues,
	};
}

export function parseSatoriDic(source: string, filePath: string): DicFunction[] {
	const program = parseSatori(source, filePath);
	return program.body
		.filter(isEventDecl)
		.map((event) => buildDicFunction(toBlock(event), filePath));
}
