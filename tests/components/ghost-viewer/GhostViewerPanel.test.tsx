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

	it("さくら/けろの2面を表示する", () => {
		initializePanelState();

		render(<GhostViewerPanel />);

		expect(screen.getByText("さくら / scope 0")).toBeInTheDocument();
		expect(screen.getByText("けろ / scope 1")).toBeInTheDocument();
		expect(URL.createObjectURL).toHaveBeenCalledTimes(2);

		const images = screen.getAllByRole("img");
		expect(images).toHaveLength(2);
		expect(images[0]).toHaveAttribute("src", "blob:mock-url");
		expect(images[1]).toHaveAttribute("src", "blob:mock-url");
	});

	it("クリックでフォーカスを切り替える", () => {
		initializePanelState();
		render(<GhostViewerPanel />);

		fireEvent.click(screen.getByRole("button", { name: /けろ \/ scope 1/i }));
		expect(useSurfaceStore.getState().focusedScope).toBe(1);
	});

	it("通知を描画する", () => {
		initializePanelState({
			diagnostics: [
				{
					level: "warning",
					code: "SURFACE_TEST",
					message: "warning message",
					shellName: "master",
					path: "shell/master/surfaces.txt",
				},
			],
		});

		render(<GhostViewerPanel />);
		expect(screen.getByText("SURFACE_TEST")).toBeInTheDocument();
		expect(screen.getByText("warning message")).toBeInTheDocument();
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
		["shell/master/surface0.png", new Uint8Array([1, 2, 3]).buffer],
		["shell/master/surface10.png", new Uint8Array([4, 5, 6]).buffer],
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
		descriptProperties: {},
	});
}
