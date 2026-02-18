import { parseSurfacesCore } from "@/lib/surfaces/surfaces-parser-core";
import type { SurfaceDefinitionFilesByShell } from "@/types";
import { describe, expect, it } from "vitest";

describe("parseSurfacesCore(full)", () => {
	it("animation interval/pattern と collision/point を抽出できる", () => {
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
							"animation10.interval,bind+talk,1",
							"animation10.pattern0,overlay,100,0,10,20",
							"collisionex0,head,rect,10,20,30,40",
							"point0,center,point,100,200",
							"}",
						].join("\n"),
					},
				],
			],
		]);

		const result = parseSurfacesCore(filesByShell);
		const definition = result.definitionsByShell.get("master")?.get(0);
		expect(definition).toBeDefined();
		expect(definition?.animations).toHaveLength(1);
		expect(definition?.animations[0]?.interval?.mode).toBe("bind");
		expect(definition?.animations[0]?.interval?.args).toEqual([1]);
		expect(definition?.animations[0]?.patterns[0]).toMatchObject({
			index: 0,
			method: "overlay",
			surfaceRef: 100,
			x: 10,
			y: 20,
		});
		expect(definition?.regions).toHaveLength(2);
		expect(result.diagnostics).toEqual([]);
	});

	it("surface.append の空追記で既存定義を壊さない", () => {
		const filesByShell: SurfaceDefinitionFilesByShell = new Map([
			[
				"master",
				[
					{
						shellName: "master",
						path: "shell/master/surfaces.txt",
						kind: "surfaces",
						text: [
							"surface10{",
							"element0,base,surface10.png,0,0",
							"animation0.interval,runonce",
							"animation0.pattern0,overlay,100,0,0,0",
							"}",
							"surface.append10{",
							"// no-op",
							"}",
						].join("\n"),
					},
				],
			],
		]);

		const result = parseSurfacesCore(filesByShell);
		const definition = result.definitionsByShell.get("master")?.get(10);
		expect(definition?.elements).toHaveLength(1);
		expect(definition?.animations).toHaveLength(1);
		expect(definition?.animations[0]?.patterns).toHaveLength(1);
	});

	it("コメント内の中括弧を無視して block を抽出できる", () => {
		const filesByShell: SurfaceDefinitionFilesByShell = new Map([
			[
				"master",
				[
					{
						shellName: "master",
						path: "shell/master/surfaces.txt",
						kind: "surfaces",
						text: [
							"// {",
							"// }",
							"surface5",
							"{",
							"animation50.interval,always",
							"animation50.pattern0,overlay,4000,200,160,5",
							"element0,overlay,surface0000.png,0,0",
							"element1,overlay,element0005.png,85,80",
							"}",
						].join("\n"),
					},
				],
			],
		]);

		const result = parseSurfacesCore(filesByShell);
		const definition = result.definitionsByShell.get("master")?.get(5);
		expect(definition).toBeDefined();
		expect(definition?.elements).toHaveLength(2);
		expect(definition?.animations[0]?.id).toBe(50);
		expect(definition?.animations[0]?.patterns[0]?.surfaceRef).toBe(4000);
	});

	it("同一 surface の複数 block をマージして element と animation を保持する", () => {
		const filesByShell: SurfaceDefinitionFilesByShell = new Map([
			[
				"master",
				[
					{
						shellName: "master",
						path: "shell/master/surfaces.txt",
						kind: "surfaces",
						text: [
							"surface5",
							"{",
							"animation50.interval,always",
							"animation50.pattern0,overlay,4000,200,160,5",
							"animation50.pattern1,overlay,4000,200,150,15",
							"element0,overlay,surface0000.png,0,0",
							"element1,overlay,element0005.png,85,80",
							"}",
							"surface5",
							"{",
							"animation100.interval,bind",
							"animation100.pattern0,bind,6000,0,90,100",
							"}",
						].join("\n"),
					},
				],
			],
		]);

		const result = parseSurfacesCore(filesByShell);
		const definition = result.definitionsByShell.get("master")?.get(5);
		expect(definition?.elements).toHaveLength(2);
		expect(definition?.animations.map((animation) => animation.id)).toEqual([50, 100]);
		expect(definition?.animations[0]?.patterns).toHaveLength(2);
		expect(definition?.animations[1]?.patterns[0]?.method).toBe("overlay");
	});

	it("alias の文字列キーを保持できる", () => {
		const filesByShell: SurfaceDefinitionFilesByShell = new Map([
			[
				"master",
				[
					{
						shellName: "master",
						path: "shell/master/alias.txt",
						kind: "alias",
						text: [
							"surface.alias{",
							"sakura.surface,smile,[10,11]",
							"kero.surface,0,[20]",
							"}",
						].join("\n"),
					},
				],
			],
		]);

		const result = parseSurfacesCore(filesByShell);
		const aliasMap = result.aliasMapByShell.get("master");
		expect(aliasMap?.get(0)?.get("smile")).toEqual([10, 11]);
		expect(aliasMap?.get(1)?.get(0)).toEqual([20]);
	});

	it("sakura/kero.surface.alias と point.* 構文を抽出できる", () => {
		const filesByShell: SurfaceDefinitionFilesByShell = new Map([
			[
				"master",
				[
					{
						shellName: "master",
						path: "shell/master/surfaces.txt",
						kind: "surfaces",
						text: [
							"sakura.surface.alias{",
							"35,[55]",
							"}",
							"kero.surface.alias{",
							"300,[600]",
							"}",
							"surface20{",
							"point.centerx,122",
							"point.kinoko.centery,237",
							"}",
						].join("\n"),
					},
				],
			],
		]);

		const result = parseSurfacesCore(filesByShell);
		const aliasMap = result.aliasMapByShell.get("master");
		expect(aliasMap?.get(0)?.get(35)).toEqual([55]);
		expect(aliasMap?.get(1)?.get(300)).toEqual([600]);
		const regions = result.definitionsByShell.get("master")?.get(20)?.regions ?? [];
		expect(regions.some((region) => region.kind === "point" && region.name === "centerx")).toBe(
			true,
		);
		expect(
			regions.some((region) => region.kind === "point" && region.name === "kinoko.centery"),
		).toBe(true);
	});
});
