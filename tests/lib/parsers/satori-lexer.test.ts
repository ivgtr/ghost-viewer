import { lex } from "@/lib/parsers/satori-lexer";
import { describe, expect, it } from "vitest";

describe("satori-lexer", () => {
	it("空文字列で空配列を返す", () => {
		expect(lex("")).toEqual([]);
	});

	describe("トークン型", () => {
		it("＊ を event トークンとして分類する", () => {
			const tokens = lex("＊OnBoot");
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe("event");
		});

		it("： を dialogue トークンとして分類する", () => {
			const tokens = lex("：\\0こんにちは\\e");
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe("dialogue");
		});

		it("＠ を section トークンとして分類する", () => {
			const tokens = lex("＠単語群");
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe("section");
			expect(tokens[0]).toHaveProperty("marker", "＠");
		});

		it("＄ を section トークンとして分類する", () => {
			const tokens = lex("＄変数");
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe("section");
			expect(tokens[0]).toHaveProperty("marker", "＄");
		});

		it("マーカーなしの行を text トークンとして分類する", () => {
			const tokens = lex("some text");
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe("text");
		});
	});

	describe("value の正確性", () => {
		it("event の value はマーカー除去後の生値を保持する", () => {
			const tokens = lex("＊  OnBoot  ");
			expect(tokens[0].value).toBe("  OnBoot  ");
		});

		it("dialogue の value はマーカー除去後に trim されない", () => {
			const tokens = lex("：  hello  ");
			expect(tokens[0].value).toBe("  hello  ");
		});

		it("section の value はマーカー除去される", () => {
			const tokens = lex("＠単語群");
			expect(tokens[0].value).toBe("単語群");
			expect(tokens[0]).toHaveProperty("marker", "＠");
		});

		it("text の value はそのまま保持される", () => {
			const tokens = lex("raw text line");
			expect(tokens[0].value).toBe("raw text line");
		});
	});

	describe("コメント", () => {
		it("// コメント行をスキップする", () => {
			const tokens = lex("// comment\n＊OnBoot");
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe("event");
		});

		it("＃ コメント行をスキップする", () => {
			const tokens = lex("＃コメント\n＊OnBoot");
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe("event");
		});
	});

	describe("ブロックコメント", () => {
		it("単一行のブロックコメントを除去する", () => {
			const tokens = lex("＊On/* comment */Boot");
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe("event");
			expect(tokens[0].value).toBe("OnBoot");
		});

		it("複数行にまたがるブロックコメントを除去する", () => {
			const tokens = lex("＊OnBoot\n/* this\nis\na comment */\n：\\0hello\\e");
			expect(tokens).toHaveLength(2);
			expect(tokens[0].type).toBe("event");
			expect(tokens[1].type).toBe("dialogue");
		});

		it("行内のブロックコメントを除去する", () => {
			const tokens = lex("：hello/* comment */world");
			expect(tokens).toHaveLength(1);
			expect(tokens[0].value).toBe("helloworld");
		});

		it("行全体がブロックコメントの場合は空行としてスキップする", () => {
			const tokens = lex("/* full line comment */\n＊OnBoot");
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe("event");
		});
	});

	describe("互換構文", () => {
		it("COMMUNICATE の →：行は dialogue として再分類する", () => {
			const tokens = lex("→：はい、こんにちは。");
			expect(tokens).toEqual([{ type: "dialogue", value: "はい、こんにちは。", line: 0 }]);
		});

		it("COMMUNICATE の →text 行は text として扱い、→を除去する", () => {
			const tokens = lex("→俺たち、何で一緒にいるんだろうな。");
			expect(tokens).toEqual([
				{ type: "text", value: "俺たち、何で一緒にいるんだろうな。", line: 0 },
			]);
		});

		it("φ 行末エスケープ時は次行を text として扱う", () => {
			const tokens = lex("＊OnBoot\nlineφ\n＊EscapedAsText\n：hello");
			expect(tokens).toEqual([
				{ type: "event", value: "OnBoot", line: 0 },
				{ type: "text", value: "lineφ", line: 1 },
				{ type: "text", value: "＊EscapedAsText", line: 2 },
				{ type: "dialogue", value: "hello", line: 3 },
			]);
		});

		it("φ 行末エスケープの次行でも → 正規化が効く", () => {
			const tokens = lex("＊OnBoot\nlineφ\n→：hello");
			expect(tokens).toEqual([
				{ type: "event", value: "OnBoot", line: 0 },
				{ type: "text", value: "lineφ", line: 1 },
				{ type: "text", value: "：hello", line: 2 },
			]);
		});

		it("＃＃＃インラインイベント行は破棄し、次行を text として扱う", () => {
			const tokens = lex("＊OnBoot\n＃＃＃インラインイベント\n＊InlineAsText\n：hello");
			expect(tokens).toEqual([
				{ type: "event", value: "OnBoot", line: 0 },
				{ type: "text", value: "＊InlineAsText", line: 2 },
				{ type: "dialogue", value: "hello", line: 3 },
			]);
		});
	});

	it("空行をスキップする", () => {
		const tokens = lex("\n\n＊OnBoot\n\n：\\0hello\\e\n\n");
		expect(tokens).toHaveLength(2);
		expect(tokens[0].type).toBe("event");
		expect(tokens[1].type).toBe("dialogue");
	});

	describe("行番号", () => {
		it("基本的な行番号を正しく追跡する", () => {
			const tokens = lex("＊OnBoot\n：\\0hello\\e");
			expect(tokens[0].line).toBe(0);
			expect(tokens[1].line).toBe(1);
		});

		it("コメント・空行後も行番号が正しい", () => {
			const tokens = lex("// comment\n\n＊OnBoot\n＃ comment\n：\\0hello\\e");
			expect(tokens[0].line).toBe(2);
			expect(tokens[1].line).toBe(4);
		});

		it("ブロックコメント後も行番号が正しい", () => {
			const tokens = lex("/* line 0\nline 1\nline 2 */\n＊OnBoot");
			expect(tokens[0].line).toBe(3);
		});
	});

	it("CR+LF 改行を正しく処理する", () => {
		const tokens = lex("＊OnBoot\r\n：\\0hello\\e\r\n＊OnClose");
		expect(tokens).toHaveLength(3);
		expect(tokens[0].line).toBe(0);
		expect(tokens[1].line).toBe(1);
		expect(tokens[2].line).toBe(2);
	});

	it("複合入力の統合テスト", () => {
		const source = [
			"// ファイル先頭コメント",
			"＊OnBoot",
			"：\\0こんにちは\\e",
			"",
			"＃ コメント行",
			"/* ブロック",
			"コメント */",
			"＊OnClose",
			"：\\0さようなら\\e",
			"＠単語群",
			"foo",
			"bar",
			"＄変数",
		].join("\n");

		const tokens = lex(source);

		expect(tokens).toEqual([
			{ type: "event", value: "OnBoot", line: 1 },
			{ type: "dialogue", value: "\\0こんにちは\\e", line: 2 },
			{ type: "event", value: "OnClose", line: 7 },
			{ type: "dialogue", value: "\\0さようなら\\e", line: 8 },
			{ type: "section", value: "単語群", line: 9, marker: "＠" },
			{ type: "text", value: "foo", line: 10 },
			{ type: "text", value: "bar", line: 11 },
			{ type: "section", value: "変数", line: 12, marker: "＄" },
		]);
	});
});
