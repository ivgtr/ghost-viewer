import JSZip from "jszip";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { requestParseSatoriBatch, requestParseYayaBatch } from "@/lib/workers/worker-client";
import { useFileTreeStore } from "@/stores/file-tree-store";
import { useGhostStore } from "@/stores/ghost-store";
import { useParseStore } from "@/stores/parse-store";
import { useSurfaceStore } from "@/stores/surface-store";

vi.mock("@/lib/workers/worker-client", () => ({
	requestParseYayaBatch: vi.fn(),
	requestParseSatoriBatch: vi.fn(),
}));

function createMockFile(name: string, size: number): File {
	const blob = new Blob(["x".repeat(Math.min(size, 100))], {
		type: "application/octet-stream",
	});
	return new File([blob], name, { type: "application/octet-stream" });
}

async function createNarFile(files: Record<string, string>, name = "ghost.nar"): Promise<File> {
	const zip = new JSZip();
	for (const [path, content] of Object.entries(files)) {
		zip.file(path, content);
	}
	const buffer = await zip.generateAsync({ type: "arraybuffer" });
	return new File([buffer], name, { type: "application/octet-stream" });
}

function flushPromises(): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
}

describe("ghostStore", () => {
	beforeEach(() => {
		useGhostStore.getState().reset();
		useParseStore.getState().reset();
		useFileTreeStore.getState().reset();
		useSurfaceStore.getState().reset();
		vi.clearAllMocks();

		vi.mocked(requestParseYayaBatch).mockResolvedValue({
			shioriType: "yaya",
			functions: [],
			meta: null,
			diagnostics: [],
		});
		vi.mocked(requestParseSatoriBatch).mockResolvedValue({
			shioriType: "satori",
			functions: [],
			meta: null,
			diagnostics: [],
		});
	});

	it("初期状態が正しい", () => {
		const state = useGhostStore.getState();
		expect(state.meta).toBeNull();
		expect(state.shioriType).toBe("unknown");
		expect(state.stats).toBeNull();
		expect(state.fileName).toBeNull();
		expect(state.error).toBeNull();
		expect(state.isExtracting).toBe(false);
	});

	it("acceptFile で有効な NAR ファイルを受け入れ isExtracting が true になる", async () => {
		const file = await createNarFile({ "test.txt": "hello" });
		useGhostStore.getState().acceptFile(file);

		const state = useGhostStore.getState();
		expect(state.fileName).toBe("ghost.nar");
		expect(state.error).toBeNull();
		expect(state.isExtracting).toBe(true);

		await flushPromises();
	});

	it("acceptFile で無効な拡張子を拒否しエラーを設定する", () => {
		const file = createMockFile("ghost.txt", 1024);
		useGhostStore.getState().acceptFile(file);

		const state = useGhostStore.getState();
		expect(state.fileName).toBeNull();
		expect(state.error).toBeTruthy();
	});

	it("acceptFile で .zip 拡張子を受け入れる", async () => {
		const file = await createNarFile({ "test.txt": "hello" }, "ghost.zip");
		useGhostStore.getState().acceptFile(file);

		const state = useGhostStore.getState();
		expect(state.fileName).toBe("ghost.zip");
		expect(state.error).toBeNull();
		expect(state.isExtracting).toBe(true);

		await flushPromises();
	});

	it("acceptFile 成功時に他ストアをリセットする", async () => {
		useFileTreeStore.getState().selectNode("node-1");
		useParseStore.getState().startBatchParse(1);
		useSurfaceStore.getState().initialize({
			catalog: [
				{
					shellName: "master",
					assets: [{ id: 0, shellName: "master", pngPath: "a", pnaPath: null }],
				},
			],
			initialShellName: "master",
			definitionsByShell: new Map([["master", new Map([[0, { id: 0, elements: [] }]])]]),
			aliasMapByShell: new Map(),
			diagnostics: [],
			descriptProperties: {},
		});

		const file = await createNarFile({ "test.txt": "hello" });
		useGhostStore.getState().acceptFile(file);

		expect(useFileTreeStore.getState().selectedNodeId).toBeNull();
		expect(useParseStore.getState().isParsing).toBe(false);
		expect(useSurfaceStore.getState().catalog).toEqual([]);

		await flushPromises();
	});

	it("acceptFile 成功時にサーフェス抽出結果が反映される", async () => {
		const file = await createNarFile({
			"shell/master/surface0.png": "png",
			"shell/master/surface0.pna": "pna",
			"ghost/master/descript.txt": "name,test",
		});

		useGhostStore.getState().acceptFile(file);

		await vi.waitFor(() => {
			expect(useGhostStore.getState().isExtracting).toBe(false);
		});

		const surfaceState = useSurfaceStore.getState();
		expect(surfaceState.selectedShellName).toBe("master");
		expect(surfaceState.catalog).toHaveLength(1);
		expect(surfaceState.catalog[0]?.assets[0]?.pngPath).toBe("shell/master/surface0.png");
		expect(surfaceState.catalog[0]?.assets[0]?.pnaPath).toBe("shell/master/surface0.pna");
		expect(surfaceState.currentSurfaceByScope.get(0)).toBe(0);
	});

	it("acceptFile 成功時に前のメタ情報をクリアする", async () => {
		useGhostStore.getState().setMeta({
			name: "old",
			author: "",
			characterNames: {},
			properties: {},
		});
		useGhostStore.getState().setShioriType("yaya");

		const file = await createNarFile({ "test.txt": "hello" });
		useGhostStore.getState().acceptFile(file);

		const state = useGhostStore.getState();
		expect(state.meta).toBeNull();
		expect(state.shioriType).toBe("unknown");

		await flushPromises();
	});

	it("setMeta でメタ情報を設定できる", () => {
		const meta = {
			name: "TestGhost",
			author: "Author",
			characterNames: { 0: "Sakura", 1: "Kero" },
			properties: {},
		};
		useGhostStore.getState().setMeta(meta);
		expect(useGhostStore.getState().meta).toEqual(meta);
	});

	it("setShioriType で SHIORI 種別を設定できる", () => {
		useGhostStore.getState().setShioriType("satori");
		expect(useGhostStore.getState().shioriType).toBe("satori");
	});

	it("setStats で統計情報を設定できる", () => {
		const stats = {
			totalFiles: 10,
			dicFileCount: 5,
			totalLines: 1000,
			totalSize: 50000,
		};
		useGhostStore.getState().setStats(stats);
		expect(useGhostStore.getState().stats).toEqual(stats);
	});

	it("reset で初期状態に戻る", () => {
		useGhostStore.getState().setMeta({
			name: "Ghost",
			author: "",
			characterNames: {},
			properties: {},
		});
		useGhostStore.getState().setShioriType("yaya");
		useGhostStore.getState().setStats({
			totalFiles: 10,
			dicFileCount: 5,
			totalLines: 1000,
			totalSize: 50000,
		});

		useGhostStore.getState().reset();

		const state = useGhostStore.getState();
		expect(state.meta).toBeNull();
		expect(state.shioriType).toBe("unknown");
		expect(state.stats).toBeNull();
		expect(state.fileName).toBeNull();
		expect(state.error).toBeNull();
		expect(state.isExtracting).toBe(false);
	});

	it("ghostStore.reset で surfaceStore も初期化される", () => {
		useSurfaceStore.getState().initialize({
			catalog: [
				{
					shellName: "master",
					assets: [{ id: 0, shellName: "master", pngPath: "a", pnaPath: null }],
				},
			],
			initialShellName: "master",
			definitionsByShell: new Map([["master", new Map([[0, { id: 0, elements: [] }]])]]),
			aliasMapByShell: new Map(),
			diagnostics: [],
			descriptProperties: {},
		});

		useGhostStore.getState().reset();

		expect(useSurfaceStore.getState().catalog).toEqual([]);
		expect(useSurfaceStore.getState().selectedShellName).toBeNull();
		expect(useSurfaceStore.getState().notifications).toEqual([]);
	});

	it("isExtracting 中に acceptFile を呼ぶとエラーが設定される", async () => {
		const file = await createNarFile({ "test.txt": "hello" });
		useGhostStore.getState().acceptFile(file);
		expect(useGhostStore.getState().isExtracting).toBe(true);

		const file2 = await createNarFile({ "test2.txt": "world" }, "other.nar");
		useGhostStore.getState().acceptFile(file2);

		expect(useGhostStore.getState().error).toBe("展開処理中です。完了後に再度お試しください");
		expect(useGhostStore.getState().fileName).toBe("ghost.nar");

		await flushPromises();
	});

	it("展開成功時に fileTreeStore.tree と stats が設定され isExtracting が false に戻る", async () => {
		const file = await createNarFile({
			"ghost/master/dic01.dic": "hello",
			"ghost/master/descript.txt": "name,TestGhost",
		});

		useGhostStore.getState().acceptFile(file);

		await vi.waitFor(() => {
			expect(useGhostStore.getState().isExtracting).toBe(false);
		});

		const ghostState = useGhostStore.getState();
		expect(ghostState.stats).not.toBeNull();
		expect(ghostState.stats?.totalFiles).toBe(2);
		expect(ghostState.stats?.dicFileCount).toBe(1);
		expect(ghostState.error).toBeNull();

		const fileTreeState = useFileTreeStore.getState();
		expect(fileTreeState.tree.length).toBeGreaterThan(0);
	});

	it("展開成功時に descript.txt から meta と shioriType が設定される", async () => {
		const descriptContent = [
			"name,テストゴースト",
			"craftmanw,テスト作者",
			"sakura.name,さくら",
			"kero.name,うにゅう",
			"shiori,yaya.dll",
		].join("\n");

		const file = await createNarFile({
			"ghost/master/descript.txt": descriptContent,
			"ghost/master/dic01.dic": "hello",
		});

		useGhostStore.getState().acceptFile(file);

		await vi.waitFor(() => {
			expect(useGhostStore.getState().isExtracting).toBe(false);
		});

		const ghostState = useGhostStore.getState();
		expect(ghostState.meta).not.toBeNull();
		expect(ghostState.meta?.name).toBe("テストゴースト");
		expect(ghostState.meta?.author).toBe("テスト作者");
		expect(ghostState.meta?.characterNames[0]).toBe("さくら");
		expect(ghostState.meta?.characterNames[1]).toBe("うにゅう");
		expect(ghostState.shioriType).toBe("yaya");
	});

	it("展開失敗時に error が設定され isExtracting が false に戻る", async () => {
		const invalidBuffer = new ArrayBuffer(100);
		const file = new File([invalidBuffer], "broken.nar", {
			type: "application/octet-stream",
		});

		useGhostStore.getState().acceptFile(file);

		await vi.waitFor(() => {
			expect(useGhostStore.getState().isExtracting).toBe(false);
		});

		const state = useGhostStore.getState();
		expect(state.error).toBeTruthy();
	});

	it("yaya + dic*.txt のみでは YAYA バッチ解析を実行しない", async () => {
		const file = await createNarFile({
			"ghost/master/descript.txt": "shiori,yaya.dll",
			"ghost/master/dic01.txt": "＊OnBoot\n：\\0hello\\e",
		});

		useGhostStore.getState().acceptFile(file);

		await vi.waitFor(() => {
			expect(useGhostStore.getState().isExtracting).toBe(false);
		});
		await flushPromises();

		expect(requestParseYayaBatch).not.toHaveBeenCalled();
	});

	it("yaya + .dic + dic*.txt では .dic のみを YAYA バッチ解析に渡す", async () => {
		const file = await createNarFile({
			"ghost/master/descript.txt": "shiori,yaya.dll",
			"ghost/master/main.dic": 'OnBoot\n{\nreturn "hello"\n}',
			"ghost/master/dic01.txt": "＊OnBoot\n：\\0hello\\e",
		});

		useGhostStore.getState().acceptFile(file);

		await vi.waitFor(() => {
			expect(requestParseYayaBatch).toHaveBeenCalledTimes(1);
		});

		const call = vi.mocked(requestParseYayaBatch).mock.calls[0]?.[0];
		expect(call?.files.map((f) => f.filePath)).toEqual(["ghost/master/main.dic"]);
	});

	it("kawari.ini を含む場合は案内表示用 state を設定しバッチ解析を実行しない", async () => {
		const file = await createNarFile({
			"ghost/master/descript.txt": "name,test\nshiori,shiori.dll",
			"ghost/master/kawari.ini": "dict : dict-keeps.txt",
			"ghost/master/dict-keeps.txt": 'entry : "hello"',
		});

		useGhostStore.getState().acceptFile(file);

		await vi.waitFor(() => {
			expect(useGhostStore.getState().isExtracting).toBe(false);
		});

		const state = useGhostStore.getState();
		expect(state.shioriType).toBe("unknown");
		expect(state.unsupportedShioriNotice).toBe("Kawari は対応予定です");
		expect(requestParseYayaBatch).not.toHaveBeenCalled();
		expect(requestParseSatoriBatch).not.toHaveBeenCalled();
	});
});
