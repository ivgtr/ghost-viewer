import { tokenize } from "@/lib/sakura-script/tokenize";
import { describe, expect, it } from "vitest";

describe("tokenize", () => {
	describe("基本動作", () => {
		it("空文字列 → 空配列", () => {
			expect(tokenize("")).toEqual([]);
		});

		it("タグなしテキスト → 単一 text トークン", () => {
			const result = tokenize("こんにちは");
			expect(result).toEqual([
				{ tokenType: "text", raw: "こんにちは", value: "こんにちは", offset: 0 },
			]);
		});

		it("単一タグのみ → 対応トークン", () => {
			const result = tokenize("\\0");
			expect(result).toEqual([{ tokenType: "charSwitch", raw: "\\0", value: "0", offset: 0 }]);
		});
	});

	describe("各タグタイプ", () => {
		it.each([
			{ input: "\\0", tokenType: "charSwitch", value: "0" },
			{ input: "\\1", tokenType: "charSwitch", value: "1" },
			{ input: "\\2", tokenType: "charSwitch", value: "2" },
			{ input: "\\9", tokenType: "charSwitch", value: "9" },
			{ input: "\\h", tokenType: "charSwitch", value: "0" },
			{ input: "\\u", tokenType: "charSwitch", value: "1" },
			{ input: "\\p[0]", tokenType: "charSwitch", value: "0" },
			{ input: "\\p[2]", tokenType: "charSwitch", value: "2" },
		])("charSwitch: $input", ({ input, tokenType, value }) => {
			const result = tokenize(input);
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe(tokenType);
			expect(result[0].value).toBe(value);
		});

		it.each([
			{ input: "\\s[0]", tokenType: "surface", value: "0" },
			{ input: "\\s[10]", tokenType: "surface", value: "10" },
		])("surface: $input", ({ input, tokenType, value }) => {
			const result = tokenize(input);
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe(tokenType);
			expect(result[0].value).toBe(value);
		});

		it.each([
			{ input: "\\q[はい,yes]", tokenType: "choice", value: "はい,yes" },
			{ input: "\\q[a,b,c]", tokenType: "choice", value: "a,b,c" },
		])("choice: $input", ({ input, tokenType, value }) => {
			const result = tokenize(input);
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe(tokenType);
			expect(result[0].value).toBe(value);
		});

		it.each([
			{ input: "\\![raise,EventName]", tokenType: "raise", value: "EventName" },
			{ input: "\\![raise,OnChoice,ref0]", tokenType: "raise", value: "OnChoice,ref0" },
		])("raise: $input", ({ input, tokenType, value }) => {
			const result = tokenize(input);
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe(tokenType);
			expect(result[0].value).toBe(value);
		});

		it.each([
			{ input: "\\w", tokenType: "wait", value: "" },
			{ input: "\\w9", tokenType: "wait", value: "9" },
			{ input: "\\_w[500]", tokenType: "wait", value: "500" },
			{ input: "\\x", tokenType: "wait", value: "" },
		])("wait: $input", ({ input, tokenType, value }) => {
			const result = tokenize(input);
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe(tokenType);
			expect(result[0].value).toBe(value);
		});

		it.each([
			{ input: "\\_a[link1]", tokenType: "marker", value: "link1" },
			{ input: "\\_a", tokenType: "marker", value: "" },
			{ input: "\\n", tokenType: "marker", value: "" },
			{ input: "\\n[50]", tokenType: "marker", value: "50" },
			{ input: "\\n[half]", tokenType: "marker", value: "half" },
			{ input: "\\n[-30]", tokenType: "marker", value: "-30" },
			{ input: "\\e", tokenType: "marker", value: "" },
			{ input: "\\c", tokenType: "marker", value: "" },
			{ input: "\\t", tokenType: "marker", value: "" },
		])("marker: $input", ({ input, tokenType, value }) => {
			const result = tokenize(input);
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe(tokenType);
			expect(result[0].value).toBe(value);
		});
	});

	describe("YAYA 変数 %(...))", () => {
		it("%(variable) → variable トークン", () => {
			const result = tokenize("%(variable)");
			expect(result).toEqual([
				{ tokenType: "variable", raw: "%(variable)", value: "variable", offset: 0 },
			]);
		});

		it("%(ANY(('a','b','c'))) → ネスト括弧の variable トークン", () => {
			const result = tokenize("%(ANY(('a','b','c')))");
			expect(result).toEqual([
				{
					tokenType: "variable",
					raw: "%(ANY(('a','b','c')))",
					value: "ANY(('a','b','c'))",
					offset: 0,
				},
			]);
		});

		it("閉じ括弧なし %(open → unknown フォールバック", () => {
			const result = tokenize("%(open");
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe("unknown");
			expect(result[0].raw).toBe("%(open");
		});

		it("テキスト中の %(...)  が前後テキストと分離される", () => {
			const result = tokenize("今日は%(weather)です");
			expect(result).toEqual([
				{ tokenType: "text", raw: "今日は", value: "今日は", offset: 0 },
				{ tokenType: "variable", raw: "%(weather)", value: "weather", offset: 3 },
				{ tokenType: "text", raw: "です", value: "です", offset: 13 },
			]);
		});
	});

	describe("複合パターン", () => {
		it("典型的会話", () => {
			const input = "\\0\\s[0]こんにちは。\\w9\\1\\s[10]やあ。\\e";
			const result = tokenize(input);
			expect(result).toEqual([
				{ tokenType: "charSwitch", raw: "\\0", value: "0", offset: 0 },
				{ tokenType: "surface", raw: "\\s[0]", value: "0", offset: 2 },
				{ tokenType: "text", raw: "こんにちは。", value: "こんにちは。", offset: 7 },
				{ tokenType: "wait", raw: "\\w9", value: "9", offset: 13 },
				{ tokenType: "charSwitch", raw: "\\1", value: "1", offset: 16 },
				{ tokenType: "surface", raw: "\\s[10]", value: "10", offset: 18 },
				{ tokenType: "text", raw: "やあ。", value: "やあ。", offset: 24 },
				{ tokenType: "marker", raw: "\\e", value: "", offset: 27 },
			]);
		});

		it("選択肢含む会話", () => {
			const input = "\\0\\s[0]どっち？\\n\\q[はい,yes]\\n\\q[いいえ,no]\\e";
			const result = tokenize(input);
			const types = result.map((t) => t.tokenType);
			expect(types).toEqual([
				"charSwitch",
				"surface",
				"text",
				"marker",
				"choice",
				"marker",
				"choice",
				"marker",
			]);
		});

		it("連続タグ", () => {
			const input = "\\0\\1\\0\\1";
			const result = tokenize(input);
			expect(result).toHaveLength(4);
			expect(result.every((t) => t.tokenType === "charSwitch")).toBe(true);
		});
	});

	describe("offset の正確性", () => {
		it("各トークンの offset が正しい位置を指す", () => {
			const input = "\\0\\s[0]hello";
			const result = tokenize(input);
			expect(result[0].offset).toBe(0);
			expect(result[1].offset).toBe(2);
			expect(result[2].offset).toBe(7);
		});

		it("日本語テキスト含む場合", () => {
			const input = "あ\\0い";
			const result = tokenize(input);
			expect(result).toEqual([
				{ tokenType: "text", raw: "あ", value: "あ", offset: 0 },
				{ tokenType: "charSwitch", raw: "\\0", value: "0", offset: 1 },
				{ tokenType: "text", raw: "い", value: "い", offset: 3 },
			]);
		});
	});

	describe("エッジケース", () => {
		it("末尾の \\", () => {
			const result = tokenize("hello\\");
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				tokenType: "text",
				raw: "hello",
				value: "hello",
				offset: 0,
			});
			expect(result[1]).toEqual({
				tokenType: "unknown",
				raw: "\\",
				value: "\\",
				offset: 5,
			});
		});

		it("閉じ括弧なし", () => {
			const result = tokenize("\\s[5");
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe("unknown");
			expect(result[0].raw).toBe("\\s[5");
		});

		it("ネスト括弧", () => {
			const result = tokenize("\\q[\\s[5],ID]");
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe("choice");
			expect(result[0].value).toBe("\\s[5],ID");
		});

		it("unknown タグ", () => {
			const result = tokenize("\\z");
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe("unknown");
			expect(result[0].value).toBe("\\z");
		});

		it("\\n[ 閉じ括弧なし → \\n + text にフォールバック", () => {
			const result = tokenize("\\n[50");
			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({ tokenType: "marker", raw: "\\n", value: "", offset: 0 });
			expect(result[1]).toEqual({ tokenType: "text", raw: "[50", value: "[50", offset: 2 });
		});

		it("\\![open,...] は unknown", () => {
			const result = tokenize("\\![open,browser]");
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe("unknown");
		});

		it("\\sN は surface の省略形", () => {
			const result = tokenize("\\s5");
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe("surface");
			expect(result[0].raw).toBe("\\s5");
			expect(result[0].value).toBe("5");
		});

		it("\\s の後が数字でも [ でもない場合は unknown", () => {
			const result = tokenize("\\sX");
			expect(result).toHaveLength(2);
			expect(result[0].tokenType).toBe("unknown");
			expect(result[0].raw).toBe("\\s");
			expect(result[1].tokenType).toBe("text");
			expect(result[1].value).toBe("X");
		});

		it("\\pN は charSwitch の省略形", () => {
			const result = tokenize("\\p5");
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe("charSwitch");
			expect(result[0].raw).toBe("\\p5");
			expect(result[0].value).toBe("5");
		});

		it("\\p の後が数字でも [ でもない場合は unknown", () => {
			const result = tokenize("\\pX");
			expect(result).toHaveLength(2);
			expect(result[0].tokenType).toBe("unknown");
			expect(result[0].raw).toBe("\\p");
			expect(result[1].tokenType).toBe("text");
			expect(result[1].value).toBe("X");
		});

		it("\\bN は balloon の省略形", () => {
			const result = tokenize("\\b2");
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe("balloon");
			expect(result[0].raw).toBe("\\b2");
			expect(result[0].value).toBe("2");
		});

		it("\\b[N] は balloon のブラケット形", () => {
			const result = tokenize("\\b[3]");
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe("balloon");
			expect(result[0].raw).toBe("\\b[3]");
			expect(result[0].value).toBe("3");
		});

		it("\\b[ 閉じ括弧なし → unknown", () => {
			const result = tokenize("\\b[5");
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe("unknown");
			expect(result[0].raw).toBe("\\b[5");
		});

		it("\\b の後が数字でも [ でもない場合は unknown", () => {
			const result = tokenize("\\bX");
			expect(result).toHaveLength(2);
			expect(result[0].tokenType).toBe("unknown");
			expect(result[0].raw).toBe("\\b");
			expect(result[1].tokenType).toBe("text");
			expect(result[1].value).toBe("X");
		});

		it("\\p[ 閉じ括弧なし", () => {
			const result = tokenize("\\p[5");
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe("unknown");
			expect(result[0].raw).toBe("\\p[5");
		});
	});

	describe("ブラケット消費", () => {
		it.each([
			{ input: "\\f[height,10]", desc: "\\f[...]" },
			{ input: "\\i[60]", desc: "\\i[...]" },
			{ input: "\\j[http://example.com]", desc: "\\j[...]" },
		])("unknown タグ $desc がブラケットごと消費される", ({ input }) => {
			const result = tokenize(input);
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe("unknown");
			expect(result[0].raw).toBe(input);
		});

		it("\\f[height,10]テスト → unknown + text（テキスト漏れなし）", () => {
			const result = tokenize("\\f[height,10]テスト");
			expect(result).toHaveLength(2);
			expect(result[0].tokenType).toBe("unknown");
			expect(result[0].raw).toBe("\\f[height,10]");
			expect(result[1].tokenType).toBe("text");
			expect(result[1].value).toBe("テスト");
		});

		it("\\8[file.wav] → unknown としてブラケットごと消費", () => {
			const result = tokenize("\\8[file.wav]");
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe("unknown");
			expect(result[0].raw).toBe("\\8[file.wav]");
		});

		it("\\0[half] → unknown としてブラケットごと消費", () => {
			const result = tokenize("\\0[half]");
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe("unknown");
			expect(result[0].raw).toBe("\\0[half]");
		});

		it("\\x[noclear] → wait としてブラケットごと消費", () => {
			const result = tokenize("\\x[noclear]");
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe("wait");
			expect(result[0].raw).toBe("\\x[noclear]");
			expect(result[0].value).toBe("noclear");
		});

		it("\\c[char,5] → marker としてブラケットごと消費", () => {
			const result = tokenize("\\c[char,5]");
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe("marker");
			expect(result[0].raw).toBe("\\c[char,5]");
			expect(result[0].value).toBe("char,5");
		});

		it("\\_q → unknown として3文字消費", () => {
			const result = tokenize("\\_q");
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe("unknown");
			expect(result[0].raw).toBe("\\_q");
		});

		it("\\_qテスト → unknown 3文字 + text", () => {
			const result = tokenize("\\_qテスト");
			expect(result).toHaveLength(2);
			expect(result[0].tokenType).toBe("unknown");
			expect(result[0].raw).toBe("\\_q");
			expect(result[1].tokenType).toBe("text");
			expect(result[1].value).toBe("テスト");
		});

		it("\\_s → unknown として3文字消費", () => {
			const result = tokenize("\\_s");
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe("unknown");
			expect(result[0].raw).toBe("\\_s");
		});

		it("\\_l[0,0] → unknown としてブラケットごと消費", () => {
			const result = tokenize("\\_l[0,0]");
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe("unknown");
			expect(result[0].raw).toBe("\\_l[0,0]");
		});

		it("\\_b[path/to/file] → unknown としてブラケットごと消費", () => {
			const result = tokenize("\\_b[path/to/file]");
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe("unknown");
			expect(result[0].raw).toBe("\\_b[path/to/file]");
		});

		it("unknown タグのブラケット閉じ括弧なし → 残り全体を消費", () => {
			const result = tokenize("\\f[height,10");
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe("unknown");
			expect(result[0].raw).toBe("\\f[height,10");
		});

		it("\\_ のみ（末尾）→ 2文字で unknown", () => {
			const result = tokenize("\\_");
			expect(result).toHaveLength(1);
			expect(result[0].tokenType).toBe("unknown");
			expect(result[0].raw).toBe("\\_");
		});
	});
});
