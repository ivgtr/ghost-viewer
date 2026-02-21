import { findFirstNonZeroSpeaker } from "@/lib/analyzers/find-first-speaker";
import type { ChatMessage } from "@/types/chat-message";
import { describe, expect, it } from "vitest";

describe("findFirstNonZeroSpeaker", () => {
	it("空メッセージ配列で null を返す", () => {
		expect(findFirstNonZeroSpeaker([])).toBe(null);
	});

	it("scope 0 のみの場合 null を返す", () => {
		const messages: ChatMessage[] = [
			{ characterId: 0, segments: [] },
			{ characterId: 0, segments: [] },
		];
		expect(findFirstNonZeroSpeaker(messages)).toBe(null);
	});

	it("scope 0 → scope 1 の場合 1 を返す", () => {
		const messages: ChatMessage[] = [
			{ characterId: 0, segments: [] },
			{ characterId: 1, segments: [] },
		];
		expect(findFirstNonZeroSpeaker(messages)).toBe(1);
	});

	it("scope 3 が先頭の場合 3 を返す", () => {
		const messages: ChatMessage[] = [
			{ characterId: 3, segments: [] },
			{ characterId: 0, segments: [] },
		];
		expect(findFirstNonZeroSpeaker(messages)).toBe(3);
	});
});
