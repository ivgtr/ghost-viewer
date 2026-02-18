import { parseSatoriDic } from "@/lib/parsers/satori";
import { buildChatMessages } from "@/lib/sakura-script/build-chat-messages";
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

	it("単一イベントと複数応答を1会話に統合してパースする", () => {
		const text = "＊OnBoot\n：\\0こんにちは\\e\n：\\0やあ\\e";
		const result = parseSatoriDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("\\0こんにちは\\e\n\\0やあ\\e");
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

	it("イベントヘッダの条件式を保持する", () => {
		const text = "＊OnBoot\t（Ｒ０）>0\n：\\0hello\\e";
		const result = parseSatoriDic(text, "test.dic");

		expect(result[0].name).toBe("OnBoot");
		expect(result[0].condition).toBe("（Ｒ０）>0");
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
		expect(result[0].dialogues[0].endLine).toBe(2);
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

	it("section 内の：行はイベントの dialogue として扱わない", () => {
		const text = "＊OnBoot\n：\\0hello\\e\n＠単語群\n：\\0ignored\\e\n＊OnClose\n：\\0bye\\e";
		const result = parseSatoriDic(text, "test.dic");

		expect(result).toHaveLength(2);
		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("\\0hello\\e");
		expect(result[1].dialogues).toHaveLength(1);
		expect(result[1].dialogues[0].rawText).toBe("\\0bye\\e");
	});

	it("非：行が混在した場合は直前の：行に連結する", () => {
		const text = "＊OnBoot\n：first\ntext-line\n：second";
		const result = parseSatoriDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("first\ntext-line\nsecond");
		expect(result[0].dialogues[0].startLine).toBe(1);
		expect(result[0].dialogues[0].endLine).toBe(3);
	});

	it("：行ごとに話者を0/1で交互推定する", () => {
		const text = "＊OnBoot\n：first\n：second\n：third";
		const result = parseSatoriDic(text, "test.dic");
		const dialogue = result[0].dialogues[0];
		const messages = buildChatMessages(dialogue.tokens);

		expect(messages).toHaveLength(3);
		expect(messages.map((m) => m.characterId)).toEqual([0, 1, 0]);
		expect(messages[0].segments[0]).toEqual({ type: "text", value: "first" });
		expect(messages[1].segments[0]).toEqual({ type: "text", value: "second" });
		expect(messages[2].segments[0]).toEqual({ type: "text", value: "third" });
	});

	it("最初の：行より前の通常行を会話に取り込む", () => {
		const text = "＊OnBoot\nprologue\n：hello";
		const result = parseSatoriDic(text, "test.dic");
		const dialogue = result[0].dialogues[0];
		const messages = buildChatMessages(dialogue.tokens);

		expect(result).toHaveLength(1);
		expect(result[0].dialogues).toHaveLength(1);
		expect(dialogue.rawText).toBe("prologue\nhello");
		expect(dialogue.startLine).toBe(1);
		expect(dialogue.endLine).toBe(2);
		expect(messages.map((m) => m.characterId)).toEqual([1, 0]);
	});

	it("（n）を話者指定として扱わない", () => {
		const text = "＊OnBoot\n：（１）first\n：second";
		const result = parseSatoriDic(text, "test.dic");
		const dialogue = result[0].dialogues[0];
		const messages = buildChatMessages(dialogue.tokens);

		expect(messages).toHaveLength(2);
		expect(messages.map((m) => m.characterId)).toEqual([0, 1]);
		expect(messages[0].segments[0]).toEqual({ type: "text", value: "（１）first" });
		expect(messages[1].segments[0]).toEqual({ type: "text", value: "second" });
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

	it("行コマンド行は会話本文に含めない", () => {
		const text = "＊OnBoot\n＞jump\n通常行\n：返答\n＿choice\n＄var";
		const result = parseSatoriDic(text, "test.dic");
		const dialogue = result[0].dialogues[0];
		const messages = buildChatMessages(dialogue.tokens);

		expect(dialogue.rawText).toBe("通常行\n返答");
		expect(messages).toHaveLength(2);
		expect(messages.map((m) => m.characterId)).toEqual([1, 0]);
		expect(messages[0].segments[0]).toEqual({ type: "text", value: "通常行" });
		expect(messages[1].segments[0]).toEqual({ type: "text", value: "返答" });
	});

	it("：なし通常行イベントも会話として抽出する", () => {
		const text = "＊OnBoot\nline1\nline2";
		const result = parseSatoriDic(text, "test.dic");
		const dialogue = result[0].dialogues[0];
		const messages = buildChatMessages(dialogue.tokens);

		expect(result[0].dialogues).toHaveLength(1);
		expect(dialogue.rawText).toBe("line1\nline2");
		expect(messages).toHaveLength(1);
		expect(messages[0].characterId).toBe(1);
	});

	it("：なしで行コマンドのみのイベントは dialogues が空になる", () => {
		const text = "＊OnBoot\n＞jump\n＿choice\n＄var";
		const result = parseSatoriDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].dialogues).toEqual([]);
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

	it("/* ... */ ブロックコメントをスキップする", () => {
		const text = "＊OnBoot\n/* comment */\n：\\0hello\\e";
		const result = parseSatoriDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].dialogues).toHaveLength(1);
	});

	it("複数行ブロックコメントをスキップする", () => {
		const text = "＊OnBoot\n/* multi\nline\ncomment */\n：\\0hello\\e";
		const result = parseSatoriDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].startLine).toBe(4);
	});

	it("行内ブロックコメントを除去する", () => {
		const text = "＊On/* x */Boot\n：\\0hello\\e";
		const result = parseSatoriDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("OnBoot");
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
