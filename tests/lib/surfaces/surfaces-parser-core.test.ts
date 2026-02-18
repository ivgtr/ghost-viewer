import { parseSurfacesCore } from "@/lib/surfaces/surfaces-parser-core";
import type { SurfaceDefinitionFilesByShell } from "@/types";
import { describe, expect, it } from "vitest";

describe("parseSurfacesCore", () => {
	it("surface/surface.append をマージして element を抽出する", () => {
		const filesByShell: SurfaceDefinitionFilesByShell = new Map([
			[
				"master",
				[
					{
						shellName: "master",
						path: "shell/master/surfaces.txt",
						kind: "surfaces",
						text: [
							"surface0{",
							"element0,base,surface0.png,0,0",
							"animation0,always,1",
							"}",
							"surface.append0{",
							"element1,overlay,parts.png,10,20",
							"unknown,1",
							"}",
						].join("\n"),
					},
				],
			],
		]);

		const result = parseSurfacesCore(filesByShell);
		const definition = result.definitionsByShell.get("master")?.get(0);
		expect(definition?.elements).toEqual([
			{ id: 0, kind: "base", path: "surface0.png", x: 0, y: 0 },
			{ id: 1, kind: "overlay", path: "parts.png", x: 10, y: 20 },
		]);
		expect(result.diagnostics.some((d) => d.code === "SURFACE_CORE_UNSUPPORTED_SYNTAX")).toBe(true);
		expect(result.diagnostics.some((d) => d.code === "SURFACE_CORE_UNKNOWN_SYNTAX")).toBe(true);
	});

	it("surface.alias を抽出する", () => {
		const filesByShell: SurfaceDefinitionFilesByShell = new Map([
			[
				"master",
				[
					{
						shellName: "master",
						path: "shell/master/alias.txt",
						kind: "alias",
						text: ["surface.alias{", "sakura.surface,0,[1,2,3]", "kero.surface,10,[20]", "}"].join(
							"\n",
						),
					},
				],
			],
		]);

		const result = parseSurfacesCore(filesByShell);
		const aliasMap = result.aliasMapByShell.get("master");
		expect(aliasMap?.get(0)?.get(0)).toEqual([1, 2, 3]);
		expect(aliasMap?.get(1)?.get(10)).toEqual([20]);
	});
});
