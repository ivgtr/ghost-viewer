import { useCatalogStore } from "@/stores/catalog-store";
import { useFileTreeStore } from "@/stores/file-tree-store";
import { beforeEach, describe, expect, it } from "vitest";

describe("catalogStore", () => {
	beforeEach(() => {
		useCatalogStore.getState().reset();
		useFileTreeStore.getState().reset();
	});

	it("初期状態が正しい", () => {
		const state = useCatalogStore.getState();
		expect(state.selectedFunctionName).toBeNull();
	});

	it("selectFunction で関数名を選択できる", () => {
		useCatalogStore.getState().selectFunction("OnBoot");
		expect(useCatalogStore.getState().selectedFunctionName).toBe("OnBoot");
	});

	it("selectFunction で空文字イベント名を選択できる", () => {
		useCatalogStore.getState().selectFunction("");
		expect(useCatalogStore.getState().selectedFunctionName).toBe("");
	});

	it("selectFunction(null) で選択を解除できる", () => {
		useCatalogStore.getState().selectFunction("OnBoot");
		useCatalogStore.getState().selectFunction(null);
		expect(useCatalogStore.getState().selectedFunctionName).toBeNull();
	});

	it("reset で初期状態に戻る", () => {
		useCatalogStore.getState().selectFunction("OnBoot");
		useCatalogStore.getState().reset();
		expect(useCatalogStore.getState().selectedFunctionName).toBeNull();
	});

	it("selectFunction でファイル選択は解除されない", () => {
		useFileTreeStore.getState().selectNode("ghost/master/dic.dic");
		useCatalogStore.getState().selectFunction("OnBoot");

		expect(useFileTreeStore.getState().selectedNodeId).toBe("ghost/master/dic.dic");
	});
});
