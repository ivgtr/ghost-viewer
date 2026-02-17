import { lex } from "@/lib/parsers/yaya-lexer";
import { describe, expect, it } from "vitest";

describe("lex", () => {
	it("空文字列から空配列を返す", () => {
		expect(lex("")).toEqual([]);
	});

	it("識別子をトークン化する", () => {
		const tokens = lex("FuncName");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toEqual({
			type: "identifier",
			value: "FuncName",
			line: 0,
		});
	});

	it("ドット付き識別子をトークン化する", () => {
		const tokens = lex("resource.homeurl");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toEqual({
			type: "identifier",
			value: "resource.homeurl",
			line: 0,
		});
	});

	it("キーワードを識別子と区別する", () => {
		const tokens = lex("if else return others");
		expect(tokens[0]).toEqual({ type: "keyword", value: "if", line: 0 });
		expect(tokens[1]).toEqual({ type: "keyword", value: "else", line: 0 });
		expect(tokens[2]).toEqual({
			type: "keyword",
			value: "return",
			line: 0,
		});
		expect(tokens[3]).toEqual({
			type: "identifier",
			value: "others",
			line: 0,
		});
	});

	it("ダブルクォート文字列をトークン化する", () => {
		const tokens = lex('"hello world"');
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toEqual({
			type: "string",
			value: "hello world",
			line: 0,
		});
	});

	it("シングルクォート文字列をトークン化する", () => {
		const tokens = lex("'hello'");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]).toEqual({
			type: "string",
			value: "hello",
			line: 0,
		});
	});

	it("エスケープされたクォートを処理する", () => {
		const tokens = lex('"say \\"hello\\""');
		expect(tokens).toHaveLength(1);
		expect(tokens[0]?.value).toBe('say "hello"');
	});

	it("クォート以外のエスケープはそのまま保持する", () => {
		const tokens = lex('"\\0こんにちは\\e"');
		expect(tokens[0]?.value).toBe("\\0こんにちは\\e");
	});

	it("波括弧をトークン化する", () => {
		const tokens = lex("{ }");
		expect(tokens[0]?.type).toBe("lbrace");
		expect(tokens[1]?.type).toBe("rbrace");
	});

	it("括弧をトークン化する", () => {
		const tokens = lex("( ) [ ]");
		expect(tokens[0]?.type).toBe("lparen");
		expect(tokens[1]?.type).toBe("rparen");
		expect(tokens[2]?.type).toBe("lbracket");
		expect(tokens[3]?.type).toBe("rbracket");
	});

	it("二文字演算子をトークン化する", () => {
		const tokens = lex("== != += -= && ||");
		expect(tokens[0]).toEqual({ type: "operator", value: "==", line: 0 });
		expect(tokens[1]).toEqual({ type: "operator", value: "!=", line: 0 });
		expect(tokens[2]).toEqual({ type: "operator", value: "+=", line: 0 });
		expect(tokens[3]).toEqual({ type: "operator", value: "-=", line: 0 });
		expect(tokens[4]).toEqual({ type: "operator", value: "&&", line: 0 });
		expect(tokens[5]).toEqual({ type: "operator", value: "||", line: 0 });
	});

	it("単一文字演算子をトークン化する", () => {
		const tokens = lex("= + - * %");
		expect(tokens.map((t) => t.value)).toEqual(["=", "+", "-", "*", "%"]);
		for (const t of tokens) expect(t.type).toBe("operator");
	});

	it("_in_ を演算子としてトークン化する", () => {
		const tokens = lex("_in_");
		expect(tokens[0]).toEqual({
			type: "operator",
			value: "_in_",
			line: 0,
		});
	});

	it("-- をセパレータとしてトークン化する", () => {
		const tokens = lex('"a" -- "b"');
		expect(tokens[0]?.type).toBe("string");
		expect(tokens[1]).toEqual({
			type: "separator",
			value: "--",
			line: 0,
		});
		expect(tokens[2]?.type).toBe("string");
	});

	it("行コメントをスキップする", () => {
		const tokens = lex("a // comment\nb");
		expect(tokens).toHaveLength(3);
		expect(tokens[0]).toEqual({
			type: "identifier",
			value: "a",
			line: 0,
		});
		expect(tokens[1]).toEqual({ type: "newline", value: "\n", line: 0 });
		expect(tokens[2]).toEqual({
			type: "identifier",
			value: "b",
			line: 1,
		});
	});

	it("ブロックコメントをスキップする", () => {
		const tokens = lex("a /* comment */ b");
		expect(tokens).toHaveLength(2);
		expect(tokens[0]?.value).toBe("a");
		expect(tokens[1]?.value).toBe("b");
	});

	it("複数行ブロックコメントの行番号を正しく追跡する", () => {
		const tokens = lex("a\n/* line1\nline2 */\nb");
		expect(tokens[tokens.length - 1]).toEqual({
			type: "identifier",
			value: "b",
			line: 3,
		});
	});

	it("プリプロセッサ指令をスキップする", () => {
		const tokens = lex("#globaldefine FOO\nFuncName");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]?.value).toBe("FuncName");
	});

	it("インデントされたプリプロセッサ指令をスキップする", () => {
		const tokens = lex("  #define FOO\nFuncName");
		expect(tokens).toHaveLength(1);
		expect(tokens[0]?.value).toBe("FuncName");
	});

	it("行継続 (末尾 /) でニューラインを抑制する", () => {
		const tokens = lex("a /\nb");
		// "/" is consumed, no newline emitted
		expect(tokens).toHaveLength(2);
		expect(tokens[0]?.value).toBe("a");
		expect(tokens[1]?.value).toBe("b");
	});

	it("文字列内の // はコメントとして扱わない", () => {
		const tokens = lex('"http://example.com"');
		expect(tokens).toHaveLength(1);
		expect(tokens[0]?.value).toBe("http://example.com");
	});

	it("改行を newline トークンとして発行する", () => {
		const tokens = lex("a\nb");
		expect(tokens).toHaveLength(3);
		expect(tokens[1]).toEqual({ type: "newline", value: "\n", line: 0 });
	});

	it("連続する空行を圧縮する", () => {
		const tokens = lex("a\n\n\nb");
		const newlines = tokens.filter((t) => t.type === "newline");
		expect(newlines).toHaveLength(1);
	});

	it("CR+LF を単一の改行として処理する", () => {
		const tokens = lex("a\r\nb");
		expect(tokens).toHaveLength(3);
		expect(tokens[0]?.value).toBe("a");
		expect(tokens[1]?.type).toBe("newline");
		expect(tokens[2]?.value).toBe("b");
	});

	it("数値をトークン化する", () => {
		const tokens = lex("42 3.14");
		expect(tokens[0]).toEqual({ type: "number", value: "42", line: 0 });
		expect(tokens[1]).toEqual({ type: "number", value: "3.14", line: 0 });
	});

	it("コンマ・セミコロン・コロンをトークン化する", () => {
		const tokens = lex(", ; :");
		expect(tokens[0]?.type).toBe("comma");
		expect(tokens[1]?.type).toBe("semicolon");
		expect(tokens[2]?.type).toBe("colon");
	});

	it("関数定義（Style A）をトークン化する", () => {
		const tokens = lex('OnBoot { "hello" }');
		expect(tokens.map((t) => t.type)).toEqual(["identifier", "lbrace", "string", "rbrace"]);
	});

	it("関数定義（Style B）をトークン化する", () => {
		const tokens = lex('OnBoot\n{\n\t"hello"\n}');
		expect(tokens.map((t) => t.type)).toEqual([
			"identifier",
			"newline",
			"lbrace",
			"newline",
			"string",
			"newline",
			"rbrace",
		]);
	});

	it("文字列内の末尾 / は行継続として扱わない", () => {
		const tokens = lex('"http://example.com/"\n}');
		expect(tokens).toHaveLength(3);
		expect(tokens[0]?.type).toBe("string");
		expect(tokens[0]?.value).toBe("http://example.com/");
		expect(tokens[1]?.type).toBe("newline");
		expect(tokens[2]?.type).toBe("rbrace");
	});
});
