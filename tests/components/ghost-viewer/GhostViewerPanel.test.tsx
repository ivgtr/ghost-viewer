import { GhostViewerPanel } from "@/components/ghost-viewer/GhostViewerPanel";
import { useFileContentStore } from "@/stores/file-content-store";
import { useSurfaceStore } from "@/stores/surface-store";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("GhostViewerPanel", () => {
	beforeEach(() => {
		useSurfaceStore.getState().reset();
		useFileContentStore.getState().reset();
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
