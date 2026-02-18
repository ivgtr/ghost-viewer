import { readPngMetadata } from "@/lib/surfaces/png-metadata";
import { describe, expect, it } from "vitest";

describe("readPngMetadata", () => {
	it("PNGヘッダから width/height を抽出できる", () => {
		const buffer = createPngHeaderBuffer(320, 480);
		const metadata = readPngMetadata(buffer);
		expect(metadata).toEqual({ width: 320, height: 480 });
	});

	it("不正なバッファは null を返す", () => {
		const metadata = readPngMetadata(new Uint8Array([1, 2, 3]).buffer);
		expect(metadata).toBeNull();
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
