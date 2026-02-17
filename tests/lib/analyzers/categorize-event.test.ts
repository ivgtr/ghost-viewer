import { categorizeEvent, getCategoryOrder } from "@/lib/analyzers/categorize-event";
import { describe, expect, it } from "vitest";

describe("categorizeEvent", () => {
	it("aitalk → ランダムトーク", () => {
		expect(categorizeEvent("aitalk")).toBe("ランダムトーク");
	});

	it("others → ランダムトーク", () => {
		expect(categorizeEvent("others")).toBe("ランダムトーク");
	});

	it("OnBoot → 起動・終了", () => {
		expect(categorizeEvent("OnBoot")).toBe("起動・終了");
	});

	it("OnClose → 起動・終了", () => {
		expect(categorizeEvent("OnClose")).toBe("起動・終了");
	});

	it("OnFirstBoot → 起動・終了", () => {
		expect(categorizeEvent("OnFirstBoot")).toBe("起動・終了");
	});

	it("OnGhostChanged → 起動・終了", () => {
		expect(categorizeEvent("OnGhostChanged")).toBe("起動・終了");
	});

	it("OnMouseClick → マウス", () => {
		expect(categorizeEvent("OnMouseClick")).toBe("マウス");
	});

	it("OnMouseDoubleClick → マウス", () => {
		expect(categorizeEvent("OnMouseDoubleClick")).toBe("マウス");
	});

	it("OnSecondChange → 時間", () => {
		expect(categorizeEvent("OnSecondChange")).toBe("時間");
	});

	it("OnMinuteChange → 時間", () => {
		expect(categorizeEvent("OnMinuteChange")).toBe("時間");
	});

	it("OnHourChange → 時間", () => {
		expect(categorizeEvent("OnHourChange")).toBe("時間");
	});

	it("OnChoiceSelect → 選択肢", () => {
		expect(categorizeEvent("OnChoiceSelect")).toBe("選択肢");
	});

	it("OnCommunicate → コミュニケート", () => {
		expect(categorizeEvent("OnCommunicate")).toBe("コミュニケート");
	});

	it("OnCommunicateEx → コミュニケート", () => {
		expect(categorizeEvent("OnCommunicateEx")).toBe("コミュニケート");
	});

	it("未知のイベント → その他", () => {
		expect(categorizeEvent("CustomEvent")).toBe("その他");
	});

	it("空文字列 → その他", () => {
		expect(categorizeEvent("")).toBe("その他");
	});
});

describe("getCategoryOrder", () => {
	it("7つのカテゴリを正しい順序で返す", () => {
		const order = getCategoryOrder();
		expect(order).toEqual([
			"ランダムトーク",
			"起動・終了",
			"マウス",
			"時間",
			"選択肢",
			"コミュニケート",
			"その他",
		]);
	});
});
