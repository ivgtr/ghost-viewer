import { useParseStore } from "@/stores/parse-store";
import type { ParseResult } from "@/types";
import { beforeEach, describe, expect, it } from "vitest";

describe("parseStore", () => {
	beforeEach(() => {
		useParseStore.getState().reset();
	});

	it("初期状態が正しい", () => {
		const state = useParseStore.getState();
		expect(state.parseResult).toBeNull();
		expect(state.isParsing).toBe(false);
		expect(state.parseError).toBeNull();
		expect(state.parsedFileCount).toBe(0);
		expect(state.totalFileCount).toBe(0);
	});

	it("startBatchParse で isParsing が true になり parseError がクリアされカウントが初期化される", () => {
		useParseStore.getState().failParse("previous error");
		useParseStore.getState().startBatchParse(10);

		const state = useParseStore.getState();
		expect(state.isParsing).toBe(true);
		expect(state.parseError).toBeNull();
		expect(state.parsedFileCount).toBe(0);
		expect(state.totalFileCount).toBe(10);
	});

	it("succeedParse で結果が設定され isParsing が false になる", () => {
		const result: ParseResult = {
			shioriType: "yaya",
			functions: [],
			meta: null,
			diagnostics: [],
		};
		useParseStore.getState().startBatchParse(1);
		useParseStore.getState().succeedParse(result);

		const state = useParseStore.getState();
		expect(state.parseResult).toEqual(result);
		expect(state.isParsing).toBe(false);
	});

	it("failParse でエラーが設定され isParsing が false になる", () => {
		useParseStore.getState().startBatchParse(5);
		useParseStore.getState().incrementParsedCount();
		useParseStore.getState().failParse("parse failed");

		const state = useParseStore.getState();
		expect(state.parseError).toBe("parse failed");
		expect(state.isParsing).toBe(false);
	});

	it("reset で初期状態に戻る", () => {
		const result: ParseResult = {
			shioriType: "satori",
			functions: [],
			meta: { name: "test", author: "", characterNames: {}, properties: {} },
			diagnostics: [],
		};
		useParseStore.getState().succeedParse(result);
		useParseStore.getState().reset();

		const state = useParseStore.getState();
		expect(state.parseResult).toBeNull();
		expect(state.isParsing).toBe(false);
		expect(state.parseError).toBeNull();
		expect(state.parsedFileCount).toBe(0);
		expect(state.totalFileCount).toBe(0);
	});

	it("incrementParsedCount で parsedFileCount がインクリメントされる", () => {
		useParseStore.getState().startBatchParse(5);
		useParseStore.getState().incrementParsedCount();

		expect(useParseStore.getState().parsedFileCount).toBe(1);

		useParseStore.getState().incrementParsedCount();
		expect(useParseStore.getState().parsedFileCount).toBe(2);
	});

	it("succeedParse で surfaceIdsByScope が正しく導出される", () => {
		const result: ParseResult = {
			shioriType: "yaya",
			functions: [
				{
					name: "OnBoot",
					filePath: "dic00.dic",
					startLine: 0,
					endLine: 0,
					dialogues: [
						{
							tokens: [
								{ tokenType: "surface", raw: "\\s[0]", value: "0", offset: 0 },
								{ tokenType: "charSwitch", raw: "\\1", value: "1", offset: 0 },
								{ tokenType: "surface", raw: "\\s[10]", value: "10", offset: 0 },
							],
							startLine: 0,
							endLine: 0,
							rawText: "",
						},
					],
				},
			],
			meta: null,
			diagnostics: [],
		};
		useParseStore.getState().succeedParse(result);
		const state = useParseStore.getState();
		expect(state.surfaceIdsByScope.get(0)).toEqual([0]);
		expect(state.surfaceIdsByScope.get(1)).toEqual([10]);
	});

	it("reset 後に surfaceIdsByScope が空 Map になる", () => {
		const result: ParseResult = {
			shioriType: "yaya",
			functions: [
				{
					name: "OnBoot",
					filePath: "dic00.dic",
					startLine: 0,
					endLine: 0,
					dialogues: [
						{
							tokens: [{ tokenType: "surface", raw: "\\s[5]", value: "5", offset: 0 }],
							startLine: 0,
							endLine: 0,
							rawText: "",
						},
					],
				},
			],
			meta: null,
			diagnostics: [],
		};
		useParseStore.getState().succeedParse(result);
		useParseStore.getState().reset();
		expect(useParseStore.getState().surfaceIdsByScope.size).toBe(0);
	});

	it("空の functions 配列で surfaceIdsByScope が空 Map になる", () => {
		const result: ParseResult = {
			shioriType: "yaya",
			functions: [],
			meta: null,
			diagnostics: [],
		};
		useParseStore.getState().succeedParse(result);
		expect(useParseStore.getState().surfaceIdsByScope.size).toBe(0);
	});
});
