import { lex } from "@/lib/parsers/yaya/lexer";
import type { Token } from "@/lib/parsers/yaya/lexer";
import { describe, expect, it } from "vitest";

describe("YAYA Lexer", () => {
	describe("basic tokens", () => {
		it("should tokenize string literals", () => {
			const tokens = lex('"hello"');
			expect(tokens).toHaveLength(2);
			expect(tokens[0]).toEqual({ type: "string", value: "hello", line: 0, column: 0 });
		});

		it("should tokenize string with escapes", () => {
			const tokens = lex('"hello\\nworld"');
			expect(tokens[0]).toEqual({ type: "string", value: "hello\\nworld", line: 0, column: 0 });
		});

		it("should tokenize identifiers", () => {
			const tokens = lex("foo bar");
			expect(tokens).toHaveLength(3);
			expect(tokens[0]).toEqual({ type: "identifier", value: "foo", line: 0, column: 0 });
			expect(tokens[1]).toEqual({ type: "identifier", value: "bar", line: 0, column: 4 });
		});

		it("should tokenize numbers", () => {
			const tokens = lex("123 45.6");
			expect(tokens).toHaveLength(3);
			expect(tokens[0]).toEqual({ type: "number", value: "123", line: 0, column: 0 });
			expect(tokens[1]).toEqual({ type: "number", value: "45.6", line: 0, column: 4 });
		});

		it("should tokenize keywords", () => {
			const tokens = lex("if else while for");
			expect(tokens).toHaveLength(5);
			expect(tokens[0]).toEqual({ type: "keyword", value: "if", line: 0, column: 0 });
			expect(tokens[1]).toEqual({ type: "keyword", value: "else", line: 0, column: 3 });
		});
	});

	describe("operators", () => {
		it("should tokenize single-char operators", () => {
			const tokens = lex("= + - * / %");
			expect(tokens).toHaveLength(7);
			expect(tokens[0].type).toBe("operator");
			expect(tokens[0].value).toBe("=");
		});

		it("should tokenize two-char operators", () => {
			const tokens = lex("== != += -= && ||");
			expect(tokens).toHaveLength(7);
			expect(tokens[0].value).toBe("==");
			expect(tokens[1].value).toBe("!=");
			expect(tokens[2].value).toBe("+=");
			expect(tokens[3].value).toBe("-=");
		});

		it("should tokenize comparison operators", () => {
			const tokens = lex("< > <= >=");
			expect(tokens).toHaveLength(5);
			expect(tokens[0].value).toBe("<");
			expect(tokens[1].value).toBe(">");
			expect(tokens[2].value).toBe("<=");
			expect(tokens[3].value).toBe(">=");
		});
	});

	describe("punctuation", () => {
		it("should tokenize braces", () => {
			const tokens = lex("{ }");
			expect(tokens).toHaveLength(3);
			expect(tokens[0]).toEqual({ type: "lbrace", value: "{", line: 0, column: 0 });
			expect(tokens[1]).toEqual({ type: "rbrace", value: "}", line: 0, column: 2 });
		});

		it("should tokenize brackets and parens", () => {
			const tokens = lex("[ ] ( )");
			expect(tokens).toHaveLength(5);
			expect(tokens[0].type).toBe("lbracket");
			expect(tokens[1].type).toBe("rbracket");
			expect(tokens[2].type).toBe("lparen");
			expect(tokens[3].type).toBe("rparen");
		});

		it("should tokenize separator", () => {
			const tokens = lex("--");
			expect(tokens).toHaveLength(2);
			expect(tokens[0]).toEqual({ type: "separator", value: "--", line: 0, column: 0 });
		});
	});

	describe("comments", () => {
		it("should skip line comments", () => {
			const tokens = lex("foo // comment\nbar");
			expect(tokens).toHaveLength(4);
			expect(tokens[0].value).toBe("foo");
			expect(tokens[2].value).toBe("bar");
		});

		it("should skip block comments", () => {
			const tokens = lex("foo /* comment */ bar");
			expect(tokens).toHaveLength(3);
			expect(tokens[0].value).toBe("foo");
			expect(tokens[1].value).toBe("bar");
		});
	});

	describe("newlines and line tracking", () => {
		it("should track line numbers", () => {
			const tokens = lex("foo\nbar\nbaz");
			expect(tokens).toHaveLength(6);
			expect(tokens[0].line).toBe(0);
			expect(tokens[2].line).toBe(1);
			expect(tokens[4].line).toBe(2);
		});

		it("should track column numbers", () => {
			const tokens = lex("foo bar");
			expect(tokens[0].column).toBe(0);
			expect(tokens[1].column).toBe(4);
		});

		it("should handle line continuation", () => {
			const tokens = lex("foo /\nbar");
			expect(tokens).toHaveLength(3);
			expect(tokens[0].value).toBe("foo");
			expect(tokens[1].value).toBe("bar");
		});
	});

	describe("edge cases", () => {
		it("should tokenize empty string", () => {
			const tokens = lex("");
			expect(tokens).toHaveLength(1);
			expect(tokens[0].type).toBe("eof");
		});

		it("should handle _in_ operator", () => {
			const tokens = lex("foreach _in_");
			expect(tokens).toHaveLength(3);
			expect(tokens[1].value).toBe("_in_");
			expect(tokens[1].type).toBe("operator");
		});

		it("should handle !_in_ operator", () => {
			const tokens = lex("a !_in_ b");
			expect(tokens[1].value).toBe("!_in_");
			expect(tokens[1].type).toBe("operator");
		});

		it("should handle := style assignment operators", () => {
			const tokens = lex("a := 1; b +:= 2");
			expect(tokens.some((token) => token.value === ":=")).toBe(true);
			expect(tokens.some((token) => token.value === "+:=")).toBe(true);
		});

		it("should handle :: operator", () => {
			const tokens = lex("foo::bar");
			expect(tokens).toHaveLength(4);
			expect(tokens[0].value).toBe("foo");
			expect(tokens[1].value).toBe("::");
			expect(tokens[2].value).toBe("bar");
		});

		it("should handle dot-prefixed identifiers", () => {
			const tokens = lex(".system");
			expect(tokens[0]).toEqual({ type: "identifier", value: ".system", line: 0, column: 0 });
		});
	});
});
