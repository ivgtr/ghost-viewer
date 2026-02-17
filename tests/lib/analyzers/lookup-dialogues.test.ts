import {
	lookupDialoguesByFunctionName,
	lookupSourceLocation,
} from "@/lib/analyzers/lookup-dialogues";
import type { DicFunction } from "@/types/shiori";
import { describe, expect, it } from "vitest";

function makeFn(name: string, dialogueCount: number, filePath = "test.dic"): DicFunction {
	const dialogues = Array.from({ length: dialogueCount }, (_, i) => ({
		tokens: [{ tokenType: "text" as const, raw: `text${i}`, value: `text${i}`, offset: 0 }],
		startLine: i * 10,
		endLine: i * 10 + 5,
		rawText: `text${i}`,
	}));
	return { name, filePath, startLine: 0, endLine: 10, dialogues };
}

describe("lookupDialoguesByFunctionName", () => {
	it("単一関数 → そのダイアログ配列", () => {
		const functions = [makeFn("OnBoot", 2)];
		const result = lookupDialoguesByFunctionName("OnBoot", functions);
		expect(result).toHaveLength(2);
		expect(result[0].rawText).toBe("text0");
		expect(result[1].rawText).toBe("text1");
	});

	it("同名複数関数 → ダイアログ結合", () => {
		const functions = [makeFn("OnBoot", 1), makeFn("OnBoot", 2)];
		const result = lookupDialoguesByFunctionName("OnBoot", functions);
		expect(result).toHaveLength(3);
	});

	it("存在しない関数名 → 空配列", () => {
		const functions = [makeFn("OnBoot", 1)];
		const result = lookupDialoguesByFunctionName("OnNotExist", functions);
		expect(result).toEqual([]);
	});
});

describe("lookupSourceLocation", () => {
	it("単一関数の dialogue index からソース位置を返す", () => {
		const functions = [makeFn("OnBoot", 3, "ghost/master/dic/boot.dic")];
		const result = lookupSourceLocation("OnBoot", 1, functions);
		expect(result).toEqual({
			filePath: "ghost/master/dic/boot.dic",
			startLine: 10,
			endLine: 15,
		});
	});

	it("同名複数関数の場合に正しい関数の dialogue を返す", () => {
		const functions = [
			makeFn("OnBoot", 2, "ghost/master/dic/a.dic"),
			makeFn("OnBoot", 3, "ghost/master/dic/b.dic"),
		];
		// index 0,1 → a.dic、index 2,3,4 → b.dic
		const result = lookupSourceLocation("OnBoot", 2, functions);
		expect(result).toEqual({
			filePath: "ghost/master/dic/b.dic",
			startLine: 0,
			endLine: 5,
		});
	});

	it("範囲外の index で null を返す", () => {
		const functions = [makeFn("OnBoot", 2)];
		const result = lookupSourceLocation("OnBoot", 5, functions);
		expect(result).toBeNull();
	});

	it("存在しない関数名で null を返す", () => {
		const functions = [makeFn("OnBoot", 1)];
		const result = lookupSourceLocation("OnNotExist", 0, functions);
		expect(result).toBeNull();
	});
});
