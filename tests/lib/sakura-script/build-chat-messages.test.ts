import { buildChatMessages } from "@/lib/sakura-script/build-chat-messages";
import type { SakuraScriptToken } from "@/types/sakura-script";
import { describe, expect, it } from "vitest";

function token(
	tokenType: SakuraScriptToken["tokenType"],
	raw: string,
	value: string,
): SakuraScriptToken {
	return { tokenType, raw, value, offset: 0 };
}

describe("buildChatMessages", () => {
	it("空トークン → 空配列", () => {
		expect(buildChatMessages([])).toEqual([]);
	});

	it("text のみ → characterId=0 の単一メッセージ", () => {
		const tokens = [token("text", "こんにちは", "こんにちは")];
		const result = buildChatMessages(tokens);
		expect(result).toEqual([
			{
				characterId: 0,
				segments: [{ type: "text", value: "こんにちは" }],
			},
		]);
	});

	it("\\0 text \\1 text → 2メッセージに分割", () => {
		const tokens = [
			token("charSwitch", "\\0", "0"),
			token("text", "さくらです", "さくらです"),
			token("charSwitch", "\\1", "1"),
			token("text", "けろです", "けろです"),
		];
		const result = buildChatMessages(tokens);
		expect(result).toHaveLength(2);
		expect(result[0].characterId).toBe(0);
		expect(result[0].segments).toEqual([{ type: "text", value: "さくらです" }]);
		expect(result[1].characterId).toBe(1);
		expect(result[1].segments).toEqual([{ type: "text", value: "けろです" }]);
	});

	it("冒頭 \\0 のみ → 空メッセージ除外", () => {
		const tokens = [
			token("charSwitch", "\\0", "0"),
			token("charSwitch", "\\1", "1"),
			token("text", "やあ", "やあ"),
		];
		const result = buildChatMessages(tokens);
		expect(result).toHaveLength(1);
		expect(result[0].characterId).toBe(1);
	});

	it("surface が正しいセグメント型に変換される", () => {
		const tokens = [token("surface", "\\s[5]", "5"), token("text", "にこにこ", "にこにこ")];
		const result = buildChatMessages(tokens);
		expect(result[0].segments[0]).toEqual({ type: "surface", value: "5" });
	});

	it("choice が正しいセグメント型に変換される", () => {
		const tokens = [
			token("text", "選んで", "選んで"),
			token("choice", "\\q[はい,OnYes]", "はい,OnYes"),
		];
		const result = buildChatMessages(tokens);
		expect(result[0].segments[1]).toEqual({ type: "choice", value: "はい,OnYes" });
	});

	it("marker(\\n) が lineBreak セグメントに変換される", () => {
		const tokens = [
			token("text", "一行目", "一行目"),
			token("marker", "\\n", ""),
			token("text", "二行目", "二行目"),
		];
		const result = buildChatMessages(tokens);
		expect(result[0].segments).toEqual([
			{ type: "text", value: "一行目" },
			{ type: "lineBreak", value: "" },
			{ type: "text", value: "二行目" },
		]);
	});

	it("unknown / raise / marker(\\e) がスキップされる", () => {
		const tokens = [
			token("text", "テスト", "テスト"),
			token("unknown", "\\x", "\\x"),
			token("raise", "\\![raise,OnEvent]", "OnEvent"),
			token("marker", "\\e", ""),
		];
		const result = buildChatMessages(tokens);
		expect(result).toHaveLength(1);
		expect(result[0].segments).toEqual([{ type: "text", value: "テスト" }]);
	});

	it("wait がセグメントに含まれる", () => {
		const tokens = [token("text", "待って", "待って"), token("wait", "\\w5", "5")];
		const result = buildChatMessages(tokens);
		expect(result[0].segments).toEqual([
			{ type: "text", value: "待って" },
			{ type: "wait", value: "5" },
		]);
	});

	it("variable トークンが variable セグメントに変換される", () => {
		const tokens = [token("text", "今日は", "今日は"), token("variable", "%(weather)", "weather")];
		const result = buildChatMessages(tokens);
		expect(result[0].segments).toEqual([
			{ type: "text", value: "今日は" },
			{ type: "variable", value: "weather" },
		]);
	});

	it("variable のみのメッセージが空メッセージとして除外されない", () => {
		const tokens = [token("variable", "%(greeting)", "greeting")];
		const result = buildChatMessages(tokens);
		expect(result).toHaveLength(1);
		expect(result[0].segments).toEqual([{ type: "variable", value: "greeting" }]);
	});

	it("典型パターン \\0\\s[0]こんにちは\\1\\s[10]やあ の統合テスト", () => {
		const tokens = [
			token("charSwitch", "\\0", "0"),
			token("surface", "\\s[0]", "0"),
			token("text", "こんにちは", "こんにちは"),
			token("charSwitch", "\\1", "1"),
			token("surface", "\\s[10]", "10"),
			token("text", "やあ", "やあ"),
		];
		const result = buildChatMessages(tokens);
		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({
			characterId: 0,
			segments: [
				{ type: "surface", value: "0" },
				{ type: "text", value: "こんにちは" },
			],
		});
		expect(result[1]).toEqual({
			characterId: 1,
			segments: [
				{ type: "surface", value: "10" },
				{ type: "text", value: "やあ" },
			],
		});
	});
});
