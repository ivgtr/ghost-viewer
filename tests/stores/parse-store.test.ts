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
		expect(state.parseProgress).toBe(0);
	});

	it("startParse で isParsing が true になり parseError がクリアされ parseProgress が 0 にリセットされる", () => {
		useParseStore.getState().failParse("previous error");
		useParseStore.getState().startParse();

		const state = useParseStore.getState();
		expect(state.isParsing).toBe(true);
		expect(state.parseError).toBeNull();
		expect(state.parseProgress).toBe(0);
	});

	it("succeedParse で結果が設定され isParsing が false になり parseProgress が 100 になる", () => {
		const result: ParseResult = {
			shioriType: "yaya",
			functions: [],
			meta: null,
		};
		useParseStore.getState().startParse();
		useParseStore.getState().succeedParse(result);

		const state = useParseStore.getState();
		expect(state.parseResult).toEqual(result);
		expect(state.isParsing).toBe(false);
		expect(state.parseProgress).toBe(100);
	});

	it("failParse でエラーが設定され isParsing が false になり parseProgress が 0 に戻る", () => {
		useParseStore.getState().startParse();
		useParseStore.getState().updateProgress(50);
		useParseStore.getState().failParse("parse failed");

		const state = useParseStore.getState();
		expect(state.parseError).toBe("parse failed");
		expect(state.isParsing).toBe(false);
		expect(state.parseProgress).toBe(0);
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
		expect(state.parseProgress).toBe(0);
	});

	it("updateProgress で parseProgress が更新される", () => {
		useParseStore.getState().startParse();
		useParseStore.getState().updateProgress(42);

		expect(useParseStore.getState().parseProgress).toBe(42);

		useParseStore.getState().updateProgress(85);
		expect(useParseStore.getState().parseProgress).toBe(85);
	});
});
