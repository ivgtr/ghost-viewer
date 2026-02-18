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
const COMMAND_PREFIXES = new Set(["＞", "＿", "＠", "＄", "＊"]);

function isEventDecl(node: { type: string }): node is EventDecl {
	return node.type === "EventDecl";
}

function isDialogueLine(line: SatoriLineNode): line is DialogueLine {
	return line.type === "DialogueLine";
}

function toggleSpeakerId(id: 0 | 1): 0 | 1 {
	return id === 0 ? 1 : 0;
}

function isCommandLine(value: string): boolean {
	const prefix = value.charAt(0);
	return COMMAND_PREFIXES.has(prefix);
}

function appendText(turn: SatoriTurn, value: string, endLine: number): void {
	turn.text = `${turn.text}\n${value}`;
	turn.endLine = endLine;
}

function buildTurns(lines: SatoriLineNode[]): SatoriTurn[] {
	const turns: SatoriTurn[] = [];
	let currentSpeakerId: 0 | 1 = 1;

	for (const line of lines) {
		if (isDialogueLine(line)) {
			currentSpeakerId = toggleSpeakerId(currentSpeakerId);
			turns.push({
				speakerId: currentSpeakerId,
				text: line.rawText,
				startLine: line.loc.start.line,
				endLine: line.loc.end.line,
			});
			continue;
		}

		if (isCommandLine(line.value)) {
			continue;
		}

		const currentTurn = turns[turns.length - 1];
		if (currentTurn && currentTurn.speakerId === currentSpeakerId) {
			appendText(currentTurn, line.value, line.loc.end.line);
			continue;
		}

		turns.push({
			speakerId: currentSpeakerId,
			text: line.value,
			startLine: line.loc.start.line,
			endLine: line.loc.end.line,
		});
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
		condition: event.condition,
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
