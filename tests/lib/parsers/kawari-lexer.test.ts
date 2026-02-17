import { lex } from "@/lib/parsers/kawari-lexer";
import { describe, expect, it } from "vitest";

describe("kawari-lexer", () => {
	it("空文字列で空配列を返す", () => {
		expect(lex("")).toEqual([]);
	});

	it("# コメント行をスキップする", () => {
		expect(lex("# これはコメント")).toEqual([]);
	});

	it("空行をスキップする", () => {
		expect(lex("\n\n\n")).toEqual([]);
	});

	it("entry トークンを認識する", () => {
		const tokens = lex("sentence : hello");
		expect(tokens).toEqual([{ type: "entry", value: "sentence : hello", line: 0 }]);
	});

	it(":crypt トークンを認識する", () => {
		const tokens = lex(":crypt");
		expect(tokens).toEqual([{ type: "crypt_start", value: ":crypt", line: 0 }]);
	});

	it(":endcrypt トークンを認識する", () => {
		const tokens = lex(":endcrypt");
		expect(tokens).toEqual([{ type: "crypt_end", value: ":endcrypt", line: 0 }]);
	});

	it("行番号を正確に追跡する", () => {
		const tokens = lex("a : 1\n\nb : 2\nc : 3");
		expect(tokens).toHaveLength(3);
		expect(tokens[0].line).toBe(0);
		expect(tokens[1].line).toBe(2);
		expect(tokens[2].line).toBe(3);
	});

	it("CR+LF 改行を処理する", () => {
		const tokens = lex("a : 1\r\nb : 2\r\nc : 3");
		expect(tokens).toHaveLength(3);
		expect(tokens[0].line).toBe(0);
		expect(tokens[1].line).toBe(1);
		expect(tokens[2].line).toBe(2);
	});

	it("クォート内の : を entry 判定に使わない", () => {
		const tokens = lex('"key:value"');
		expect(tokens).toEqual([]);
	});

	it("コロンなしの行をスキップする", () => {
		const tokens = lex("no colon here");
		expect(tokens).toEqual([]);
	});

	it(":crypt のみで :endcrypt がないケース", () => {
		const input = "a : 1\n:crypt\nsecret : hidden";
		const tokens = lex(input);
		expect(tokens).toEqual([
			{ type: "entry", value: "a : 1", line: 0 },
			{ type: "crypt_start", value: ":crypt", line: 1 },
			{ type: "entry", value: "secret : hidden", line: 2 },
		]);
	});

	it("統合テスト: 複数行を正しくトークナイズする", () => {
		const input = [
			"# comment",
			"sentence : \\0こんにちは\\e , \\0やあ\\e",
			"",
			":crypt",
			"secret : 秘密",
			":endcrypt",
			"npw : 太郎",
		].join("\n");

		const tokens = lex(input);
		expect(tokens).toEqual([
			{ type: "entry", value: "sentence : \\0こんにちは\\e , \\0やあ\\e", line: 1 },
			{ type: "crypt_start", value: ":crypt", line: 3 },
			{ type: "entry", value: "secret : 秘密", line: 4 },
			{ type: "crypt_end", value: ":endcrypt", line: 5 },
			{ type: "entry", value: "npw : 太郎", line: 6 },
		]);
	});
});
