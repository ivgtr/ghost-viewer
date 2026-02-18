import { extractSurfaceAssets } from "@/lib/surfaces/surface-asset-extractor";
import { describe, expect, it } from "vitest";

describe("extractSurfaceAssets", () => {
	it("shell/master が存在する場合は初期シェルに master を選ぶ", () => {
		const result = extractSurfaceAssets(
			new Map([
				["shell/alt/surface0.png", new ArrayBuffer(1)],
				["shell/master/surface1.png", new ArrayBuffer(1)],
			]),
		);

		expect(result.initialShellName).toBe("master");
		expect(result.shells.map((shell) => shell.shellName)).toEqual(["alt", "master"]);
	});

	it("master 不在時は shell 名の辞書順先頭を初期シェルにする", () => {
		const result = extractSurfaceAssets(
			new Map([
				["shell/zeta/surface0.png", new ArrayBuffer(1)],
				["shell/alpha/surface5.png", new ArrayBuffer(1)],
			]),
		);

		expect(result.initialShellName).toBe("alpha");
	});

	it("surface png/pna のペアを同一 ID で保持する", () => {
		const result = extractSurfaceAssets(
			new Map([
				["shell/master/surface10.png", new ArrayBuffer(1)],
				["shell/master/surface10.pna", new ArrayBuffer(1)],
			]),
		);

		expect(result.shells).toHaveLength(1);
		expect(result.shells[0]?.assets).toEqual([
			{
				id: 10,
				shellName: "master",
				pngPath: "shell/master/surface10.png",
				pnaPath: "shell/master/surface10.pna",
			},
		]);
	});

	it("surface が存在しない場合は診断を返す", () => {
		const result = extractSurfaceAssets(
			new Map([["ghost/master/descript.txt", new ArrayBuffer(1)]]),
		);

		expect(result.shells).toEqual([]);
		expect(result.initialShellName).toBeNull();
		expect(result.diagnostics).toEqual([
			{
				level: "warning",
				code: "SURFACE_NOT_FOUND",
				message: "surface 画像が見つかりません",
				shellName: null,
				path: null,
			},
		]);
	});
});
