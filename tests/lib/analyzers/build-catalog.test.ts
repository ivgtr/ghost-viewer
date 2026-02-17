import { buildCatalogEntries } from "@/lib/analyzers/build-catalog";
import type { DicFunction, SakuraScriptToken } from "@/types";
import { describe, expect, it } from "vitest";

function token(tokenType: SakuraScriptToken["tokenType"], value: string): SakuraScriptToken {
	return { tokenType, raw: value, value, offset: 0 };
}

function makeFn(
	name: string,
	tokens: SakuraScriptToken[] = [],
	filePath = "test.dic",
): DicFunction {
	return {
		name,
		filePath,
		startLine: 1,
		endLine: 10,
		dialogues: tokens.length > 0 ? [{ tokens, startLine: 1, endLine: 10, rawText: "" }] : [],
	};
}

describe("buildCatalogEntries", () => {
	it("空配列を渡すと空のエントリを返す", () => {
		const entries = buildCatalogEntries([]);
		expect(entries).toEqual([]);
	});

	it("テキストトークンからプレビューを生成する", () => {
		const tokens = [token("text", "Hello"), token("text", " World")];
		const entries = buildCatalogEntries([makeFn("OnBoot", tokens)]);
		expect(entries).toHaveLength(1);
		expect(entries[0].name).toBe("OnBoot");
		expect(entries[0].preview).toBe("Hello World");
	});

	it("50文字を超えるプレビューを切り捨てる", () => {
		const longText = "a".repeat(60);
		const tokens = [token("text", longText)];
		const entries = buildCatalogEntries([makeFn("OnBoot", tokens)]);
		expect(entries[0].preview).toBe(`${"a".repeat(50)}...`);
	});

	it("同名関数のダイアログを結合する", () => {
		const fn1 = makeFn("OnBoot", [token("text", "Hello")], "file1.dic");
		const fn2 = makeFn("OnBoot", [token("text", "World")], "file2.dic");
		const entries = buildCatalogEntries([fn1, fn2]);
		expect(entries).toHaveLength(1);
		expect(entries[0].dialogueCount).toBe(2);
		expect(entries[0].preview).toBe("Hello");
	});

	it("ダイアログ数を正しくカウントする", () => {
		const fn = makeFn("OnBoot", [token("text", "Hi")]);
		const entries = buildCatalogEntries([fn]);
		expect(entries[0].dialogueCount).toBe(1);
	});

	it("ダイアログなしの関数は結果から除外される", () => {
		const entries = buildCatalogEntries([makeFn("OnBoot")]);
		expect(entries).toEqual([]);
	});

	it("会話数降順でソートする（同数なら名前順）", () => {
		const fn1 = makeFn("Alpha", [token("text", "a")]);
		const fn2 = makeFn("Zebra", [token("text", "z1")]);
		fn2.dialogues.push({ tokens: [token("text", "z2")], startLine: 2, endLine: 3, rawText: "" });
		fn2.dialogues.push({ tokens: [token("text", "z3")], startLine: 4, endLine: 5, rawText: "" });
		const fn3 = makeFn("Middle", [token("text", "m1")]);
		fn3.dialogues.push({ tokens: [token("text", "m2")], startLine: 2, endLine: 3, rawText: "" });
		const entries = buildCatalogEntries([fn1, fn2, fn3]);
		expect(entries.map((e) => e.name)).toEqual(["Zebra", "Middle", "Alpha"]);
		expect(entries.map((e) => e.dialogueCount)).toEqual([3, 2, 1]);
	});
});
