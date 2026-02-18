import { parseYayaDic } from "@/lib/parsers/yaya";
import { describe, expect, it } from "vitest";

describe("parseYayaDic", () => {
	it("空文字列から空配列を返す", () => {
		expect(parseYayaDic("", "test.dic")).toEqual([]);
	});

	it("単一関数をパースする", () => {
		const text = 'OnBoot {\n\t"\\0こんにちは\\e"\n}';
		const result = parseYayaDic(text, "yaya.dic");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("OnBoot");
		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("\\0こんにちは\\e");
	});

	it("複数関数をパースする", () => {
		const text = 'OnBoot {\n\t"hello"\n}\n\nOnClose {\n\t"goodbye"\n}';
		const result = parseYayaDic(text, "yaya.dic");

		expect(result).toHaveLength(2);
		expect(result[0].name).toBe("OnBoot");
		expect(result[1].name).toBe("OnClose");
	});

	it("複数ダイアログをパースする", () => {
		const text = 'OnBoot {\n\t"hello"\n\t"world"\n}';
		const result = parseYayaDic(text, "yaya.dic");

		expect(result).toHaveLength(1);
		expect(result[0].dialogues).toHaveLength(2);
		expect(result[0].dialogues[0].rawText).toBe("hello");
		expect(result[0].dialogues[1].rawText).toBe("world");
	});

	it("filePath が反映される", () => {
		const text = 'OnBoot {\n\t"hello"\n}';
		const result = parseYayaDic(text, "ghost/master/yaya.dic");

		expect(result[0].filePath).toBe("ghost/master/yaya.dic");
	});

	it("DicFunction の startLine/endLine が正しい", () => {
		const text = '// comment\nOnBoot {\n\t"hello"\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result[0].startLine).toBe(1);
		expect(result[0].endLine).toBe(3);
	});

	it("Dialogue の startLine/endLine が正しい", () => {
		const text = 'OnBoot {\n\t"hello"\n\t"world"\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result[0].dialogues[0].startLine).toBe(1);
		expect(result[0].dialogues[0].endLine).toBe(1);
		expect(result[0].dialogues[1].startLine).toBe(2);
		expect(result[0].dialogues[1].endLine).toBe(2);
	});

	it("// 行コメントをスキップする", () => {
		const text = '// This is a comment\nOnBoot {\n\t"hello"\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("OnBoot");
	});

	it("関数内の // 行コメントをスキップする", () => {
		const text = 'OnBoot {\n\t// comment\n\t"hello"\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("hello");
	});

	it("行末コメントを除去してダイアログを抽出する", () => {
		const text = 'OnBoot {\n\t"hello" // greeting\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("hello");
	});

	it("文字列内の // はコメントとして扱わない", () => {
		const text = 'OnBoot {\n\t"http://example.com"\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("http://example.com");
	});

	it("ネストした制御構文の波括弧を正しく追跡する", () => {
		const text = 'OnBoot {\n\tif RAND(2) == 0 {\n\t\t"hello"\n\t} else {\n\t\t"world"\n\t}\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("OnBoot");
		expect(result[0].endLine).toBe(6);
	});

	it("文字列内の {} を波括弧カウントに含めない", () => {
		const text = 'OnBoot {\n\t"text { with } braces"\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("text { with } braces");
	});

	it("コメント内の {} を波括弧カウントに含めない", () => {
		const text = 'OnBoot {\n\t"hello" // { not counted }\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].dialogues).toHaveLength(1);
	});

	it("一行関数をパースする", () => {
		const text = 'OnBoot { "hello" }';
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("OnBoot");
		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("hello");
	});

	it("エスケープクォートを含む文字列を処理する", () => {
		const text = 'OnBoot {\n\t"say \\"hello\\""\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe('say "hello"');
	});

	it("SakuraScript トークンを生成する", () => {
		const text = 'OnBoot {\n\t"\\0こんにちは\\e"\n}';
		const result = parseYayaDic(text, "test.dic");

		const tokens = result[0].dialogues[0].tokens;
		expect(tokens.length).toBeGreaterThan(0);
		expect(tokens[0].tokenType).toBe("charSwitch");
	});

	it("返り値型アノテーション付き関数をパースする", () => {
		const text = 'OnBoot : string {\n\t"hello"\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("OnBoot");
	});

	it("空関数をパースする", () => {
		const text = "OnBoot {\n}";
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("OnBoot");
		expect(result[0].dialogues).toHaveLength(0);
	});

	it("未閉じ関数はスキップする", () => {
		const text = 'OnBoot {\n\t"hello"';
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(0);
	});

	it("# プリプロセッサ指令をスキップする", () => {
		const text = '#globaldefine SCOPE\nOnBoot {\n\t"hello"\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].dialogues).toHaveLength(1);
	});

	it("CR+LF 改行コードを処理する", () => {
		const text = 'OnBoot {\r\n\t"hello"\r\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].dialogues).toHaveLength(1);
	});

	it("return 文からダイアログを抽出する", () => {
		const text = 'OnBoot {\n\treturn "hello"\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("hello");
	});

	it("空文字列をスキップする", () => {
		const text = 'OnBoot {\n\t""\n\t"hello"\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("hello");
	});

	it("変数代入内の文字列はダイアログとして扱わない", () => {
		const text = 'OnBoot {\n\t_result = "value"\n\t"hello"\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("hello");
	});

	it("ドット付き関数名をパースする", () => {
		const text = 'resource.homeurl {\n\t"http://example.com"\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("resource.homeurl");
	});

	it("シングルクォート会話をパースする", () => {
		const text = "OnBoot {\n\t'\\0こんにちは\\e'\n}";
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("\\0こんにちは\\e");
	});

	it("シングルクォートとダブルクォートの混在をパースする", () => {
		const text = "OnBoot {\n\t\"hello\"\n\t'world'\n}";
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].dialogues).toHaveLength(2);
		expect(result[0].dialogues[0].rawText).toBe("hello");
		expect(result[0].dialogues[1].rawText).toBe("world");
	});

	it("シングルクォート内の // はコメントとして扱わない", () => {
		const text = "OnBoot {\n\t'http://example.com'\n}";
		const result = parseYayaDic(text, "test.dic");

		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("http://example.com");
	});

	it("return 文のシングルクォートからダイアログを抽出する", () => {
		const text = "OnBoot {\n\treturn 'hello'\n}";
		const result = parseYayaDic(text, "test.dic");

		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("hello");
	});

	it("シングルクォート内の {} が braceDepth に影響しない", () => {
		const text = "OnBoot {\n\t'text { with } braces'\n}";
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("text { with } braces");
	});

	it("空シングルクォート文字列をスキップする", () => {
		const text = "OnBoot {\n\t''\n\t'hello'\n}";
		const result = parseYayaDic(text, "test.dic");

		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("hello");
	});

	it("一行関数でシングルクォートをパースする", () => {
		const text = "OnBoot { 'hello' }";
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("hello");
	});

	it("braceDepth 0 で else { を関数として認識しない", () => {
		const text = 'else {\n\t"hello"\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(0);
	});

	it("braceDepth 0 で do { を関数として認識しない", () => {
		const text = 'do {\n\t"hello"\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(0);
	});

	it("others をトップレベル関数として正常にパースする", () => {
		const text = 'others {\n\t"hello"\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("others");
		expect(result[0].dialogues).toHaveLength(1);
	});

	it("関数内の else で回帰しない（style A）", () => {
		const text = 'OnBoot {\n\tif RAND(2) == 0 {\n\t\t"hello"\n\t}\n\telse {\n\t\t"world"\n\t}\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("OnBoot");
		expect(result[0].dialogues).toHaveLength(2);
	});

	it("行継続構文の引数行をダイアログとして抽出しない", () => {
		const text = [
			"SHIORI3FW.EscapeDangerousTags {",
			"\t_result = RE_REPLACE(/",
			"\t\t'pattern1',/",
			"\t\t'replace1',/",
			"\t\t'pattern2',/",
			"\t\t'replace2',/",
			"\t\t_input)",
			"}",
		].join("\n");
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("SHIORI3FW.EscapeDangerousTags");
		expect(result[0].dialogues).toHaveLength(0);
	});

	it("行継続ブロック後の通常ダイアログは正常に抽出される", () => {
		const text = [
			"OnTest {",
			"\t_result = RE_REPLACE(/",
			"\t\t'pattern',/",
			"\t\t_input)",
			'\t"\\0こんにちは\\e"',
			"}",
		].join("\n");
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("\\0こんにちは\\e");
	});

	it("文字列内の末尾 / は行継続として扱わない", () => {
		const text = 'OnBoot {\n\t"http://example.com/"\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("http://example.com/");
	});

	it("} else { 同一行スタイルで dialogues 数が正しい", () => {
		const text = 'OnBoot {\n\tif RAND(2) == 0 {\n\t\t"hello"\n\t} else {\n\t\t"world"\n\t}\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("OnBoot");
		expect(result[0].dialogues).toHaveLength(2);
	});

	// --- 新規テスト: Style B 関数定義 ---

	it("Style B 関数定義（関数名と { が別行）をパースする", () => {
		const text = 'TalkToUser\n{\n\t"hello"\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("TalkToUser");
		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("hello");
	});

	it("Style B + 返り値型アノテーションをパースする", () => {
		const text = 'OnBoot : string\n{\n\t"hello"\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("OnBoot");
		expect(result[0].dialogues).toHaveLength(1);
	});

	it("Style B の startLine が関数名の行を指す", () => {
		const text = '// comment\nTalkToUser\n{\n\t"hello"\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result[0].startLine).toBe(1);
		expect(result[0].endLine).toBe(4);
	});

	it("Style B で空行を挟んでも関数を検出する", () => {
		const text = 'TalkToUser\n\n{\n\t"hello"\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("TalkToUser");
	});

	// --- 新規テスト: 条件式内文字列の除外 ---

	it("if 条件式内の文字列はダイアログとして抽出しない", () => {
		const text = ["OnTest {", '\tif ("text" == reference[1]) {', '\t\t"dialogue"', "\t}", "}"].join(
			"\n",
		);
		const result = parseYayaDic(text, "test.dic");

		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("dialogue");
	});

	it("case 内の文字列はダイアログとして抽出しない", () => {
		const text = [
			"OnTest {",
			"\tswitch (x) {",
			'\t\tcase "pattern" {',
			'\t\t\t"dialogue"',
			"\t\t}",
			"\t}",
			"}",
		].join("\n");
		const result = parseYayaDic(text, "test.dic");

		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("dialogue");
	});

	// --- 新規テスト: -- セパレータ ---

	it("-- セパレータ前後のダイアログを抽出する", () => {
		const text = 'OnBoot {\n\t"hello"\n\t--\n\t"world"\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result[0].dialogues).toHaveLength(2);
		expect(result[0].dialogues[0].rawText).toBe("hello");
		expect(result[0].dialogues[1].rawText).toBe("world");
	});

	// --- 新規テスト: 関数呼び出し引数の除外 ---

	it("関数呼び出し引数内の文字列はダイアログとして抽出しない", () => {
		const text = ["OnTest {", '\tSomeFunc("not a dialogue")', '\t"dialogue"', "}"].join("\n");
		const result = parseYayaDic(text, "test.dic");

		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("dialogue");
	});

	// --- 新規テスト: ブロックコメント ---

	it("ブロックコメントをスキップする", () => {
		const text = 'OnBoot {\n\t/* comment */\n\t"hello"\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("hello");
	});

	it("ブロックコメント内の {} を波括弧カウントに含めない", () => {
		const text = 'OnBoot {\n\t/* { } */\n\t"hello"\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].dialogues).toHaveLength(1);
	});

	// --- 制御タグのみダイアログのマージ ---

	it("制御タグのみのダイアログが次のテキストダイアログにマージされる", () => {
		const text = [
			"OnTest {",
			'\t"\\t\\![set,choicetimeout,0]"',
			"\t--",
			'\t"\\h\\s[0]hello"',
			"}",
		].join("\n");
		const result = parseYayaDic(text, "test.dic");

		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe("\\t\\![set,choicetimeout,0]\\h\\s[0]hello");
	});

	it("連続する制御タグダイアログがまとめてマージされる", () => {
		const text = [
			"OnTest {",
			'\t"\\t\\![set,choicetimeout,0]"',
			"\t--",
			'\t"\\t\\![set,autoscroll,disable]"',
			"\t--",
			'\t"\\h\\s[0]hello"',
			"}",
		].join("\n");
		const result = parseYayaDic(text, "test.dic");

		expect(result[0].dialogues).toHaveLength(1);
		expect(result[0].dialogues[0].rawText).toBe(
			"\\t\\![set,choicetimeout,0]\\t\\![set,autoscroll,disable]\\h\\s[0]hello",
		);
	});

	it("テキスト + テキストのダイアログはマージされない", () => {
		const text = ["OnTest {", '\t"hello"', "\t--", '\t"world"', "}"].join("\n");
		const result = parseYayaDic(text, "test.dic");

		expect(result[0].dialogues).toHaveLength(2);
		expect(result[0].dialogues[0].rawText).toBe("hello");
		expect(result[0].dialogues[1].rawText).toBe("world");
	});

	it("末尾の制御タグのみダイアログは独立して保持される", () => {
		const text = [
			"OnTest {",
			'\t"\\h\\s[0]hello"',
			"\t--",
			'\t"\\t\\![set,choicetimeout,0]"',
			"}",
		].join("\n");
		const result = parseYayaDic(text, "test.dic");

		expect(result[0].dialogues).toHaveLength(2);
		expect(result[0].dialogues[0].rawText).toBe("\\h\\s[0]hello");
		expect(result[0].dialogues[1].rawText).toBe("\\t\\![set,choicetimeout,0]");
	});

	it("ghost/master パスのパイプラインでも元ファイル行番号を保持する", () => {
		const text = [
			"//============人気ランキング====================================================",
			"ToolTip_RATEOFUSE",
			"{",
			'\t"ゴーストの使用ランキングを表示＆そこから起動できます"',
			"}",
			"",
			"OnChoiceSelect_ADDBOOTGHOST",
			"{",
			'\t"\\![get,property,OnActiveGhostListCountGet,activeghostlist.count]\\![embed,OnActiveGhostListGetFirst]"',
			"}",
		].join("\n");
		const result = parseYayaDic(text, "ghost/master/aya_menu.dic");
		const tooltip = result.find((fn) => fn.name === "ToolTip_RATEOFUSE");
		const onChoice = result.find((fn) => fn.name === "OnChoiceSelect_ADDBOOTGHOST");

		expect(tooltip).toBeDefined();
		expect(tooltip?.startLine).toBe(1);
		expect(tooltip?.dialogues[0]?.startLine).toBe(3);

		expect(onChoice).toBeDefined();
		expect(onChoice?.startLine).toBe(6);
		expect(onChoice?.dialogues[0]?.startLine).toBe(8);
	});
});
