import { filterCatalogEntries } from "@/lib/analyzers/search-catalog";
import type { CatalogEntry } from "@/types/catalog";
import { describe, expect, it } from "vitest";

import type { CatalogFilter } from "@/lib/analyzers/search-catalog";

function entry(overrides: Partial<CatalogEntry> & { name: string }): CatalogEntry {
	return {
		dialogueCount: 1,
		preview: "",
		category: "その他",
		searchText: "",
		...overrides,
	};
}

const defaultFilter: CatalogFilter = {
	query: "",
	matchMode: "partial",
	includeBody: false,
	enabledCategories: {},
};

describe("filterCatalogEntries", () => {
	const entries: CatalogEntry[] = [
		entry({ name: "OnBoot", category: "起動・終了", searchText: "起動しました" }),
		entry({ name: "OnClose", category: "起動・終了", searchText: "さようなら" }),
		entry({ name: "aitalk", category: "ランダムトーク", searchText: "今日はいい天気ですね" }),
		entry({ name: "OnMouseClick", category: "マウス", searchText: "触らないで" }),
		entry({ name: "", category: "その他", searchText: "無名イベント本文" }),
	];

	it("空クエリで全件返却", () => {
		const result = filterCatalogEntries(entries, defaultFilter);
		expect(result).toHaveLength(entries.length);
	});

	it("イベント名の部分一致", () => {
		const result = filterCatalogEntries(entries, {
			...defaultFilter,
			query: "Boot",
		});
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("OnBoot");
	});

	it("イベント名の前方一致", () => {
		const result = filterCatalogEntries(entries, {
			...defaultFilter,
			query: "On",
			matchMode: "prefix",
		});
		expect(result).toHaveLength(3);
		expect(result.map((e) => e.name)).toEqual(["OnBoot", "OnClose", "OnMouseClick"]);
	});

	it("イベント名の完全一致", () => {
		const result = filterCatalogEntries(entries, {
			...defaultFilter,
			query: "OnBoot",
			matchMode: "exact",
		});
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("OnBoot");
	});

	it("完全一致で部分的なマッチは非ヒット", () => {
		const result = filterCatalogEntries(entries, {
			...defaultFilter,
			query: "Boot",
			matchMode: "exact",
		});
		expect(result).toHaveLength(0);
	});

	it("includeBody: true で会話本文にマッチ", () => {
		const result = filterCatalogEntries(entries, {
			...defaultFilter,
			query: "天気",
			includeBody: true,
		});
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("aitalk");
	});

	it("includeBody: false で本文のみに存在するテキストは非マッチ", () => {
		const result = filterCatalogEntries(entries, {
			...defaultFilter,
			query: "天気",
			includeBody: false,
		});
		expect(result).toHaveLength(0);
	});

	it("enabledCategories 全 true で全件表示（フィルタなし）", () => {
		const result = filterCatalogEntries(entries, {
			...defaultFilter,
			enabledCategories: {
				"起動・終了": true,
				ランダムトーク: true,
				マウス: true,
				その他: true,
			},
		});
		expect(result).toHaveLength(entries.length);
	});

	it("enabledCategories で一部 false → 該当カテゴリ除外", () => {
		const result = filterCatalogEntries(entries, {
			...defaultFilter,
			enabledCategories: {
				"起動・終了": false,
				ランダムトーク: true,
				マウス: true,
				その他: true,
			},
		});
		expect(result).toHaveLength(3);
		expect(result.every((e) => e.category !== "起動・終了")).toBe(true);
	});

	it("検索クエリ + カテゴリフィルタの複合条件", () => {
		const result = filterCatalogEntries(entries, {
			...defaultFilter,
			query: "On",
			enabledCategories: {
				"起動・終了": false,
				ランダムトーク: true,
				マウス: true,
				その他: true,
			},
		});
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("OnMouseClick");
	});

	it("大文字小文字非区別", () => {
		const result = filterCatalogEntries(entries, {
			...defaultFilter,
			query: "onboot",
		});
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("OnBoot");
	});

	it("空のイベント名は表示名（無名イベント）で検索可能", () => {
		const result = filterCatalogEntries(entries, {
			...defaultFilter,
			query: "無名",
		});
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("");
	});

	it("includeBody + 前方一致の複合", () => {
		const result = filterCatalogEntries(entries, {
			...defaultFilter,
			query: "今日は",
			matchMode: "prefix",
			includeBody: true,
		});
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("aitalk");
	});
});
