import { describe, expect, it } from "vitest";

import { decodeWithAutoDetection } from "@/lib/encoding/detect";

function toBuffer(bytes: number[]): ArrayBuffer {
	return new Uint8Array(bytes).buffer;
}

describe("decodeWithAutoDetection", () => {
	it("空 ArrayBuffer → 空文字列 + UTF-8", () => {
		const result = decodeWithAutoDetection(new ArrayBuffer(0));
		expect(result.text).toBe("");
		expect(result.encoding).toBe("utf-8");
	});

	it("UTF-8 BOM 付き → UTF-8", () => {
		const bom = [0xef, 0xbb, 0xbf];
		const text = new TextEncoder().encode("hello");
		const bytes = new Uint8Array([...bom, ...text]);
		const result = decodeWithAutoDetection(bytes.buffer);
		expect(result.encoding).toBe("utf-8");
		expect(result.text).toContain("hello");
	});

	it("UTF-8 ASCII テキスト → UTF-8", () => {
		const buffer = new TextEncoder().encode("hello world").buffer;
		const result = decodeWithAutoDetection(buffer);
		expect(result.encoding).toBe("utf-8");
		expect(result.text).toBe("hello world");
	});

	it("UTF-8 日本語テキスト → UTF-8", () => {
		const buffer = new TextEncoder().encode("こんにちは世界").buffer;
		const result = decodeWithAutoDetection(buffer);
		expect(result.encoding).toBe("utf-8");
		expect(result.text).toBe("こんにちは世界");
	});

	it("Shift_JIS 日本語 → Shift_JIS", () => {
		// 「あいうえお」in Shift_JIS
		const buffer = toBuffer([0x82, 0xa0, 0x82, 0xa2, 0x82, 0xa4, 0x82, 0xa6, 0x82, 0xa8]);
		const result = decodeWithAutoDetection(buffer);
		expect(result.encoding).toBe("shift_jis");
		expect(result.text).toBe("あいうえお");
	});

	it("EUC-JP 日本語 → EUC-JP", () => {
		// 「こんにちは」in EUC-JP
		const buffer = toBuffer([0xa4, 0xb3, 0xa4, 0xf3, 0xa4, 0xcb, 0xa4, 0xc1, 0xa4, 0xcf]);
		const result = decodeWithAutoDetection(buffer);
		expect(result.encoding).toBe("euc-jp");
		expect(result.text).toBe("こんにちは");
	});

	it("曖昧な短文（同点）→ Shift_JIS（ドメイン優先）", () => {
		// 0xE0, 0xA1 は Shift_JIS でも EUC-JP でも漢字1文字になる
		const buffer = toBuffer([0xe0, 0xa1]);
		const result = decodeWithAutoDetection(buffer);
		expect(result.encoding).toBe("shift_jis");
	});

	it("バイナリ: PNG ヘッダ → Error throw", () => {
		const buffer = toBuffer([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
		expect(() => decodeWithAutoDetection(buffer)).toThrow("バイナリファイル");
	});

	it("バイナリ: JPEG ヘッダ → Error throw", () => {
		const buffer = toBuffer([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
		expect(() => decodeWithAutoDetection(buffer)).toThrow("バイナリファイル");
	});

	it("バイナリ: ヌルバイト含むデータ → Error throw", () => {
		const buffer = toBuffer([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x00, 0x57, 0x6f, 0x72, 0x6c, 0x64]);
		expect(() => decodeWithAutoDetection(buffer)).toThrow("バイナリファイル");
	});

	it("バイナリ: 制御文字過多データ → Error throw", () => {
		// 50% 制御文字
		const bytes: number[] = [];
		for (let i = 0; i < 100; i++) {
			bytes.push(i % 2 === 0 ? 0x01 : 0x41);
		}
		const buffer = toBuffer(bytes);
		expect(() => decodeWithAutoDetection(buffer)).toThrow("バイナリファイル");
	});

	it("バイナリ: PE/DLL ヘッダ → Error throw", () => {
		const buffer = toBuffer([0x4d, 0x5a, 0x90, 0x00]);
		expect(() => decodeWithAutoDetection(buffer)).toThrow("バイナリファイル");
	});
});
