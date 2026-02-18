import { GhostViewerPanel } from "@/components/ghost-viewer/GhostViewerPanel";
import { useFileContentStore } from "@/stores/file-content-store";
import { useSurfaceStore } from "@/stores/surface-store";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("GhostViewerPanel", () => {
	beforeEach(() => {
		useSurfaceStore.getState().reset();
		useFileContentStore.getState().reset();
		vi.spyOn(URL, "createObjectURL").mockImplementation(() => "blob:mock-url");
		vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("単一ステージで2キャラを重ね表示し、旧2カードUIを表示しない", () => {
		initializePanelState();

		render(<GhostViewerPanel />);

		expect(screen.getByTestId("surface-stage")).toBeInTheDocument();
		expect(screen.queryByText("さくら / scope 0")).not.toBeInTheDocument();
		expect(screen.queryByText("けろ / scope 1")).not.toBeInTheDocument();
		expect(screen.getAllByRole("img")).toHaveLength(2);
		expect(screen.getByText("surface0.png")).toBeInTheDocument();
	});

	it("画像クリックで focusedScope を切り替え、ファイル名ラベルを更新する", () => {
		initializePanelState();
		render(<GhostViewerPanel />);

		fireEvent.click(screen.getByTestId("surface-node-1"));
		expect(useSurfaceStore.getState().focusedScope).toBe(1);
		expect(screen.getByText("surface10.png")).toBeInTheDocument();
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

		const bellButton = screen.getByRole("button", { name: "通知 (2)" });
		fireEvent.click(bellButton);
		expect(screen.getByTestId("surface-notification-overlay")).toBeInTheDocument();
		expect(screen.getByText("SURFACE_WARN")).toBeInTheDocument();
		expect(screen.getByText("SURFACE_ERROR")).toBeInTheDocument();

		fireEvent.pointerDown(document.body);
		expect(screen.queryByTestId("surface-notification-overlay")).not.toBeInTheDocument();
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
	} = {},
) {
	const fileContents = new Map<string, ArrayBuffer>([
		["shell/master/surface0.png", createPngHeaderBuffer(220, 300)],
		["shell/master/surface10.png", createPngHeaderBuffer(180, 240)],
	]);
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
						pnaPath: null,
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
					[0, { id: 0, elements: [] }],
					[10, { id: 10, elements: [] }],
				]),
			],
		]),
		aliasMapByShell: new Map(),
		diagnostics: overrides.diagnostics ?? [],
		descriptProperties: {
			"sakura.defaultx": "0",
			"sakura.defaulty": "0",
			"kero.defaultx": "200",
			"kero.defaulty": "0",
		},
	});
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
