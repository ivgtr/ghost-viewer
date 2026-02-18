import { loadSurfaceDefinitions } from "@/lib/surfaces/surfaces-definition-loader";
import { describe, expect, it } from "vitest";

function toBuffer(text: string): ArrayBuffer {
	return new TextEncoder().encode(text).buffer;
}

describe("loadSurfaceDefinitions", () => {
	it("surfaces*.txt を辞書順で読み込み alias.txt を最後に適用する", () => {
		const fileContents = new Map<string, ArrayBuffer>([
			["shell/master/surfaces2.txt", toBuffer("surface2{\n}")],
			["shell/master/surfaces.txt", toBuffer("surface0{\n}")],
			["shell/master/alias.txt", toBuffer("surface.alias{\n}")],
			["shell/master/surfaces1.txt", toBuffer("surface1{\n}")],
		]);

		const result = loadSurfaceDefinitions(fileContents, ["master"]);
		const files = result.filesByShell.get("master");
		expect(files?.map((file) => file.path)).toEqual([
			"shell/master/surfaces.txt",
			"shell/master/surfaces1.txt",
			"shell/master/surfaces2.txt",
			"shell/master/alias.txt",
		]);
	});

	it("対象 shell に定義がない場合は warning を返す", () => {
		const result = loadSurfaceDefinitions(new Map(), ["master"]);
		expect(result.filesByShell.size).toBe(0);
		expect(result.diagnostics).toEqual([
			{
				level: "warning",
				code: "SURFACE_DEFINITION_NOT_FOUND",
				message: "surfaces 定義ファイルが見つかりません",
				shellName: "master",
				path: null,
			},
		]);
	});
});
