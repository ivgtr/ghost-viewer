import type {
	ShellSurfaceCatalog,
	SurfaceDefinition,
	SurfaceDefinitionsByShell,
	SurfaceInitializeInput,
} from "@/types";
import { useSurfaceStore } from "@/stores/surface-store";
import { beforeEach, describe, expect, it } from "vitest";

describe("surfaceStore", () => {
	beforeEach(() => {
		useSurfaceStore.getState().reset();
	});

	it("初期状態が正しい", () => {
		const state = useSurfaceStore.getState();
		expect(state.selectedShellName).toBeNull();
		expect(state.catalog).toEqual([]);
		expect(state.currentSurfaceByScope.get(0)).toBeNull();
		expect(state.currentSurfaceByScope.get(1)).toBeNull();
		expect(state.focusedScope).toBe(0);
		expect(state.notifications).toEqual([]);
	});

	it("defaultsurface を優先して初期 surface を決定する", () => {
		useSurfaceStore.getState().initialize(
			createInitializeInput({
				descriptProperties: {
					"sakura.seriko.defaultsurface": "15",
					"kero.seriko.defaultsurface": "10",
				},
				catalog: [createShell("master", [0, 10, 15])],
				definitionsByShell: createDefinitionsByShell("master", [0, 10, 15]),
			}),
		);

		const state = useSurfaceStore.getState();
		expect(state.currentSurfaceByScope.get(0)).toBe(15);
		expect(state.currentSurfaceByScope.get(1)).toBe(10);
	});

	it("defaultsurface 不在時は 0/10、さらに不在時は最小 ID を選ぶ", () => {
		useSurfaceStore.getState().initialize(
			createInitializeInput({
				catalog: [createShell("master", [3, 7])],
				definitionsByShell: createDefinitionsByShell("master", [3, 7]),
			}),
		);

		const state = useSurfaceStore.getState();
		expect(state.currentSurfaceByScope.get(0)).toBe(3);
		expect(state.currentSurfaceByScope.get(1)).toBe(3);
	});

	it("focusedScope を切り替えられる", () => {
		useSurfaceStore.getState().initialize(createInitializeInput());
		useSurfaceStore.getState().setFocusedScope(1);
		expect(useSurfaceStore.getState().focusedScope).toBe(1);
	});

	it("画像未解決時は前回表示を維持して通知する", () => {
		useSurfaceStore.getState().initialize(
			createInitializeInput({
				catalog: [createShell("master", [0, 10]), createShell("broken", [])],
				definitionsByShell: new Map<string, Map<number, SurfaceDefinition>>([
					["master", createDefinitionMap([0, 10])],
					["broken", createDefinitionMap([5])],
				]),
			}),
		);

		useSurfaceStore.getState().selectShell("broken");
		const state = useSurfaceStore.getState();
		expect(state.selectedShellName).toBe("broken");
		expect(state.currentSurfaceByScope.get(0)).toBe(0);
		expect(state.currentSurfaceByScope.get(1)).toBe(10);
		expect(
			state.notifications.some((notification) => notification.code === "SURFACE_IMAGE_UNRESOLVED"),
		).toBe(true);
	});
});

function createInitializeInput(
	overrides: Partial<SurfaceInitializeInput> = {},
): SurfaceInitializeInput {
	return {
		catalog: [createShell("master", [0, 10])],
		initialShellName: "master",
		definitionsByShell: createDefinitionsByShell("master", [0, 10]),
		aliasMapByShell: new Map<string, Map<number, Map<number, number[]>>>(),
		diagnostics: [],
		descriptProperties: {},
		...overrides,
	};
}

function createShell(shellName: string, surfaceIds: number[]): ShellSurfaceCatalog {
	return {
		shellName,
		assets: surfaceIds.map((surfaceId) => ({
			id: surfaceId,
			shellName,
			pngPath: `shell/${shellName}/surface${surfaceId}.png`,
			pnaPath: null,
		})),
	};
}

function createDefinitionsByShell(
	shellName: string,
	surfaceIds: number[],
): SurfaceDefinitionsByShell {
	return new Map<string, Map<number, SurfaceDefinition>>([
		[shellName, createDefinitionMap(surfaceIds)],
	]);
}

function createDefinitionMap(surfaceIds: number[]): Map<number, SurfaceDefinition> {
	return new Map(
		surfaceIds.map((surfaceId) => [
			surfaceId,
			{
				id: surfaceId,
				elements: [],
			},
		]),
	);
}
