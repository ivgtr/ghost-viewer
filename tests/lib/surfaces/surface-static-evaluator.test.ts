import { buildSurfacePathIndex } from "@/lib/surfaces/pna-mask";
import { evaluateSurfaceStatic } from "@/lib/surfaces/surface-static-evaluator";
import type { ShellSurfaceCatalog, SurfaceDefinition, SurfaceDefinitionsByShell } from "@/types";
import { describe, expect, it } from "vitest";

describe("evaluateSurfaceStatic", () => {
	it("element を ID 昇順で初期レイヤーへ解決する", () => {
		const fileContents = new Map<string, ArrayBuffer>([
			["shell/master/base.png", createPngHeaderBuffer(100, 120)],
			["shell/master/overlay.png", createPngHeaderBuffer(20, 30)],
		]);
		const definitionsByShell = createDefinitionsByShell("master", [
			[
				0,
				{
					id: 0,
					elements: [
						{ id: 2, kind: "overlay", path: "overlay.png", x: 10, y: 12 },
						{ id: 1, kind: "base", path: "base.png", x: 0, y: 0 },
					],
					animations: [],
					regions: [],
				},
			],
		]);

		const result = evaluateSurfaceStatic({
			shellName: "master",
			surfaceId: 0,
			catalog: [],
			definitionsByShell,
			fileContents,
			sourceIndex: buildSurfacePathIndex(fileContents),
		});

		expect(result.layers).toHaveLength(2);
		expect(result.layers[0]?.sourcePath).toBe("shell/master/base.png");
		expect(result.layers[1]).toMatchObject({
			sourcePath: "shell/master/overlay.png",
			x: 10,
			y: 12,
		});
		expect(result.diagnostics).toEqual([]);
	});

	it("element が無い場合は direct asset へフォールバックする", () => {
		const fileContents = new Map<string, ArrayBuffer>([
			["shell/master/surface0.png", createPngHeaderBuffer(80, 90)],
		]);
		const catalog: ShellSurfaceCatalog[] = [
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
		];
		const definitionsByShell = createDefinitionsByShell("master", [
			[
				0,
				{
					id: 0,
					elements: [],
					animations: [],
					regions: [],
				},
			],
		]);

		const result = evaluateSurfaceStatic({
			shellName: "master",
			surfaceId: 0,
			catalog,
			definitionsByShell,
			fileContents,
			sourceIndex: buildSurfacePathIndex(fileContents),
		});

		expect(result.layers).toHaveLength(1);
		expect(result.layers[0]?.sourcePath).toBe("shell/master/surface0.png");
	});

	it("element が全欠損でも direct asset があれば継続する", () => {
		const fileContents = new Map<string, ArrayBuffer>([
			["shell/master/surface0.png", createPngHeaderBuffer(120, 180)],
		]);
		const catalog: ShellSurfaceCatalog[] = [
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
		];
		const definitionsByShell = createDefinitionsByShell("master", [
			[
				0,
				{
					id: 0,
					elements: [{ id: 0, kind: "base", path: "missing.png", x: 0, y: 0 }],
					animations: [],
					regions: [],
				},
			],
		]);

		const result = evaluateSurfaceStatic({
			shellName: "master",
			surfaceId: 0,
			catalog,
			definitionsByShell,
			fileContents,
			sourceIndex: buildSurfacePathIndex(fileContents),
		});

		expect(result.layers).toHaveLength(1);
		expect(
			result.diagnostics.some((diagnostic) => diagnostic.code === "SURFACE_PATH_CANDIDATE_MISS"),
		).toBe(true);
	});

	it("definition/direct asset の両方が無ければ空レイヤーを返す", () => {
		const fileContents = new Map<string, ArrayBuffer>();
		const result = evaluateSurfaceStatic({
			shellName: "master",
			surfaceId: 999,
			catalog: [],
			definitionsByShell: new Map(),
			fileContents,
			sourceIndex: buildSurfacePathIndex(fileContents),
		});

		expect(result.layers).toEqual([]);
		expect(result.diagnostics).toEqual([]);
	});
});

function createDefinitionsByShell(
	shellName: string,
	definitions: Array<[number, SurfaceDefinition]>,
): SurfaceDefinitionsByShell {
	return new Map([[shellName, new Map(definitions)]]);
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
