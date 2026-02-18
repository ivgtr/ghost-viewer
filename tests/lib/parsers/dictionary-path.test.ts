import {
	isBatchParseTargetPath,
	isDicPath,
	isSatoriDicTxtPath,
	isShioriDetectTargetPath,
	normalizeArchivePath,
} from "@/lib/parsers/dictionary-path";
import { describe, expect, it } from "vitest";

describe("normalizeArchivePath", () => {
	it("バックスラッシュをスラッシュに変換する", () => {
		expect(normalizeArchivePath("ghost\\master\\dic01.txt")).toBe("ghost/master/dic01.txt");
	});
});

describe("isDicPath", () => {
	it(".dic は true", () => {
		expect(isDicPath("ghost/master/main.dic")).toBe(true);
	});

	it(".DIC は true", () => {
		expect(isDicPath("ghost/master/main.DIC")).toBe(true);
	});

	it(".txt は false", () => {
		expect(isDicPath("ghost/master/dic01.txt")).toBe(false);
	});
});

describe("isSatoriDicTxtPath", () => {
	it("ghost/master/dic01_Base.txt は true", () => {
		expect(isSatoriDicTxtPath("ghost/master/dic01_Base.txt")).toBe(true);
	});

	it("ghost/master/another/dic1.txt は true", () => {
		expect(isSatoriDicTxtPath("ghost/master/another/dic1.txt")).toBe(true);
	});

	it("ghost/master/descript.txt は false", () => {
		expect(isSatoriDicTxtPath("ghost/master/descript.txt")).toBe(false);
	});

	it("shell/master/dic01.txt は false", () => {
		expect(isSatoriDicTxtPath("shell/master/dic01.txt")).toBe(false);
	});
});

describe("isBatchParseTargetPath", () => {
	it("satori は dic*.txt を対象に含む", () => {
		expect(isBatchParseTargetPath("ghost/master/dic01.txt", "satori")).toBe(true);
	});

	it("yaya は dic*.txt を対象に含まない", () => {
		expect(isBatchParseTargetPath("ghost/master/dic01.txt", "yaya")).toBe(false);
	});

	it("対応 SHIORI で .dic は対象", () => {
		expect(isBatchParseTargetPath("ghost/master/main.dic", "satori")).toBe(true);
		expect(isBatchParseTargetPath("ghost/master/main.dic", "yaya")).toBe(true);
	});
});

describe("isShioriDetectTargetPath", () => {
	it(".dic は判別対象", () => {
		expect(isShioriDetectTargetPath("ghost/master/main.dic")).toBe(true);
	});

	it("ghost/master/dic*.txt は判別対象", () => {
		expect(isShioriDetectTargetPath("ghost/master/dic01.txt")).toBe(true);
	});

	it("ghost/master/descript.txt は判別対象外", () => {
		expect(isShioriDetectTargetPath("ghost/master/descript.txt")).toBe(false);
	});

	it("ghost/master 外の .dic は判別対象外", () => {
		expect(isShioriDetectTargetPath("other/path/main.dic")).toBe(false);
	});
});
