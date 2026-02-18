import { buildSurfaceSourceIndex, resolveImagePath } from "@/lib/surfaces/surface-source-index";
import { describe, expect, it } from "vitest";

describe("surface-source-index", () => {
	it("大文字小文字と区切り差を吸収して解決できる", () => {
		const fileContents = new Map<string, ArrayBuffer>([
			["Shell/Master/Surface0000.PNG", new ArrayBuffer(1)],
		]);
		const index = buildSurfaceSourceIndex(fileContents);

		const resolution = resolveImagePath({
			requestedPath: "shell\\master\\surface0000.png",
			shellName: "master",
			index,
		});

		expect(resolution.ok).toBe(true);
		expect(resolution.resolvedPath).toBe("Shell/Master/Surface0000.PNG");
	});

	it("surface10 と surface0010 の揺れを吸収する", () => {
		const fileContents = new Map<string, ArrayBuffer>([
			["shell/master/surface0010.png", new ArrayBuffer(1)],
		]);
		const index = buildSurfaceSourceIndex(fileContents);

		const resolution = resolveImagePath({
			requestedPath: "surface10.png",
			shellName: "master",
			index,
		});

		expect(resolution.ok).toBe(true);
		expect(resolution.resolvedPath).toBe("shell/master/surface0010.png");
	});

	it("拡張子省略の相対パスを補完する", () => {
		const fileContents = new Map<string, ArrayBuffer>([
			["shell/master/element0011.png", new ArrayBuffer(1)],
		]);
		const index = buildSurfaceSourceIndex(fileContents);

		const resolution = resolveImagePath({
			requestedPath: "element0011",
			shellName: "master",
			index,
		});

		expect(resolution.ok).toBe(true);
		expect(resolution.resolvedPath).toBe("shell/master/element0011.png");
	});

	it("未解決時に候補列を返す", () => {
		const fileContents = new Map<string, ArrayBuffer>();
		const index = buildSurfaceSourceIndex(fileContents);

		const resolution = resolveImagePath({
			requestedPath: "surface10",
			shellName: "master",
			index,
		});

		expect(resolution.ok).toBe(false);
		expect(resolution.reason).toBe("not-found");
		expect(resolution.attemptedCandidates.length).toBeGreaterThan(0);
	});
});
