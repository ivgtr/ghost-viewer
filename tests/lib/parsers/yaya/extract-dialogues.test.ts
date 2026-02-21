import { extractDialogues } from "@/lib/parsers/yaya/extract-dialogues";
import { parse } from "@/lib/parsers/yaya/internal/legacy-parser";
import { describe, expect, it } from "vitest";
import type { FunctionDecl } from "@/lib/parsers/yaya/ast";

function parseFunction(code: string): FunctionDecl {
	const ast = parse(code);
	const func = ast.body[0];
	if (!func || func.type !== "FunctionDecl") {
		throw new Error("Expected a FunctionDecl as first statement");
	}
	return func;
}

describe("extractDialogues", () => {
	it("単一の文字列リテラルからダイアログを抽出する", () => {
		const fn = parseFunction('OnTest { "こんにちは" }');
		const dialogues = extractDialogues(fn);
		expect(dialogues).toHaveLength(1);
		expect(dialogues[0].rawText).toBe("こんにちは");
	});

	it("複数の文字列リテラルからダイアログを抽出する", () => {
		const fn = parseFunction('OnTest { "一行目" "二行目" }');
		const dialogues = extractDialogues(fn);
		expect(dialogues.length).toBeGreaterThanOrEqual(1);
		const allText = dialogues.map((d) => d.rawText).join("");
		expect(allText).toContain("一行目");
		expect(allText).toContain("二行目");
	});

	it("空の関数本体では空配列を返す", () => {
		const fn = parseFunction("OnTest { }");
		const dialogues = extractDialogues(fn);
		expect(dialogues).toHaveLength(0);
	});

	it("制御文のみの文字列は後続のテキストにマージされる", () => {
		const fn = parseFunction('OnTest { "\\s[0]" "こんにちは" }');
		const dialogues = extractDialogues(fn);
		expect(dialogues).toHaveLength(1);
		expect(dialogues[0].rawText).toContain("\\s[0]");
		expect(dialogues[0].rawText).toContain("こんにちは");
	});

	it("条件式内の文字列はダイアログとして抽出されない", () => {
		const fn = parseFunction('OnTest { if RAND(2) == 0 { "はい" } }');
		const dialogues = extractDialogues(fn);
		expect(dialogues).toHaveLength(1);
		expect(dialogues[0].rawText).toBe("はい");
	});

	it("関数呼び出し引数内の文字列はダイアログとして抽出されない", () => {
		const fn = parseFunction('OnTest { LOGGING("debug message") "表示テキスト" }');
		const dialogues = extractDialogues(fn);
		expect(dialogues).toHaveLength(1);
		expect(dialogues[0].rawText).toBe("表示テキスト");
	});

	it("代入右辺の文字列はダイアログとして抽出されない", () => {
		const fn = parseFunction('OnTest { _x = "保存値" "表示テキスト" }');
		const dialogues = extractDialogues(fn);
		expect(dialogues).toHaveLength(1);
		expect(dialogues[0].rawText).toBe("表示テキスト");
	});

	it("if-else 両方のブランチからダイアログを抽出する", () => {
		const fn = parseFunction('OnTest { if RAND(2) == 0 { "A" } else { "B" } }');
		const dialogues = extractDialogues(fn);
		expect(dialogues).toHaveLength(2);
		const texts = dialogues.map((d) => d.rawText);
		expect(texts).toContain("A");
		expect(texts).toContain("B");
	});
});
