import {
	analyzeConversationSurfaces,
	collectSurfaceIdsByScope,
} from "@/lib/analyzers/analyze-conversation-surfaces";
import type { ChatMessage } from "@/types/chat-message";
import type { DicFunction } from "@/types/shiori";
import { describe, expect, it } from "vitest";

describe("analyzeConversationSurfaces", () => {
	it("空メッセージ配列", () => {
		const result = analyzeConversationSurfaces([]);
		expect(result).toEqual({ firstByScope: [] });
	});

	it("surface なし（テキストのみ）", () => {
		const messages: ChatMessage[] = [
			{
				characterId: 0,
				segments: [{ type: "text", value: "hello" }],
			},
		];
		const result = analyzeConversationSurfaces(messages);
		expect(result).toEqual({ firstByScope: [] });
	});

	it("単一 scope 単一 surface", () => {
		const messages: ChatMessage[] = [
			{
				characterId: 0,
				segments: [{ type: "surface", value: "\\s[0]", surfaceId: 0, syncId: "a", scopeId: 0 }],
			},
		];
		const result = analyzeConversationSurfaces(messages);
		expect(result.firstByScope).toEqual([{ scopeId: 0, requestedSurfaceId: 0 }]);
	});

	it("surfaceId === null はスキップ", () => {
		const messages: ChatMessage[] = [
			{
				characterId: 0,
				segments: [
					{ type: "surface", value: "\\s[0]", surfaceId: null, syncId: "a", scopeId: 0 },
					{ type: "surface", value: "\\s[5]", surfaceId: 5, syncId: "b", scopeId: 0 },
				],
			},
		];
		const result = analyzeConversationSurfaces(messages);
		expect(result.firstByScope).toEqual([{ scopeId: 0, requestedSurfaceId: 5 }]);
	});

	it("複数 scope で firstByScope を正しく集計", () => {
		const messages: ChatMessage[] = [
			{
				characterId: 0,
				segments: [
					{ type: "surface", value: "\\s[0]", surfaceId: 0, syncId: "a", scopeId: 0 },
					{ type: "surface", value: "\\s[5]", surfaceId: 5, syncId: "b", scopeId: 0 },
				],
			},
			{
				characterId: 1,
				segments: [
					{ type: "surface", value: "\\s[10]", surfaceId: 10, syncId: "c", scopeId: 1 },
					{ type: "surface", value: "\\s[0]", surfaceId: 0, syncId: "d", scopeId: 1 },
				],
			},
		];
		const result = analyzeConversationSurfaces(messages);
		expect(result.firstByScope).toEqual([
			{ scopeId: 0, requestedSurfaceId: 0 },
			{ scopeId: 1, requestedSurfaceId: 10 },
		]);
	});
});

describe("collectSurfaceIdsByScope", () => {
	function makeToken(tokenType: string, value: string) {
		return { tokenType, raw: "", value, offset: 0 } as DicFunction["dialogues"][0]["tokens"][0];
	}

	function makeFn(dialogueTokens: DicFunction["dialogues"][0]["tokens"][]): DicFunction {
		return {
			name: "test",
			filePath: "test.dic",
			startLine: 0,
			endLine: 0,
			dialogues: dialogueTokens.map((tokens) => ({
				tokens,
				startLine: 0,
				endLine: 0,
				rawText: "",
			})),
		};
	}

	it("空の関数配列 → size 0", () => {
		const result = collectSurfaceIdsByScope([]);
		expect(result.size).toBe(0);
	});

	it("scope 0 のみの surface 収集", () => {
		const fn = makeFn([[makeToken("surface", "0"), makeToken("surface", "5")]]);
		const result = collectSurfaceIdsByScope([fn]);
		expect(result.get(0)).toEqual([0, 5]);
		expect(result.has(1)).toBe(false);
	});

	it("charSwitch で scope を切り替え、複数 scope を収集", () => {
		const fn = makeFn([
			[
				makeToken("surface", "0"),
				makeToken("charSwitch", "1"),
				makeToken("surface", "10"),
				makeToken("charSwitch", "0"),
				makeToken("surface", "3"),
			],
		]);
		const result = collectSurfaceIdsByScope([fn]);
		expect(result.get(0)).toEqual([0, 3]);
		expect(result.get(1)).toEqual([10]);
	});

	it("複数関数・複数ダイアログ横断で集約", () => {
		const fn1 = makeFn([[makeToken("surface", "0")], [makeToken("surface", "2")]]);
		const fn2 = makeFn([[makeToken("charSwitch", "1"), makeToken("surface", "10")]]);
		const result = collectSurfaceIdsByScope([fn1, fn2]);
		expect(result.get(0)).toEqual([0, 2]);
		expect(result.get(1)).toEqual([10]);
	});

	it("不正な surfaceId（非整数）はスキップ", () => {
		const fn = makeFn([[makeToken("surface", "abc"), makeToken("surface", "3")]]);
		const result = collectSurfaceIdsByScope([fn]);
		expect(result.get(0)).toEqual([3]);
	});

	it("不正な charSwitch（NaN / 負数）は無視し直前 scope を維持", () => {
		const fn = makeFn([
			[
				makeToken("surface", "0"),
				makeToken("charSwitch", "abc"),
				makeToken("surface", "1"),
				makeToken("charSwitch", "-1"),
				makeToken("surface", "2"),
			],
		]);
		const result = collectSurfaceIdsByScope([fn]);
		expect(result.get(0)).toEqual([0, 1, 2]);
		expect(result.has(1)).toBe(false);
	});

	it("重複する surfaceId は排除される", () => {
		const fn = makeFn([
			[makeToken("surface", "5"), makeToken("surface", "5"), makeToken("surface", "3")],
		]);
		const result = collectSurfaceIdsByScope([fn]);
		expect(result.get(0)).toEqual([3, 5]);
	});
});
