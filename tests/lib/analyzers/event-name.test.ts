import { isEmptyEventName, isEventSelected, toEventDisplayName } from "@/lib/analyzers/event-name";
import { describe, expect, it } from "vitest";

describe("isEventSelected", () => {
	it("null は未選択", () => {
		expect(isEventSelected(null)).toBe(false);
	});

	it("空文字は選択済み", () => {
		expect(isEventSelected("")).toBe(true);
	});
});

describe("toEventDisplayName", () => {
	it("空文字は無名イベント表示に変換する", () => {
		expect(toEventDisplayName("")).toBe("（無名イベント）");
	});

	it("通常イベント名はそのまま返す", () => {
		expect(toEventDisplayName("OnBoot")).toBe("OnBoot");
	});
});

describe("isEmptyEventName", () => {
	it("空文字は true", () => {
		expect(isEmptyEventName("")).toBe(true);
	});

	it("空白のみは true", () => {
		expect(isEmptyEventName("  ")).toBe(true);
	});

	it("文字が含まれる場合は false", () => {
		expect(isEmptyEventName("OnBoot")).toBe(false);
	});
});
