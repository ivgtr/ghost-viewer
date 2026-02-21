import { GhostViewerPanel } from "@/components/ghost-viewer/GhostViewerPanel";
import { useFileContentStore } from "@/stores/file-content-store";
import { useGhostStore } from "@/stores/ghost-store";
import { useParseStore } from "@/stores/parse-store";
import { useSurfaceStore } from "@/stores/surface-store";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("GhostViewerPanel", () => {
	beforeEach(() => {
		useSurfaceStore.getState().reset();
		useFileContentStore.getState().reset();
		useParseStore.getState().reset();
		useGhostStore.getState().reset();
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => {
			return {
				clearRect: () => undefined,
				setTransform: () => undefined,
				drawImage: () => undefined,
				getImageData: () => ({ data: new Uint8ClampedArray(4) }),
				putImageData: () => undefined,
			} as unknown as CanvasRenderingContext2D;
		});
		vi.stubGlobal("createImageBitmap", async () => {
			return {
				width: 1,
				height: 1,
				close: () => undefined,
			} as ImageBitmap;
		});
	});

	afterEach(() => {
		cleanup();
		useSurfaceStore.getState().reset();
		useFileContentStore.getState().reset();
		useParseStore.getState().reset();
		useGhostStore.getState().reset();
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it("単一ステージで2キャラを重ね表示し、旧2カードUIを表示しない", () => {
		initializePanelState();

		render(<GhostViewerPanel />);

		expect(screen.getByTestId("surface-stage")).toBeInTheDocument();
		expect(screen.getByTestId("surface-canvas")).toBeInTheDocument();
		expect(screen.queryByText("さくら / scope 0")).not.toBeInTheDocument();
		expect(screen.queryByText("けろ / scope 1")).not.toBeInTheDocument();
		expect(screen.getByTestId("surface-node-0")).toBeInTheDocument();
		expect(screen.getByTestId("surface-node-1")).toBeInTheDocument();
		expect(screen.getByText("surface0000.composite")).toBeInTheDocument();
	});

	it("画像クリックで focusedScope を切り替え、ファイル名ラベルを更新する", () => {
		initializePanelState();
		render(<GhostViewerPanel />);

		fireEvent.click(screen.getByTestId("surface-node-1"));
		expect(useSurfaceStore.getState().focusedScope).toBe(1);
		expect(screen.getByText("surface0010.composite")).toBeInTheDocument();
	});

	it("ベルボタンで通知オーバーレイを開閉する", () => {
		initializePanelState({
			diagnostics: [
				{
					level: "warning",
					code: "SURFACE_WARN",
					message: "warn message",
					shellName: "master",
					path: "shell/master/surfaces.txt",
				},
				{
					level: "error",
					code: "SURFACE_ERROR",
					message: "error message",
					shellName: "master",
					path: "shell/master/surfaces.txt",
				},
			],
		});

		render(<GhostViewerPanel />);

		const bellButton = screen.getByRole("button", { name: /通知 \(\d+\)/ });
		fireEvent.click(bellButton);
		expect(screen.getByTestId("surface-notification-overlay")).toBeInTheDocument();
		expect(screen.getByText("SURFACE_WARN")).toBeInTheDocument();
		expect(screen.getByText("SURFACE_ERROR")).toBeInTheDocument();

		fireEvent.pointerDown(document.body);
		expect(screen.queryByTestId("surface-notification-overlay")).not.toBeInTheDocument();
	});

	it("通知オーバーレイに root cause の scope/surface/candidates を表示する", () => {
		initializePanelState();
		useSurfaceStore.setState({
			notifications: [
				{
					level: "warning",
					code: "SURFACE_PATH_CANDIDATE_MISS",
					message:
						"画像パスを解決できませんでした: surface5.png (candidates: shell/master/surface5.png, shell/master/surface0005.png)",
					shellName: "master",
					scopeId: 0,
					surfaceId: 5,
					stage: "path",
					fatal: true,
					details: {
						candidates: "shell/master/surface5.png, shell/master/surface0005.png",
					},
				},
			],
		});

		render(<GhostViewerPanel />);

		fireEvent.click(screen.getByRole("button", { name: /通知 \(\d+\)/ }));
		expect(screen.getByText("scope: 0 / surface: 5")).toBeInTheDocument();
		expect(
			screen.getByText("candidates: shell/master/surface5.png, shell/master/surface0005.png"),
		).toBeInTheDocument();
	});

	it("フォールバック配置では kero(scope1) が sakura(scope0) より左に表示される", () => {
		initializePanelState({ ghostDescriptProperties: {} });
		render(<GhostViewerPanel />);

		const sakuraNode = screen.getByTestId("surface-node-0");
		const keroNode = screen.getByTestId("surface-node-1");
		const sakuraLeft = Number.parseFloat(sakuraNode.style.left || "0");
		const keroLeft = Number.parseFloat(keroNode.style.left || "0");
		expect(keroLeft).toBeLessThan(sakuraLeft);
	});

	it("明示座標がある場合はフォールバックより明示座標を優先する", () => {
		initializePanelState({
			ghostDescriptProperties: {},
			shellDescriptProperties: {
				"kero.defaultx": "420",
				"kero.defaulty": "20",
			},
		});
		render(<GhostViewerPanel />);

		const sakuraNode = screen.getByTestId("surface-node-0");
		const keroNode = screen.getByTestId("surface-node-1");
		const sakuraLeft = Number.parseFloat(sakuraNode.style.left || "0");
		const keroLeft = Number.parseFloat(keroNode.style.left || "0");
		expect(keroLeft).toBeGreaterThan(sakuraLeft);
	});

	it("surface定義だけがあるIDを composite として描画できる", () => {
		initializePanelState();
		useSurfaceStore.getState().setSurfaceForScope(0, 5, "manual");
		render(<GhostViewerPanel />);

		expect(screen.getByText("surface0005.composite")).toBeInTheDocument();
		expect(screen.getByTestId("surface-canvas")).toBeInTheDocument();
	});

	it("pna マスク付きlayerを描画できる", () => {
		initializePanelState({ withPna: true });
		render(<GhostViewerPanel />);

		expect(screen.getByTestId("surface-canvas")).toBeInTheDocument();
		expect(screen.getByTestId("surface-node-0")).toBeInTheDocument();
	});

	it("scope ごとの surface select が描画される", () => {
		initializePanelState();
		render(<GhostViewerPanel />);

		expect(screen.getByTestId("surface-select-0")).toBeInTheDocument();
		expect(screen.getByTestId("surface-select-1")).toBeInTheDocument();
	});

	it("scope 0 の select 変更で scope 1 は変わらない", () => {
		initializePanelState();
		render(<GhostViewerPanel />);

		const scope1Before = useSurfaceStore.getState().currentSurfaceByScope.get(1);

		fireEvent.change(screen.getByTestId("surface-select-0"), { target: { value: "5" } });
		expect(useSurfaceStore.getState().currentSurfaceByScope.get(0)).toBe(5);
		expect(useSurfaceStore.getState().currentSurfaceByScope.get(1)).toBe(scope1Before);
	});

	it("scope 1 の select 変更で scope 0 は変わらない", () => {
		initializePanelState();
		render(<GhostViewerPanel />);

		const scope0Before = useSurfaceStore.getState().currentSurfaceByScope.get(0);

		fireEvent.change(screen.getByTestId("surface-select-1"), { target: { value: "5" } });
		expect(useSurfaceStore.getState().currentSurfaceByScope.get(1)).toBe(5);
		expect(useSurfaceStore.getState().currentSurfaceByScope.get(0)).toBe(scope0Before);
	});

	it("surfaceIdsByScope が設定されている場合、scope 0/1 で option 集合が異なる", () => {
		initializePanelState();
		useParseStore.setState({
			surfaceIdsByScope: new Map([
				[0, [0, 5]],
				[1, [10]],
			]),
		});
		render(<GhostViewerPanel />);

		const select0 = screen.getByTestId("surface-select-0");
		const select1 = screen.getByTestId("surface-select-1");
		const options0 = within(select0)
			.getAllByRole("option")
			.map((o) => o.textContent);
		const options1 = within(select1)
			.getAllByRole("option")
			.map((o) => o.textContent);
		expect(options0).toEqual(["0", "5"]);
		expect(options1).toEqual(["10"]);
	});

	it("shell に存在しない surface ID が option に含まれない（積集合）", () => {
		initializePanelState();
		useParseStore.setState({
			surfaceIdsByScope: new Map([[0, [0, 5, 999]]]),
		});
		render(<GhostViewerPanel />);

		const select0 = screen.getByTestId("surface-select-0");
		const options0 = within(select0)
			.getAllByRole("option")
			.map((o) => o.textContent);
		expect(options0).toEqual(["0", "5"]);
		expect(options0).not.toContain("999");
	});

	it("デフォルト配置で select 順が kero(scope1) → sakura(scope0) になる", () => {
		initializePanelState();
		render(<GhostViewerPanel />);

		const selects = screen.getAllByRole("combobox");
		const scopeOrder = selects.map((el) => el.getAttribute("data-testid"));
		expect(scopeOrder).toEqual(["surface-select-1", "surface-select-0"]);
	});

	it("明示座標で kero が右に配置された場合に select 順が sakura(scope0) → kero(scope1) になる", () => {
		initializePanelState({
			shellDescriptProperties: {
				"kero.defaultx": "420",
				"kero.defaulty": "20",
			},
		});
		render(<GhostViewerPanel />);

		const selects = screen.getAllByRole("combobox");
		const scopeOrder = selects.map((el) => el.getAttribute("data-testid"));
		expect(scopeOrder).toEqual(["surface-select-0", "surface-select-1"]);
	});

	it("meta にキャラ名がある場合にラベルに反映される", () => {
		initializePanelState();
		useGhostStore.setState({
			meta: {
				name: "テストゴースト",
				author: "テスト",
				characterNames: { 0: "桜花", 1: "翡翠" },
				properties: {},
			},
		});
		render(<GhostViewerPanel />);

		expect(screen.getByText("桜花")).toBeInTheDocument();
		expect(screen.getByText("翡翠")).toBeInTheDocument();
	});

	it("meta が null の場合にフォールバック scope 0 / scope 1 が表示される", () => {
		initializePanelState();
		render(<GhostViewerPanel />);

		expect(screen.getByText("scope 0")).toBeInTheDocument();
		expect(screen.getByText("scope 1")).toBeInTheDocument();
	});

	it("availableSecondaryScopeIds が2つ以上の場合にキャラクター切替ドロップダウンが表示される", () => {
		initializePanelState();
		useSurfaceStore.setState({
			availableSecondaryScopeIds: [1, 2],
		});
		useGhostStore.setState({
			meta: {
				name: "テストゴースト",
				author: "テスト",
				characterNames: { 0: "桜花", 1: "翡翠", 2: "第三者" },
				properties: {},
			},
		});
		render(<GhostViewerPanel />);

		const dropdown = screen.getByTestId("secondary-scope-select");
		expect(dropdown).toBeInTheDocument();
		const options = within(dropdown)
			.getAllByRole("option")
			.map((o) => o.textContent);
		expect(options).toEqual(["翡翠", "第三者"]);
	});

	it("secondaryScopeId を 2 に切替えた場合、surface-select-2 が描画される", () => {
		initializePanelState();
		useSurfaceStore.setState({
			availableSecondaryScopeIds: [1, 2],
			secondaryScopeId: 2,
		});
		render(<GhostViewerPanel />);

		expect(screen.getByTestId("surface-select-0")).toBeInTheDocument();
		expect(screen.getByTestId("surface-select-2")).toBeInTheDocument();
		expect(screen.queryByTestId("surface-select-1")).not.toBeInTheDocument();
	});

	it("syncFromConversation で null 設定された scope への切替でも surface-node が描画される", () => {
		initializePanelState();
		useSurfaceStore.setState({ availableSecondaryScopeIds: [1, 2] });

		const currentMap = new Map(useSurfaceStore.getState().currentSurfaceByScope);
		currentMap.set(2, null);
		const visualMap = new Map(useSurfaceStore.getState().visualByScope);
		visualMap.set(2, null);
		useSurfaceStore.setState({
			currentSurfaceByScope: currentMap,
			visualByScope: visualMap,
		});

		render(<GhostViewerPanel />);

		expect(screen.getByTestId("surface-node-1")).toBeInTheDocument();

		fireEvent.change(screen.getByTestId("secondary-scope-select"), { target: { value: "2" } });

		expect(screen.getByTestId("surface-node-2")).toBeInTheDocument();
		expect(screen.queryByTestId("surface-node-1")).not.toBeInTheDocument();
	});

	it("積集合が空のとき allSurfaceIds にフォールバックする", () => {
		initializePanelState();
		useParseStore.setState({
			surfaceIdsByScope: new Map([[0, [999, 1000]]]),
		});
		render(<GhostViewerPanel />);

		const select0 = screen.getByTestId("surface-select-0");
		const options0 = within(select0)
			.getAllByRole("option")
			.map((o) => o.textContent);
		expect(options0).toEqual(["0", "5", "10"]);
	});
});

function initializePanelState(
	overrides: {
		diagnostics?: Array<{
			level: "warning" | "error";
			code: string;
			message: string;
			shellName: string | null;
			path: string | null;
		}>;
		ghostDescriptProperties?: Record<string, string>;
		shellDescriptProperties?: Record<string, string>;
		withPna?: boolean;
	} = {},
) {
	const fileContents = new Map<string, ArrayBuffer>([
		["shell/master/surface0.png", createPngHeaderBuffer(220, 300)],
		["shell/master/surface10.png", createPngHeaderBuffer(180, 240)],
		["shell/master/parts/ribbon.png", createPngHeaderBuffer(80, 100)],
	]);
	if (overrides.withPna) {
		fileContents.set("shell/master/surface0.pna", createPngHeaderBuffer(220, 300));
	}
	useFileContentStore.getState().setFileContents(fileContents);
	useSurfaceStore.getState().initialize({
		catalog: [
			{
				shellName: "master",
				assets: [
					{
						id: 0,
						shellName: "master",
						pngPath: "shell/master/surface0.png",
						pnaPath: overrides.withPna ? "shell/master/surface0.pna" : null,
					},
					{
						id: 10,
						shellName: "master",
						pngPath: "shell/master/surface10.png",
						pnaPath: null,
					},
				],
			},
		],
		initialShellName: "master",
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
							elements: [
								{ id: 1, kind: "overlay", path: "surface0.png", x: 0, y: 0 },
								{ id: 2, kind: "overlay", path: "parts/ribbon.png", x: -16, y: 24 },
							],
							animations: [],
							regions: [],
						},
					],
				]),
			],
		]),
		aliasMapByShell: new Map(),
		diagnostics: overrides.diagnostics ?? [],
		ghostDescriptProperties: overrides.ghostDescriptProperties ?? {},
	});

	if (overrides.shellDescriptProperties) {
		useSurfaceStore.setState({
			shellDescriptCacheByName: {
				master: overrides.shellDescriptProperties,
			},
		});
	}
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
