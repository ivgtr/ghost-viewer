import { countBraces, parseYayaDic } from "@/lib/parsers/yaya";
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
		const text = '#globaldefine MACRO\nOnBoot {\n\t"hello"\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("OnBoot");
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
		// style B: 関数名と { が別行のコードで braceDepth がずれた場合、
		// else { が braceDepth === 0 でマッチするケースを防止する
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

	it("} else { 同一行スタイルで dialogues 数が正しい", () => {
		const text = 'OnBoot {\n\tif RAND(2) == 0 {\n\t\t"hello"\n\t} else {\n\t\t"world"\n\t}\n}';
		const result = parseYayaDic(text, "test.dic");

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("OnBoot");
		expect(result[0].dialogues).toHaveLength(2);
	});
});

describe("countBraces", () => {
	it("通常の波括弧をカウントする", () => {
		expect(countBraces("{ }")).toEqual({ open: 1, close: 1 });
	});

	it("文字列内の波括弧を無視する", () => {
		expect(countBraces('"{ }"')).toEqual({ open: 0, close: 0 });
	});

	it("コメント内の波括弧を無視する", () => {
		expect(countBraces("// { }")).toEqual({ open: 0, close: 0 });
	});

	it("文字列とコメントの混在を処理する", () => {
		expect(countBraces('"{" // }')).toEqual({ open: 0, close: 0 });
	});

	it("エスケープクォートを含む文字列を処理する", () => {
		expect(countBraces('"\\"{" }')).toEqual({ open: 0, close: 1 });
	});

	it("空行は 0 を返す", () => {
		expect(countBraces("")).toEqual({ open: 0, close: 0 });
	});

	it("複数の波括弧をカウントする", () => {
		expect(countBraces("if { } else { }")).toEqual({
			open: 2,
			close: 2,
		});
	});

	it("シングルクォート文字列内の波括弧を無視する", () => {
		expect(countBraces("'{ }'")).toEqual({ open: 0, close: 0 });
	});

	it("ダブルクォート内のシングルクォートを処理する", () => {
		expect(countBraces(`"it's {" }`)).toEqual({ open: 0, close: 1 });
	});

	it("シングルクォート内のダブルクォートを処理する", () => {
		expect(countBraces(`'say "hi" {' }`)).toEqual({ open: 0, close: 1 });
	});
});
