import { parseKawariDic } from "@/lib/parsers/kawari";
import { describe, expect, it } from "vitest";

describe("parseKawariDic", () => {
	it("空文字列で空配列を返す", () => {
		expect(parseKawariDic("", "test.dic")).toEqual([]);
	});

	it("単一エントリー・単一 term をパースする", () => {
		const result = parseKawariDic("sentence : hello", "test.dic");
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("sentence");
		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("hello");
	});

	it("カンマ区切りの複数 term をパースする", () => {
		const result = parseKawariDic("sentence : hello , world", "test.dic");
		expect(result).toHaveLength(1);
		expect(result[0].dialogues).toHaveLength(2);
		expect(result[0].dialogues[0].rawText).toBe("hello");
		expect(result[0].dialogues[1].rawText).toBe("world");
	});

	it("同名エントリーが複数行で複数 DicFunction になる", () => {
		const text = "sentence : hello\nsentence : world";
		const result = parseKawariDic(text, "test.dic");
		expect(result).toHaveLength(2);
		expect(result[0].name).toBe("sentence");
		expect(result[0].dialogues[0].rawText).toBe("hello");
		expect(result[1].name).toBe("sentence");
		expect(result[1].dialogues[0].rawText).toBe("world");
	});

	it("# コメントをスキップする", () => {
		const text = "# comment\nsentence : hello";
		const result = parseKawariDic(text, "test.dic");
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("sentence");
	});

	it(":crypt ~ :endcrypt 間をスキップする", () => {
		const text = "a : 1\n:crypt\nsecret : hidden\n:endcrypt\nb : 2";
		const result = parseKawariDic(text, "test.dic");
		expect(result).toHaveLength(2);
		expect(result[0].name).toBe("a");
		expect(result[1].name).toBe("b");
	});

	it("filePath を伝播する", () => {
		const result = parseKawariDic("x : 1", "ghost/kawari.dic");
		expect(result[0].filePath).toBe("ghost/kawari.dic");
	});

	it("startLine/endLine が正確である", () => {
		const text = "a : 1\n\nb : 2";
		const result = parseKawariDic(text, "test.dic");
		expect(result[0].startLine).toBe(0);
		expect(result[0].endLine).toBe(0);
		expect(result[1].startLine).toBe(2);
		expect(result[1].endLine).toBe(2);
	});

	it("Dialogue の startLine/endLine が正確である", () => {
		const text = "a : x , y";
		const result = parseKawariDic(text, "test.dic");
		expect(result[0].dialogues[0].startLine).toBe(0);
		expect(result[0].dialogues[0].endLine).toBe(0);
		expect(result[0].dialogues[1].startLine).toBe(0);
		expect(result[0].dialogues[1].endLine).toBe(0);
	});

	it("SakuraScript トークンを生成する", () => {
		const result = parseKawariDic("sentence : \\0hello\\e", "test.dic");
		const tokens = result[0].dialogues[0].tokens;
		expect(tokens.length).toBeGreaterThan(0);
		expect(tokens[0].tokenType).toBe("charSwitch");
	});

	it("エントリー名・term を trim する", () => {
		const result = parseKawariDic("  name  :  value  ", "test.dic");
		expect(result[0].name).toBe("name");
		expect(result[0].dialogues[0].rawText).toBe("value");
	});

	it("クォート内カンマを保持する", () => {
		const result = parseKawariDic('sentence : "a,b" , c', "test.dic");
		expect(result[0].dialogues).toHaveLength(2);
		expect(result[0].dialogues[0].rawText).toBe('"a,b"');
		expect(result[0].dialogues[1].rawText).toBe("c");
	});

	it("value にコロンを含むエントリーをパースする", () => {
		const result = parseKawariDic("key : http://example.com", "test.dic");
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("key");
		expect(result[0].dialogues[0].rawText).toBe("http://example.com");
	});

	it(":crypt のみでファイル末尾まで暗号化されたエントリーをスキップする", () => {
		const text = "a : 1\n:crypt\nsecret : hidden\nmore : data";
		const result = parseKawariDic(text, "test.dic");
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("a");
	});

	it("カンマ区切りの複数エントリ名を個別の DicFunction に展開する", () => {
		const result = parseKawariDic("name1,name2 : value", "test.dic");
		expect(result).toHaveLength(2);
		expect(result[0].name).toBe("name1");
		expect(result[1].name).toBe("name2");
		expect(result[0].dialogues[0].rawText).toBe("value");
		expect(result[1].dialogues[0].rawText).toBe("value");
	});

	it("カンマ前後にスペースがある複数エントリ名を trim する", () => {
		const result = parseKawariDic("name1 , name2 : value", "test.dic");
		expect(result).toHaveLength(2);
		expect(result[0].name).toBe("name1");
		expect(result[1].name).toBe("name2");
	});

	it("CR+LF 改行を処理する", () => {
		const text = "a : 1\r\nb : 2";
		const result = parseKawariDic(text, "test.dic");
		expect(result).toHaveLength(2);
		expect(result[0].name).toBe("a");
		expect(result[1].name).toBe("b");
	});
});
