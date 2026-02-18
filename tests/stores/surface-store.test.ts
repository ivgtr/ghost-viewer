import type { SurfaceExtractionResult } from "@/types";
import { useSurfaceStore } from "@/stores/surface-store";
import { beforeEach, describe, expect, it } from "vitest";

describe("surfaceStore", () => {
	beforeEach(() => {
		useSurfaceStore.getState().reset();
	});

	it("初期状態が正しい", () => {
		const state = useSurfaceStore.getState();
		expect(state.shells).toEqual([]);
		expect(state.selectedShellName).toBeNull();
		expect(state.diagnostics).toEqual([]);
	});

	it("抽出結果を反映できる", () => {
		const result: SurfaceExtractionResult = {
			shells: [
				{
					shellName: "master",
					assets: [
						{
							id: 0,
							shellName: "master",
							pngPath: "shell/master/surface0.png",
							pnaPath: null,
						},
					],
				},
			],
			initialShellName: "master",
			diagnostics: [],
		};

		useSurfaceStore.getState().setExtractionResult(result);
		const state = useSurfaceStore.getState();
		expect(state.shells).toEqual(result.shells);
		expect(state.selectedShellName).toBe("master");
	});

	it("シェル選択を切り替えられる", () => {
		useSurfaceStore.getState().setExtractionResult({
			shells: [
				{
					shellName: "master",
					assets: [{ id: 0, shellName: "master", pngPath: "a", pnaPath: null }],
				},
				{
					shellName: "summer",
					assets: [{ id: 1, shellName: "summer", pngPath: "b", pnaPath: null }],
				},
			],
			initialShellName: "master",
			diagnostics: [],
		});

		useSurfaceStore.getState().selectShell("summer");
		expect(useSurfaceStore.getState().selectedShellName).toBe("summer");
	});

	it("reset で初期状態に戻る", () => {
		useSurfaceStore.getState().setExtractionResult({
			shells: [
				{
					shellName: "master",
					assets: [{ id: 0, shellName: "master", pngPath: "a", pnaPath: null }],
				},
			],
			initialShellName: "master",
			diagnostics: [
				{
					level: "warning",
					code: "X",
					message: "msg",
					shellName: "master",
					path: "shell/master/surface0.png",
				},
			],
		});

		useSurfaceStore.getState().reset();
		const state = useSurfaceStore.getState();
		expect(state.shells).toEqual([]);
		expect(state.selectedShellName).toBeNull();
		expect(state.diagnostics).toEqual([]);
	});
});
