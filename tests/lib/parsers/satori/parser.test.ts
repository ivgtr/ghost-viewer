import { lex } from "@/lib/parsers/satori-lexer";
import type { EventDecl, SectionBlock } from "@/lib/parsers/satori/ast";
import { parseSatori, parseSatoriTokens } from "@/lib/parsers/satori/parser";
import { describe, expect, it } from "vitest";

describe("satori/parser", () => {
	it("空入力は空 Program を返す", () => {
		const program = parseSatori("");
		expect(program.body).toEqual([]);
		expect(program.loc.start).toEqual({ line: 0, column: 0 });
		expect(program.loc.end).toEqual({ line: 0, column: 0 });
	});

	it("複数イベントを AST 化する", () => {
		const program = parseSatori("＊OnBoot\n：hello\n＊OnClose\n：bye", "dic/satori.dic");
		expect(program.filePath).toBe("dic/satori.dic");
		expect(program.body).toHaveLength(2);
		expect(program.body[0]?.type).toBe("EventDecl");
		expect(program.body[1]?.type).toBe("EventDecl");

		const onBoot = program.body[0] as EventDecl;
		const onClose = program.body[1] as EventDecl;
		expect(onBoot.name).toBe("OnBoot");
		expect(onClose.name).toBe("OnClose");
		expect(onBoot.lines).toHaveLength(1);
		expect(onClose.lines).toHaveLength(1);
	});

	it("section でイベントを終了し SectionBlock を構築する", () => {
		const source = "＊OnBoot\n：hello\n＠単語群\nfoo\nbar\n＊OnClose\n：bye";
		const program = parseSatori(source);
		expect(program.body).toHaveLength(3);
		expect(program.body.map((node) => node.type)).toEqual([
			"EventDecl",
			"SectionBlock",
			"EventDecl",
		]);

		const firstEvent = program.body[0] as EventDecl;
		const section = program.body[1] as SectionBlock;
		expect(firstEvent.loc.end.line).toBe(1);
		expect(section.separator.name).toBe("単語群");
		expect(section.separator.marker).toBe("＠");
		expect(section.lines).toHaveLength(2);
		expect(section.lines[0]?.type).toBe("TextLine");
		expect(section.lines[1]?.type).toBe("TextLine");
	});

	it("＄ section の marker を保持する", () => {
		const program = parseSatori("＄変数\na=1");
		const section = program.body[0] as SectionBlock;
		expect(section.separator.marker).toBe("＄");
	});

	it("dialogue/text 混在時に行順を保持し endLine を更新する", () => {
		const program = parseSatori("＊OnBoot\n：first\nmeta\n：second");
		const event = program.body[0] as EventDecl;
		expect(event.lines.map((line) => line.type)).toEqual([
			"DialogueLine",
			"TextLine",
			"DialogueLine",
		]);
		expect(event.loc.start.line).toBe(0);
		expect(event.loc.end.line).toBe(3);
	});

	it("orphan 行を保持しない", () => {
		const program = parseSatori("orphan\n：ignored\n＊OnBoot\ntext");
		expect(program.body).toHaveLength(1);
		const event = program.body[0] as EventDecl;
		expect(event.name).toBe("OnBoot");
		expect(event.lines).toHaveLength(1);
		expect(event.lines[0]?.type).toBe("TextLine");
	});

	it("終端改行なしの入力を確定する", () => {
		const program = parseSatori("＊OnBoot\n：hello");
		const event = program.body[0] as EventDecl;
		expect(event.lines).toHaveLength(1);
		expect(event.loc.start.line).toBe(0);
		expect(event.loc.end.line).toBe(1);
	});

	it("loc の列番号を token 由来で設定する", () => {
		const program = parseSatori("＊OnBoot\n：hello");
		const event = program.body[0] as EventDecl;
		expect(event.loc.start.column).toBe(0);
		expect(event.loc.end.column).toBe(6);
		const dialogue = event.lines[0];
		expect(dialogue?.loc.start.column).toBe(0);
		expect(dialogue?.loc.end.column).toBe(6);
	});

	it("parseSatoriTokens は lexer 出力を受け取れる", () => {
		const tokens = lex("＊OnBoot\n：hello");
		const program = parseSatoriTokens(tokens);
		expect(program.body).toHaveLength(1);
		expect(program.body[0]?.type).toBe("EventDecl");
	});
});
