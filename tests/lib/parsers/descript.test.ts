import { buildGhostMeta, parseDescript, parseDescriptFromBuffer } from "@/lib/parsers/descript";
import { describe, expect, it } from "vitest";

describe("parseDescript", () => {
	it("基本的な key,value をパースする", () => {
		const result = parseDescript("name,テストゴースト\ncraftman,作者名");
		expect(result).toEqual({ name: "テストゴースト", craftman: "作者名" });
	});

	it("コメント行と空行をスキップする", () => {
		const result = parseDescript("// コメント\n\nname,テスト\n// もう一つ\n");
		expect(result).toEqual({ name: "テスト" });
	});

	it("値にカンマを含む場合、最初のカンマで分割する", () => {
		const result = parseDescript("description,これは,テスト,です");
		expect(result).toEqual({ description: "これは,テスト,です" });
	});

	it("key と value の前後空白をトリムする", () => {
		const result = parseDescript("  name  ,  テスト  ");
		expect(result).toEqual({ name: "テスト" });
	});

	it("カンマなし行をスキップする", () => {
		const result = parseDescript("name,テスト\nカンマなし行\nauthor,作者");
		expect(result).toEqual({ name: "テスト", author: "作者" });
	});

	it("空キー行をスキップする", () => {
		const result = parseDescript(",値のみ\nname,テスト");
		expect(result).toEqual({ name: "テスト" });
	});

	it("空入力で空オブジェクトを返す", () => {
		expect(parseDescript("")).toEqual({});
	});

	it("キー重複時は後の値で上書きする", () => {
		const result = parseDescript("name,最初\nname,上書き");
		expect(result).toEqual({ name: "上書き" });
	});

	it("CR+LF の改行を正しく処理する", () => {
		const result = parseDescript("name,テスト\r\ncraftman,作者");
		expect(result).toEqual({ name: "テスト", craftman: "作者" });
	});
});

describe("buildGhostMeta", () => {
	it("各フィールドを正しくマッピングする", () => {
		const props = {
			name: "テストゴースト",
			craftman: "作者",
			"sakura.name": "さくら",
			"kero.name": "うにゅう",
		};
		const meta = buildGhostMeta(props);
		expect(meta.name).toBe("テストゴースト");
		expect(meta.author).toBe("作者");
		expect(meta.sakuraName).toBe("さくら");
		expect(meta.keroName).toBe("うにゅう");
	});

	it("craftmanw を craftman より優先する", () => {
		const meta = buildGhostMeta({ craftman: "旧名", craftmanw: "新名" });
		expect(meta.author).toBe("新名");
	});

	it("craftmanw がない場合 craftman にフォールバックする", () => {
		const meta = buildGhostMeta({ craftman: "作者名" });
		expect(meta.author).toBe("作者名");
	});

	it("未定義キーは空文字列をデフォルト値とする", () => {
		const meta = buildGhostMeta({});
		expect(meta.name).toBe("");
		expect(meta.author).toBe("");
		expect(meta.sakuraName).toBe("");
		expect(meta.keroName).toBe("");
	});

	it("properties に全キーを含む", () => {
		const props = { name: "テスト", custom: "カスタム値", shiori: "yaya.dll" };
		const meta = buildGhostMeta(props);
		expect(meta.properties).toEqual(props);
	});
});

describe("parseDescriptFromBuffer", () => {
	it("UTF-8 の ArrayBuffer から GhostMeta を構築する", () => {
		const text = "name,テストゴースト\ncraftman,作者\nsakura.name,さくら";
		const buffer = new TextEncoder().encode(text).buffer as ArrayBuffer;
		const meta = parseDescriptFromBuffer(buffer);
		expect(meta.name).toBe("テストゴースト");
		expect(meta.author).toBe("作者");
		expect(meta.sakuraName).toBe("さくら");
	});

	it("Shift_JIS の ArrayBuffer から GhostMeta を構築する", () => {
		// Shift_JIS でエンコードされた "name,テスト" を構築
		const sjisBytes = new Uint8Array([
			// "name," in ASCII
			0x6e, 0x61, 0x6d, 0x65, 0x2c,
			// "テスト" in Shift_JIS: テ=0x8365, ス=0x8358, ト=0x8367
			0x83, 0x65, 0x83, 0x58, 0x83, 0x67,
		]);
		const buffer = sjisBytes.buffer as ArrayBuffer;
		const meta = parseDescriptFromBuffer(buffer);
		expect(meta.name).toBe("テスト");
	});
});
