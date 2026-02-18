import type { DialogueLine, EventDecl, SatoriLineNode } from "@/lib/parsers/satori/ast";
import { parseSatori } from "@/lib/parsers/satori/parser";
import { buildDicFunction } from "@/lib/parsers/shared";
import type { Block } from "@/lib/parsers/shared";
import { tokenize } from "@/lib/sakura-script/tokenize";
import type { Dialogue, DicFunction } from "@/types";

interface SatoriTurn {
	speakerId: 0 | 1;
	text: string;
	startLine: number;
	endLine: number;
}

function isEventDecl(node: { type: string }): node is EventDecl {
	return node.type === "EventDecl";
}

function isDialogueLine(line: SatoriLineNode): line is DialogueLine {
	return line.type === "DialogueLine";
}

function toggleSpeakerId(id: 0 | 1): 0 | 1 {
	return id === 0 ? 1 : 0;
}

function buildTurns(lines: SatoriLineNode[]): SatoriTurn[] {
	const turns: SatoriTurn[] = [];
	let nextSpeakerId: 0 | 1 = 0;

	for (const line of lines) {
		if (isDialogueLine(line)) {
			turns.push({
				speakerId: nextSpeakerId,
				text: line.rawText,
				startLine: line.loc.start.line,
				endLine: line.loc.end.line,
			});
			nextSpeakerId = toggleSpeakerId(nextSpeakerId);
			continue;
		}

		const currentTurn = turns[turns.length - 1];
		if (!currentTurn) continue;
		currentTurn.text = `${currentTurn.text}\n${line.value}`;
		currentTurn.endLine = line.loc.end.line;
	}

	return turns;
}

function toDialogue(turns: SatoriTurn[]): Dialogue | null {
	const first = turns[0];
	const last = turns[turns.length - 1];
	if (!first || !last) {
		return null;
	}

	const rawText = turns.map((turn) => turn.text).join("\n");
	const script = turns.map((turn) => `\\${turn.speakerId}${turn.text}`).join("");
	return {
		tokens: tokenize(script),
		startLine: first.startLine,
		endLine: last.endLine,
		rawText,
	};
}

function toBlock(event: EventDecl): Block {
	const turns = buildTurns(event.lines);
	const mergedDialogue = toDialogue(turns);
	const dialogues = mergedDialogue ? [mergedDialogue] : [];
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
