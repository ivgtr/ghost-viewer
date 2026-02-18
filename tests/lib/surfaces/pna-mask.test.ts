import {
	buildSurfacePathIndex,
	resolvePnaMaskPath,
	resolvePathFromIndex,
} from "@/lib/surfaces/pna-mask";
import { describe, expect, it } from "vitest";

describe("pna-mask", () => {
	it("png と同名 pna を解決する", () => {
		const fileContents = new Map<string, ArrayBuffer>([
			["shell/master/surface0.png", createPngHeaderBuffer(120, 200)],
			["shell/master/surface0.pna", createPngHeaderBuffer(120, 200)],
		]);
		const sourceIndex = buildSurfacePathIndex(fileContents);

		const result = resolvePnaMaskPath({
			shellName: "master",
			surfaceId: 0,
			sourcePath: "shell/master/surface0.png",
			explicitPnaPath: null,
			sourceIndex,
			fileContents,
		});

		expect(result.alphaMaskPath).toBe("shell/master/surface0.pna");
		expect(result.notifications).toEqual([]);
	});

	it("pna が不正またはサイズ不一致なら warning を返してフォールバックする", () => {
		const fileContents = new Map<string, ArrayBuffer>([
			["shell/master/surface0.png", createPngHeaderBuffer(120, 200)],
			["shell/master/surface0.pna", createPngHeaderBuffer(64, 64)],
		]);
		const sourceIndex = buildSurfacePathIndex(fileContents);

		const result = resolvePnaMaskPath({
			shellName: "master",
			surfaceId: 0,
			sourcePath: "shell/master/surface0.png",
			explicitPnaPath: null,
			sourceIndex,
			fileContents,
		});

		expect(result.alphaMaskPath).toBeNull();
		expect(
			result.notifications.some(
				(notification) => notification.code === "SURFACE_PNA_DIMENSION_MISMATCH",
			),
		).toBe(true);
	});

	it("path index は大文字小文字を吸収して解決できる", () => {
		const fileContents = new Map<string, ArrayBuffer>([
			["Shell/Master/Surface0.PNG", createPngHeaderBuffer(10, 10)],
		]);
		const pathIndex = buildSurfacePathIndex(fileContents);
		expect(resolvePathFromIndex("shell/master/surface0.png", pathIndex)).toBe(
			"Shell/Master/Surface0.PNG",
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
