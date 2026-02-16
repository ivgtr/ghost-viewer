import { parseSatoriDic } from "@/lib/parsers/satori";
import { describe, expect, it } from "vitest";

describe("parseSatoriDic", () => {
	it("空文字列で空配列を返す", () => {
		expect(parseSatoriDic("", "test.dic")).toEqual([]);
	});

	it("単一イベントと単一応答をパースする", () => {
		const text = "＊OnBoot\n：\\0こんにちは\\e";
		const result = parseSatoriDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("OnBoot");
		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("\\0こんにちは\\e");
	});

	it("単一イベントと複数応答をパースする", () => {
		const text = "＊OnBoot\n：\\0こんにちは\\e\n：\\0やあ\\e";
		const result = parseSatoriDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].dialogues).toHaveLength(2);
		expect(result[0].dialogues[0].rawText).toBe("\\0こんにちは\\e");
		expect(result[0].dialogues[1].rawText).toBe("\\0やあ\\e");
	});

	it("複数ブロックをパースする", () => {
		const text = "＊OnBoot\n：\\0こんにちは\\e\n＊OnClose\n：\\0さようなら\\e";
		const result = parseSatoriDic(text, "test.dic");

		expect(result).toHaveLength(2);
		expect(result[0].name).toBe("OnBoot");
		expect(result[1].name).toBe("OnClose");
	});

	it("イベント名をトリムする", () => {
		const text = "＊  OnBoot  \n：\\0hello\\e";
		const result = parseSatoriDic(text, "test.dic");

		expect(result[0].name).toBe("OnBoot");
	});

	it("空のイベント名を扱う", () => {
		const text = "＊\n：\\0hello\\e";
		const result = parseSatoriDic(text, "test.dic");

		expect(result[0].name).toBe("");
	});

	it("DicFunction の startLine/endLine が正しい", () => {
		const text = "＊OnBoot\n：\\0こんにちは\\e\n：\\0やあ\\e";
		const result = parseSatoriDic(text, "test.dic");

		expect(result[0].startLine).toBe(0);
		expect(result[0].endLine).toBe(2);
	});

	it("Dialogue の startLine/endLine が正しい", () => {
		const text = "＊OnBoot\n：\\0こんにちは\\e\n：\\0やあ\\e";
		const result = parseSatoriDic(text, "test.dic");

		expect(result[0].dialogues[0].startLine).toBe(1);
		expect(result[0].dialogues[0].endLine).toBe(1);
		expect(result[0].dialogues[1].startLine).toBe(2);
		expect(result[0].dialogues[1].endLine).toBe(2);
	});

	it("filePath が全結果に反映される", () => {
		const text = "＊OnBoot\n：\\0hello\\e\n＊OnClose\n：\\0bye\\e";
		const result = parseSatoriDic(text, "dic/satori.dic");

		for (const fn of result) {
			expect(fn.filePath).toBe("dic/satori.dic");
		}
	});

	it("// コメントをスキップする", () => {
		const text = "// comment\n＊OnBoot\n// another comment\n：\\0hello\\e";
		const result = parseSatoriDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].dialogues).toHaveLength(1);
	});

	it("＃ コメントをスキップする", () => {
		const text = "＃コメント\n＊OnBoot\n＃別のコメント\n：\\0hello\\e";
		const result = parseSatoriDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].dialogues).toHaveLength(1);
	});

	it("空行をスキップする", () => {
		const text = "\n＊OnBoot\n\n：\\0hello\\e\n";
		const result = parseSatoriDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].dialogues).toHaveLength(1);
	});

	it("＠ でブロックを終了し後続行を無視する", () => {
		const text = "＊OnBoot\n：\\0hello\\e\n＠単語群\nfoo\nbar\n＊OnClose\n：\\0bye\\e";
		const result = parseSatoriDic(text, "test.dic");

		expect(result).toHaveLength(2);
		expect(result[0].name).toBe("OnBoot");
		expect(result[1].name).toBe("OnClose");
	});

	it("＄ でブロックを終了する", () => {
		const text = "＊OnBoot\n：\\0hello\\e\n＄変数\n＊OnClose\n：\\0bye\\e";
		const result = parseSatoriDic(text, "test.dic");

		expect(result).toHaveLength(2);
		expect(result[0].name).toBe("OnBoot");
		expect(result[1].name).toBe("OnClose");
	});

	it("SakuraScript トークンが生成される", () => {
		const text = "＊OnBoot\n：\\0こんにちは\\e";
		const result = parseSatoriDic(text, "test.dic");
		const tokens = result[0].dialogues[0].tokens;

		expect(tokens.length).toBeGreaterThan(0);
		expect(tokens[0].tokenType).toBe("charSwitch");
		expect(tokens[0].raw).toBe("\\0");
	});

	it("rawText に：接頭辞が含まれない", () => {
		const text = "＊OnBoot\n：hello world";
		const result = parseSatoriDic(text, "test.dic");

		expect(result[0].dialogues[0].rawText).toBe("hello world");
	});

	it("＊のみで dialogues が空の場合もブロックを返す", () => {
		const text = "＊OnBoot";
		const result = parseSatoriDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("OnBoot");
		expect(result[0].dialogues).toEqual([]);
	});

	it("孤立した：行を無視する", () => {
		const text = "：orphan line\n＊OnBoot\n：\\0hello\\e";
		const result = parseSatoriDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("OnBoot");
		expect(result[0].dialogues).toHaveLength(1);
	});

	it("連続する＊行を正しく処理する", () => {
		const text = "＊First\n＊Second\n：\\0hello\\e";
		const result = parseSatoriDic(text, "test.dic");

		expect(result).toHaveLength(2);
		expect(result[0].name).toBe("First");
		expect(result[0].dialogues).toEqual([]);
		expect(result[1].name).toBe("Second");
		expect(result[1].dialogues).toHaveLength(1);
	});

	it("CR+LF 改行を正しく処理する", () => {
		const text = "＊OnBoot\r\n：\\0hello\\e\r\n＊OnClose\r\n：\\0bye\\e";
		const result = parseSatoriDic(text, "test.dic");

		expect(result).toHaveLength(2);
		expect(result[0].dialogues).toHaveLength(1);
		expect(result[1].dialogues).toHaveLength(1);
	});

	it("その他の行で endLine が更新される", () => {
		const text = "＊OnBoot\n：\\0hello\\e\nsome other line";
		const result = parseSatoriDic(text, "test.dic");

		expect(result[0].endLine).toBe(2);
	});
});
