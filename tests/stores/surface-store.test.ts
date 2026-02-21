import type {
	ShellSurfaceCatalog,
	SurfaceDefinition,
	SurfaceDefinitionsByShell,
	SurfaceInitializeInput,
} from "@/types";
import { useFileContentStore } from "@/stores/file-content-store";
import { useSurfaceStore } from "@/stores/surface-store";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("surfaceStore", () => {
	beforeEach(() => {
		useSurfaceStore.getState().reset();
		useFileContentStore.getState().reset();
	});

	afterEach(() => {
		useSurfaceStore.getState().reset();
		useFileContentStore.getState().reset();
	});

	it("初期状態が正しい", () => {
		const state = useSurfaceStore.getState();
		expect(state.selectedShellName).toBeNull();
		expect(state.catalog).toEqual([]);
		expect(state.currentSurfaceByScope.get(0)).toBeNull();
		expect(state.currentSurfaceByScope.get(1)).toBeNull();
		expect(state.focusedScope).toBe(0);
		expect(state.notifications).toEqual([]);
		expect(state.ghostDescriptProperties).toEqual({});
		expect(state.shellDescriptCacheByName).toEqual({});
	});

	it("defaultsurface を優先して初期 surface を決定する", () => {
		useSurfaceStore.getState().initialize(
			createInitializeInput({
				ghostDescriptProperties: {
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

	it("shell descript を遅延読込してキャッシュする", () => {
		const shellDescript = new TextEncoder().encode("defaultx,123\ndefaulty,456").buffer;
		const fileContents = new Map<string, ArrayBuffer>([
			["shell/master/descript.txt", shellDescript],
		]);
		useFileContentStore.getState().setFileContents(fileContents);

		useSurfaceStore.getState().initialize(createInitializeInput());
		useSurfaceStore.getState().ensureShellDescriptLoaded("master");

		const state = useSurfaceStore.getState();
		expect(state.shellDescriptCacheByName.master?.defaultx).toBe("123");
		expect(state.shellDescriptCacheByName.master?.defaulty).toBe("456");
	});

	it("shell切替時に shell descript を読込んで現在 surface を再計算する", () => {
		const shellDescript = new TextEncoder().encode("sakura.seriko.defaultsurface,20").buffer;
		const fileContents = new Map<string, ArrayBuffer>([
			["shell/alt/descript.txt", shellDescript],
			["shell/master/surface0.png", createPngHeaderBuffer(120, 180)],
			["shell/master/surface10.png", createPngHeaderBuffer(120, 180)],
			["shell/alt/surface0.png", createPngHeaderBuffer(120, 180)],
			["shell/alt/surface10.png", createPngHeaderBuffer(120, 180)],
			["shell/alt/surface20.png", createPngHeaderBuffer(120, 180)],
		]);
		useFileContentStore.getState().setFileContents(fileContents);

		useSurfaceStore.getState().initialize(
			createInitializeInput({
				catalog: [createShell("master", [0, 10]), createShell("alt", [0, 10, 20])],
				definitionsByShell: new Map([
					["master", createDefinitionMap([0, 10])],
					["alt", createDefinitionMap([0, 10, 20])],
				]),
			}),
		);

		useSurfaceStore.getState().selectShell("alt");
		const state = useSurfaceStore.getState();
		expect(state.selectedShellName).toBe("alt");
		expect(state.currentSurfaceByScope.get(0)).toBe(20);
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
		expect(
			state.notifications.some((notification) => notification.code !== "SURFACE_IMAGE_UNRESOLVED"),
		).toBe(true);
	});

	it("setSurfaceForScope は実surfaceが解決可能な場合に alias より実IDを優先する", () => {
		useSurfaceStore.getState().initialize(
			createInitializeInput({
				catalog: [createShell("master", [0, 10, 101])],
				definitionsByShell: createDefinitionsByShell("master", [0, 10, 101]),
				aliasMapByShell: new Map([["master", new Map([[0, new Map([[0, [101]]])]])]]),
				rng: () => 0,
			}),
		);

		useSurfaceStore.getState().setSurfaceForScope(0, 0, "manual");
		expect(useSurfaceStore.getState().currentSurfaceByScope.get(0)).toBe(0);
	});

	it("setSurfaceForScope は実surfaceが未解決なら alias をフォールバック採用する", () => {
		useSurfaceStore.getState().initialize(
			createInitializeInput({
				catalog: [createShell("master", [101])],
				definitionsByShell: createDefinitionsByShell("master", [101]),
				aliasMapByShell: new Map([["master", new Map([[0, new Map([[0, [101]]])]])]]),
				rng: () => 0,
			}),
		);

		useSurfaceStore.getState().setSurfaceForScope(0, 0, "manual");
		expect(useSurfaceStore.getState().currentSurfaceByScope.get(0)).toBe(101);
	});

	it("surfaceN.png がなくても definition の element で解決できれば切り替える", () => {
		useFileContentStore
			.getState()
			.setFileContents(new Map([["shell/master/surface0.png", createPngHeaderBuffer(120, 180)]]));
		useSurfaceStore.getState().initialize(
			createInitializeInput({
				catalog: [createShell("master", [0, 10])],
				definitionsByShell: new Map([
					[
						"master",
						new Map([
							[0, { id: 0, elements: [], animations: [], regions: [] }],
							[10, { id: 10, elements: [], animations: [], regions: [] }],
							[
								5,
								{
									id: 5,
									elements: [{ id: 1, kind: "overlay", path: "surface0.png", x: 0, y: 0 }],
									animations: [],
									regions: [],
								},
							],
						]),
					],
				]),
			}),
		);

		useSurfaceStore.getState().setSurfaceForScope(0, 5, "manual");
		expect(useSurfaceStore.getState().currentSurfaceByScope.get(0)).toBe(5);
	});

	it("surfaceN.png がなくても animation 経由で静的解決できれば切り替える", () => {
		useFileContentStore.getState().setFileContents(
			new Map([
				["shell/master/surface0.png", createPngHeaderBuffer(120, 180)],
				["shell/master/overlay.png", createPngHeaderBuffer(24, 24)],
			]),
		);
		useSurfaceStore.getState().initialize(
			createInitializeInput({
				catalog: [createShell("master", [0, 10])],
				definitionsByShell: new Map([
					[
						"master",
						new Map([
							[0, { id: 0, elements: [], animations: [], regions: [] }],
							[10, { id: 10, elements: [], animations: [], regions: [] }],
							[
								30,
								{
									id: 30,
									elements: [],
									animations: [
										{
											id: 1,
											interval: { raw: "bind", mode: "bind", args: [] },
											patterns: [
												{
													index: 0,
													method: "overlay",
													surfaceRef: 0,
													wait: 0,
													x: 0,
													y: 0,
													optionals: [],
												},
											],
										},
									],
									regions: [],
								},
							],
						]),
					],
				]),
			}),
		);

		useSurfaceStore.getState().setSurfaceForScope(0, 30, "manual");
		expect(useSurfaceStore.getState().currentSurfaceByScope.get(0)).toBe(30);
	});

	it("setSurfaceForScope の未解決時は直前を維持して warning を積む", () => {
		useSurfaceStore.getState().initialize(
			createInitializeInput({
				catalog: [createShell("master", [0, 10])],
				definitionsByShell: createDefinitionsByShell("master", [0, 10]),
			}),
		);

		useSurfaceStore.getState().setSurfaceForScope(0, 9999, "manual");
		const state = useSurfaceStore.getState();
		expect(state.currentSurfaceByScope.get(0)).toBe(0);
		expect(
			state.notifications.some((notification) => notification.code === "SURFACE_IMAGE_UNRESOLVED"),
		).toBe(true);
		expect(
			state.notifications.some((notification) => notification.code !== "SURFACE_IMAGE_UNRESOLVED"),
		).toBe(true);
	});

	it("setSecondaryScopeId でスコープ切替時に未解決サーフェスが遅延解決される", () => {
		useSurfaceStore.getState().initialize(
			createInitializeInput({
				catalog: [createShell("master", [0, 10, 30])],
				definitionsByShell: createDefinitionsByShell("master", [0, 10, 30]),
			}),
		);
		useSurfaceStore.setState({ availableSecondaryScopeIds: [1, 2] });

		useSurfaceStore.getState().setSecondaryScopeId(2);
		const state = useSurfaceStore.getState();
		expect(state.secondaryScopeId).toBe(2);
		expect(state.currentSurfaceByScope.has(2)).toBe(true);
	});

	it("setSecondaryScopeId で既存 scope へ戻す場合もランタイムが再起動される", () => {
		useSurfaceStore.getState().initialize(
			createInitializeInput({
				catalog: [createShell("master", [0, 10, 30])],
				definitionsByShell: createDefinitionsByShell("master", [0, 10, 30]),
			}),
		);
		useSurfaceStore.setState({ availableSecondaryScopeIds: [1, 2] });

		useSurfaceStore.getState().setSecondaryScopeId(2);
		useSurfaceStore.getState().setSecondaryScopeId(1);
		expect(useSurfaceStore.getState().secondaryScopeId).toBe(1);
	});

	it("setAvailableSecondaryScopeIds 更新後に secondaryScopeId が候補外なら再選択される", () => {
		useSurfaceStore.getState().initialize(
			createInitializeInput({
				catalog: [createShell("master", [0, 10, 30])],
				definitionsByShell: createDefinitionsByShell("master", [0, 10, 30]),
			}),
		);
		useSurfaceStore.setState({
			availableSecondaryScopeIds: [1, 2, 3],
			secondaryScopeId: 3,
		});

		useSurfaceStore.getState().setAvailableSecondaryScopeIds([1, 2]);
		const state = useSurfaceStore.getState();
		expect(state.availableSecondaryScopeIds).toEqual([1, 2]);
		expect(state.secondaryScopeId).toBe(1);
	});

	it("setSecondaryScopeId で surfaceId=null の scope へ切替時に再解決される", () => {
		useSurfaceStore.getState().initialize(
			createInitializeInput({
				catalog: [createShell("master", [0, 10, 30])],
				definitionsByShell: createDefinitionsByShell("master", [0, 10, 30]),
			}),
		);
		useSurfaceStore.setState({ availableSecondaryScopeIds: [1, 2] });

		// syncFromConversation で解決失敗を再現: has=true, value=null
		const currentMap = new Map(useSurfaceStore.getState().currentSurfaceByScope);
		currentMap.set(2, null);
		const visualMap = new Map(useSurfaceStore.getState().visualByScope);
		visualMap.set(2, null);
		useSurfaceStore.setState({
			currentSurfaceByScope: currentMap,
			visualByScope: visualMap,
		});

		useSurfaceStore.getState().setSecondaryScopeId(2);
		const state = useSurfaceStore.getState();
		expect(state.secondaryScopeId).toBe(2);
		expect(state.currentSurfaceByScope.get(2)).not.toBeNull();
		expect(state.visualByScope.get(2)).not.toBeNull();
	});

	it("syncFromConversation で scope>1 を currentSurfaceByScope に保持できる", () => {
		useSurfaceStore.getState().initialize(
			createInitializeInput({
				catalog: [createShell("master", [0, 10, 30])],
				definitionsByShell: createDefinitionsByShell("master", [0, 10, 30]),
			}),
		);

		useSurfaceStore.getState().syncFromConversation(
			[
				{ scopeId: 0, requestedSurfaceId: 0 },
				{ scopeId: 2, requestedSurfaceId: 30 },
			],
			"auto",
		);
		const state = useSurfaceStore.getState();
		expect(state.currentSurfaceByScope.get(0)).toBe(0);
		expect(state.currentSurfaceByScope.get(2)).toBe(30);
	});
});

function createInitializeInput(
	overrides: Partial<SurfaceInitializeInput> = {},
): SurfaceInitializeInput {
	const input: SurfaceInitializeInput = {
		catalog: [createShell("master", [0, 10])],
		initialShellName: "master",
		definitionsByShell: createDefinitionsByShell("master", [0, 10]),
		aliasMapByShell: new Map<string, Map<number, Map<number | string, number[]>>>(),
		diagnostics: [],
		ghostDescriptProperties: {},
		...overrides,
	};
	const currentFileContents = useFileContentStore.getState().fileContents;
	if (currentFileContents.size === 0) {
		useFileContentStore.getState().setFileContents(createFileContentsFromCatalog(input.catalog));
	}
	return input;
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
				animations: [],
				regions: [],
			},
		]),
	);
}

function createPngHeaderBuffer(width: number, height: number): ArrayBuffer {
	const bytes = new Uint8Array(24);
	bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
	bytes.set([0x00, 0x00, 0x00, 0x0d], 8);
	bytes.set([0x49, 0x48, 0x44, 0x52], 12);
	const view = new DataView(bytes.buffer);
	view.setUint32(16, width);
	view.setUint32(20, height);
	return bytes.buffer;
}

function createFileContentsFromCatalog(catalog: ShellSurfaceCatalog[]): Map<string, ArrayBuffer> {
	const fileContents = new Map<string, ArrayBuffer>();
	for (const shell of catalog) {
		for (const asset of shell.assets) {
			fileContents.set(asset.pngPath, createPngHeaderBuffer(120, 180));
			if (asset.pnaPath) {
				fileContents.set(asset.pnaPath, createPngHeaderBuffer(120, 180));
			}
		}
	}
	return fileContents;
}
