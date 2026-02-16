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
			meta: { name: "test", author: "", sakuraName: "", keroName: "", properties: {} },
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
});
