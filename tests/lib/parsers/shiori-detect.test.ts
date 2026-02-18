import {
	detectShioriByContent,
	detectShioriByDll,
	detectShioriType,
} from "@/lib/parsers/shiori-detect";
import { describe, expect, it } from "vitest";

describe("detectShioriByDll", () => {
	it.each([
		["yaya.dll", "yaya"],
		["aya5.dll", "yaya"],
		["aya.dll", "yaya"],
		["satori.dll", "satori"],
		["kawari.dll", "kawari"],
		["kawarirc.dll", "kawari"],
	])("%s → %s", (dll, expected) => {
		expect(detectShioriByDll(dll)).toBe(expected);
	});

	it("大文字小文字を区別しない", () => {
		expect(detectShioriByDll("YAYA.DLL")).toBe("yaya");
		expect(detectShioriByDll("Satori.dll")).toBe("satori");
	});

	it("前後の空白をトリムする", () => {
		expect(detectShioriByDll("  yaya.dll  ")).toBe("yaya");
	});

	it("未知の DLL 名は null を返す", () => {
		expect(detectShioriByDll("unknown.dll")).toBeNull();
	});

	it("空文字列は null を返す", () => {
		expect(detectShioriByDll("")).toBeNull();
	});
});

describe("detectShioriByContent", () => {
	it("YAYA 構文を含むテキスト → yaya", () => {
		const text = [
			"OnBoot",
			"{",
			"  if RAND(2) == 0",
			'    return "こんにちは"',
			"  else",
			'    return "やっほー"',
			"}",
		].join("\n");
		expect(detectShioriByContent([text])).toBe("yaya");
	});

	it("Satori 構文を含むテキスト → satori", () => {
		const text = ["\uFF0AOnBoot", "\uFF1Aこんにちは", "\uFF0AOnClose", "\uFF1Aさようなら"].join(
			"\n",
		);
		expect(detectShioriByContent([text])).toBe("satori");
	});

	it("混在時はスコアが大きい方を返す", () => {
		const yayaHeavy = ["{", "return", "if", "else", "}", "\uFF0Aイベント"].join("\n");
		expect(detectShioriByContent([yayaHeavy])).toBe("yaya");

		const satoriHeavy = [
			"\uFF0Aイベント1",
			"\uFF1A応答1",
			"\uFF0Aイベント2",
			"\uFF1A応答2",
			"{",
		].join("\n");
		expect(detectShioriByContent([satoriHeavy])).toBe("satori");
	});

	it("パターンなし → null", () => {
		expect(detectShioriByContent(["ただのテキスト"])).toBeNull();
	});

	it("空配列 → null", () => {
		expect(detectShioriByContent([])).toBeNull();
	});
});

describe("detectShioriType", () => {
	function toBuffer(text: string): ArrayBuffer {
		return new TextEncoder().encode(text).buffer as ArrayBuffer;
	}

	it("DLL 名で優先的に判別する", () => {
		const fileContents = new Map<string, ArrayBuffer>();
		const properties = { shiori: "yaya.dll" };
		expect(detectShioriType(fileContents, properties)).toBe("yaya");
	});

	it("DLL 名が不明な場合 dic の内容でフォールバックする", () => {
		const dicContent = "OnBoot\n{\n  return\n}\n";
		const fileContents = new Map<string, ArrayBuffer>([
			["ghost/master/dic01.dic", toBuffer(dicContent)],
		]);
		expect(detectShioriType(fileContents, {})).toBe("yaya");
	});

	it("DLL 名が不明な場合 ghost/master/dic*.txt の内容でフォールバックする", () => {
		const satoriContent = "\uFF0AOnBoot\n\uFF1Aこんにちは\n";
		const fileContents = new Map<string, ArrayBuffer>([
			["ghost/master/dic01.txt", toBuffer(satoriContent)],
		]);
		expect(detectShioriType(fileContents, {})).toBe("satori");
	});

	it("判別不能時は unknown を返す", () => {
		const fileContents = new Map<string, ArrayBuffer>();
		expect(detectShioriType(fileContents, {})).toBe("unknown");
	});

	it("ghost/master/ 外の dic は無視する", () => {
		const dicContent = "\uFF0AOnBoot\n\uFF1Aこんにちは\n";
		const fileContents = new Map<string, ArrayBuffer>([
			["other/path/dic01.dic", toBuffer(dicContent)],
		]);
		expect(detectShioriType(fileContents, {})).toBe("unknown");
	});
});
