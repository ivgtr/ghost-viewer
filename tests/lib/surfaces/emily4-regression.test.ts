import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveSurfaceVisual } from "@/lib/surfaces/surface-visual-resolver";
import { parseSurfacesCore } from "@/lib/surfaces/surfaces-parser-core";
import type { ShellSurfaceCatalog, SurfaceDefinitionFilesByShell } from "@/types";
import { describe, expect, it } from "vitest";

describe("emily4 regression", () => {
	it("surface5 と surface11 を definition 経由で解決できる", () => {
		const surfacesText = readFileSync(
			resolve(process.cwd(), "tests/fixtures/surfaces/emily4-surfaces.txt"),
			"utf-8",
		);
		const filesByShell: SurfaceDefinitionFilesByShell = new Map([
			[
				"master",
				[
					{
						shellName: "master",
						path: "shell/master/surfaces.txt",
						kind: "surfaces",
						text: surfacesText,
					},
				],
			],
		]);
		const parsed = parseSurfacesCore(filesByShell);
		const surface5Definition = parsed.definitionsByShell.get("master")?.get(5);
		expect(surface5Definition?.elements).toHaveLength(2);
		expect(surface5Definition?.animations.map((animation) => animation.id)).toContain(50);
		const catalog: ShellSurfaceCatalog[] = [
			{
				shellName: "master",
				assets: [
					{
						id: 0,
						shellName: "master",
						pngPath: "shell/master/surface0000.png",
						pnaPath: null,
					},
					{
						id: 10,
						shellName: "master",
						pngPath: "shell/master/surface0010.png",
						pnaPath: null,
					},
					{
						id: 4000,
						shellName: "master",
						pngPath: "shell/master/surface4000.png",
						pnaPath: null,
					},
				],
			},
		];
		const fileContents = new Map<string, ArrayBuffer>([
			["shell/master/surface0000.png", createPngHeaderBuffer(120, 180)],
			["shell/master/surface0010.png", createPngHeaderBuffer(110, 160)],
			["shell/master/surface4000.png", createPngHeaderBuffer(80, 80)],
			["shell/master/element0005.png", createPngHeaderBuffer(50, 60)],
			["shell/master/element0011.png", createPngHeaderBuffer(48, 44)],
		]);

		const surface5 = resolveSurfaceVisual({
			shellName: "master",
			surfaceId: 5,
			catalog,
			definitionsByShell: parsed.definitionsByShell,
			fileContents,
		});
		const surface11 = resolveSurfaceVisual({
			shellName: "master",
			surfaceId: 11,
			catalog,
			definitionsByShell: parsed.definitionsByShell,
			fileContents,
		});

		expect(surface5.ok).toBe(true);
		expect(surface5.model?.mode).toBe("composite");
		expect(surface5.model?.layers.length).toBeGreaterThanOrEqual(2);
		expect(surface11.ok).toBe(true);
		expect(surface11.model?.mode).toBe("composite");
		expect(surface11.model?.layers).toHaveLength(2);
		expect(surface5.trace.steps.some((step) => step.stage === "static-eval" && step.ok)).toBe(true);
		expect(surface11.trace.steps.some((step) => step.stage === "static-eval" && step.ok)).toBe(
			true,
		);
	});
});

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
