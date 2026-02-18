import { resolveSurfaceVisual } from "@/lib/surfaces/surface-visual-resolver";
import type { ShellSurfaceCatalog, SurfaceDefinition, SurfaceDefinitionsByShell } from "@/types";
import { describe, expect, it } from "vitest";

describe("resolveSurfaceVisual", () => {
	it("direct asset を解決できる", () => {
		const result = resolveSurfaceVisual({
			shellName: "master",
			surfaceId: 0,
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
					],
				},
			],
			definitionsByShell: new Map(),
			fileContents: new Map([["shell/master/surface0.png", createPngHeaderBuffer(320, 480)]]),
		});

		expect(result.ok).toBe(true);
		expect(result.model?.mode).toBe("asset");
		expect(result.model?.width).toBe(320);
		expect(result.model?.height).toBe(480);
		expect(result.model?.layers[0]?.path).toBe("shell/master/surface0.png");
		expect(result.model?.layers[0]?.alphaMaskPath).toBeNull();
	});

	it("path の大文字小文字差を吸収して direct asset を解決できる", () => {
		const result = resolveSurfaceVisual({
			shellName: "master",
			surfaceId: 0,
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
					],
				},
			],
			definitionsByShell: new Map(),
			fileContents: new Map([["Shell/Master/Surface0.PNG", createPngHeaderBuffer(200, 100)]]),
		});

		expect(result.ok).toBe(true);
		expect(result.model?.layers[0]?.path).toBe("Shell/Master/Surface0.PNG");
	});

	it("surfaceN.png がなくても element 合成で解決できる", () => {
		const definitions = createDefinitionsByShell("master", [
			[
				5,
				{
					id: 5,
					elements: [
						{ id: 1, kind: "overlay", path: "surface0.png", x: 0, y: 0 },
						{ id: 2, kind: "overlay", path: "parts/ribbon.png", x: -10, y: -5 },
					],
					animations: [],
					regions: [],
				},
			],
		]);
		const result = resolveSurfaceVisual({
			shellName: "master",
			surfaceId: 5,
			catalog: [createShell("master", [0])],
			definitionsByShell: definitions,
			fileContents: new Map([
				["shell/master/surface0.png", createPngHeaderBuffer(50, 40)],
				["shell/master/parts/ribbon.png", createPngHeaderBuffer(20, 20)],
			]),
		});

		expect(result.ok).toBe(true);
		expect(result.model?.mode).toBe("composite");
		expect(result.model?.width).toBe(60);
		expect(result.model?.height).toBe(45);
		expect(result.model?.layers[0]?.x).toBe(10);
		expect(result.model?.layers[0]?.y).toBe(5);
		expect(result.model?.layers[1]?.x).toBe(0);
		expect(result.model?.layers[1]?.y).toBe(0);
	});

	it("element 画像がすべて欠損している場合は未解決", () => {
		const definitions = createDefinitionsByShell("master", [
			[
				7,
				{
					id: 7,
					elements: [{ id: 1, kind: "overlay", path: "parts/missing.png", x: 0, y: 0 }],
					animations: [],
					regions: [],
				},
			],
		]);
		const result = resolveSurfaceVisual({
			shellName: "master",
			surfaceId: 7,
			catalog: [createShell("master", [0])],
			definitionsByShell: definitions,
			fileContents: new Map([["shell/master/surface0.png", createPngHeaderBuffer(50, 40)]]),
		});

		expect(result.ok).toBe(false);
		expect(result.model).toBeNull();
		expect(
			result.notifications.some(
				(notification) => notification.code === "SURFACE_PATH_CANDIDATE_MISS",
			),
		).toBe(true);
	});

	it("element 画像が一部欠損していても描画可能レイヤーがあれば継続する", () => {
		const definitions = createDefinitionsByShell("master", [
			[
				8,
				{
					id: 8,
					elements: [
						{ id: 1, kind: "overlay", path: "surface0.png", x: 0, y: 0 },
						{ id: 2, kind: "overlay", path: "parts/missing.png", x: 12, y: 20 },
					],
					animations: [],
					regions: [],
				},
			],
		]);
		const result = resolveSurfaceVisual({
			shellName: "master",
			surfaceId: 8,
			catalog: [createShell("master", [0])],
			definitionsByShell: definitions,
			fileContents: new Map([["shell/master/surface0.png", createPngHeaderBuffer(120, 90)]]),
		});

		expect(result.ok).toBe(true);
		expect(result.model?.mode).toBe("composite");
		expect(result.model?.layers).toHaveLength(1);
		expect(
			result.notifications.some(
				(notification) => notification.code === "SURFACE_PATH_CANDIDATE_MISS",
			),
		).toBe(true);
	});

	it("animation pattern の参照先も静的評価して layer に含める", () => {
		const definitions = createDefinitionsByShell("master", [
			[
				5,
				{
					id: 5,
					elements: [{ id: 0, kind: "base", path: "surface0.png", x: 0, y: 0 }],
					animations: [
						{
							id: 10,
							interval: { raw: "bind", mode: "bind", args: [] },
							patterns: [
								{
									index: 0,
									method: "overlay",
									surfaceRef: 6,
									wait: 0,
									x: 4,
									y: 5,
									optionals: [],
								},
							],
						},
					],
					regions: [],
				},
			],
			[
				6,
				{
					id: 6,
					elements: [{ id: 0, kind: "base", path: "parts/ribbon.png", x: 0, y: 0 }],
					animations: [],
					regions: [],
				},
			],
		]);
		const result = resolveSurfaceVisual({
			shellName: "master",
			surfaceId: 5,
			catalog: [createShell("master", [0])],
			definitionsByShell: definitions,
			fileContents: new Map([
				["shell/master/surface0.png", createPngHeaderBuffer(100, 120)],
				["shell/master/parts/ribbon.png", createPngHeaderBuffer(20, 30)],
			]),
		});

		expect(result.ok).toBe(true);
		expect(result.model?.mode).toBe("composite");
		expect(result.model?.layers).toHaveLength(1);
		expect(result.runtimePlan).not.toBeNull();
		expect(result.runtimePlan?.tracks).toHaveLength(1);
		expect(result.runtimePlan?.tracks[0]?.frames[0]?.layers[0]?.sourcePath).toBe(
			"shell/master/parts/ribbon.png",
		);
	});

	it("definition がある場合は direct asset より composite を優先する", () => {
		const definitions = createDefinitionsByShell("master", [
			[
				5,
				{
					id: 5,
					elements: [
						{ id: 0, kind: "base", path: "surface0.png", x: 0, y: 0 },
						{ id: 1, kind: "overlay", path: "parts/ribbon.png", x: 8, y: 6 },
					],
					animations: [],
					regions: [],
				},
			],
		]);
		const result = resolveSurfaceVisual({
			shellName: "master",
			surfaceId: 5,
			catalog: [
				{
					shellName: "master",
					assets: [
						{
							id: 5,
							shellName: "master",
							pngPath: "shell/master/surface5.png",
							pnaPath: null,
						},
					],
				},
			],
			definitionsByShell: definitions,
			fileContents: new Map([
				["shell/master/surface5.png", createPngHeaderBuffer(10, 10)],
				["shell/master/surface0.png", createPngHeaderBuffer(50, 40)],
				["shell/master/parts/ribbon.png", createPngHeaderBuffer(20, 20)],
			]),
		});

		expect(result.ok).toBe(true);
		expect(result.model?.mode).toBe("composite");
		expect(result.model?.layers).toHaveLength(2);
	});

	it("未解決時に trace と候補パス通知を返す", () => {
		const result = resolveSurfaceVisual({
			shellName: "master",
			surfaceId: 9999,
			catalog: [
				{
					shellName: "master",
					assets: [
						{
							id: 9999,
							shellName: "master",
							pngPath: "shell/master/surface9999.png",
							pnaPath: null,
						},
					],
				},
			],
			definitionsByShell: new Map(),
			fileContents: new Map([["shell/master/surface0000.png", createPngHeaderBuffer(50, 50)]]),
		});

		expect(result.ok).toBe(false);
		expect(result.trace.steps.some((step) => step.stage === "path" && step.ok === false)).toBe(
			true,
		);
		expect(
			result.trace.notifications.some(
				(notification) =>
					notification.code === "SURFACE_PATH_CANDIDATE_MISS" ||
					notification.code === "SURFACE_ASSET_BUFFER_MISSING",
			),
		).toBe(true);
	});
});

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
