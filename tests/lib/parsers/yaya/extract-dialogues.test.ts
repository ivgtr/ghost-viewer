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

	describe("+ 演算子による文字列連結", () => {
		it("+ で連結された StringLiteral が1つのダイアログになる", () => {
			const fn = parseFunction('OnTest {\n\t"A" + "B" + "C"\n}');
			const dialogues = extractDialogues(fn);
			expect(dialogues.map((d) => d.rawText)).toEqual(["ABC"]);
		});

		it("CallExpression を挟んでも前後の StringLiteral が結合される", () => {
			const fn = parseFunction(
				'OnTest {\n\t"＊" + TranslateSystemChar(reference[0]) + "大根コミュニケート"\n}',
			);
			const dialogues = extractDialogues(fn);
			expect(dialogues.map((d) => d.rawText)).toEqual(["＊大根コミュニケート"]);
		});

		it("ConditionalExpression を挟む + チェーンでは再帰抽出が前出し、リテラルが後出しになる", () => {
			const fn = parseFunction('OnTest {\n\t"A" + (x ? "B" : "C") + "D"\n}');
			const dialogues = extractDialogues(fn);
			expect(dialogues.map((d) => d.rawText)).toEqual(["B", "C", "AD"]);
		});

		it("条件式内の + 連結は抽出されない", () => {
			const fn = parseFunction('OnTest {\n\tif "a" + "b" == "ab" {\n\t\t"dialogue"\n\t}\n}');
			const dialogues = extractDialogues(fn);
			expect(dialogues.map((d) => d.rawText)).toEqual(["dialogue"]);
		});

		it("代入右辺の + 連結は抽出されない", () => {
			const fn = parseFunction('OnTest {\n\t_x = "A" + "B"\n\t"dialogue"\n}');
			const dialogues = extractDialogues(fn);
			expect(dialogues.map((d) => d.rawText)).toEqual(["dialogue"]);
		});

		it("+ 連結と別の ExpressionStatement が別ダイアログになる", () => {
			const fn = parseFunction('OnTest {\n\t"A" + "B"\n\t"C"\n}');
			const dialogues = extractDialogues(fn);
			expect(dialogues.map((d) => d.rawText)).toEqual(["AB", "C"]);
		});
	});

	describe("YAYA -- (Output Determinant)", () => {
		it("-- で区切られた文字列が1つのダイアログに連結される", () => {
			const fn = parseFunction('OnTest { "A" -- "B" -- "C" }');
			const dialogues = extractDialogues(fn);
			expect(dialogues).toHaveLength(1);
			expect(dialogues[0].rawText).toBe("ABC");
		});

		it("-- セクション内に複数候補がある場合、セクションごとに別ダイアログになる", () => {
			const fn = parseFunction('OnTest { "A" "B" -- "C" }');
			const dialogues = extractDialogues(fn);
			expect(dialogues).toHaveLength(2);
			const texts = dialogues.map((d) => d.rawText);
			expect(texts).toContain("AC");
			expect(texts).toContain("BC");
		});

		it("-- の間にコードブロック（非文字列）がある場合も連結", () => {
			const fn = parseFunction('OnTest { "A" -- _x = 1 "B" }');
			const dialogues = extractDialogues(fn);
			expect(dialogues).toHaveLength(1);
			expect(dialogues[0].rawText).toBe("AB");
		});

		it("-- なしの複数文字列は別ダイアログ（既存動作確認）", () => {
			const fn = parseFunction('OnTest { "A" "B" }');
			const dialogues = extractDialogues(fn);
			expect(dialogues.length).toBeGreaterThanOrEqual(2);
		});

		it("-- 連結内に ======== を含む文字列がある場合は分割優先", () => {
			const fn = parseFunction('OnTest { "X\\n========\\nY" -- "Z" }');
			const dialogues = extractDialogues(fn);
			expect(dialogues).toHaveLength(2);
			const texts = dialogues.map((d) => d.rawText);
			expect(texts).toContain("X");
			expect(texts).toContain("YZ");
		});

		it("先頭 -- は無視される", () => {
			const fn = parseFunction('OnTest { -- "A" }');
			const dialogues = extractDialogues(fn);
			expect(dialogues).toHaveLength(1);
			expect(dialogues[0].rawText).toBe("A");
		});

		it("末尾 -- は無視される", () => {
			const fn = parseFunction('OnTest { "A" -- }');
			const dialogues = extractDialogues(fn);
			expect(dialogues).toHaveLength(1);
			expect(dialogues[0].rawText).toBe("A");
		});
	});
});
