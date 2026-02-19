import { applyAlphaMask, applyColorKeyTransparency } from "@/lib/surfaces/canvas-alpha";
import { describe, expect, it } from "vitest";

describe("canvas-alpha", () => {
	it("PNAマスクをalphaに適用できる", () => {
		const layer = {
			data: new Uint8ClampedArray([10, 20, 30, 255, 40, 50, 60, 255]),
		};
		const mask = {
			data: new Uint8ClampedArray([120, 0, 0, 255, 5, 0, 0, 255]),
		};

		applyAlphaMask(layer, mask);
		expect(layer.data[3]).toBe(120);
		expect(layer.data[7]).toBe(5);
	});

	it("透過情報が無い画像に色キー透過を適用できる", () => {
		const layer = {
			data: new Uint8ClampedArray([0, 255, 0, 255, 10, 20, 30, 255, 0, 255, 0, 255]),
		};

		const changed = applyColorKeyTransparency(layer, 3, 1);
		expect(changed).toBe(true);
		expect(layer.data[3]).toBe(0);
		expect(layer.data[7]).toBe(255);
		expect(layer.data[11]).toBe(0);
	});

	it("既にalphaを持つ画像には色キー透過を適用しない", () => {
		const layer = {
			data: new Uint8ClampedArray([
				0, 255, 0, 255, 0, 250, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 10, 20, 30, 200, 0, 255, 0,
				255, 0, 255, 0, 255, 0, 254, 0, 255, 0, 255, 0, 255,
			]),
		};

		const changed = applyColorKeyTransparency(layer, 3, 3);
		expect(changed).toBe(false);
		expect(layer.data[3]).toBe(255);
		expect(layer.data[7]).toBe(255);
		expect(layer.data[11]).toBe(255);
		expect(layer.data[15]).toBe(255);
		expect(layer.data[19]).toBe(200);
	});

	it("左上ピクセルの色キーで孤立領域も透過できる", () => {
		const width = 6;
		const height = 6;
		const pixelCount = width * height;
		const data = new Uint8ClampedArray(pixelCount * 4);
		for (let index = 0; index < pixelCount; index += 1) {
			const offset = index * 4;
			data[offset] = 64;
			data[offset + 1] = 32;
			data[offset + 2] = 16;
			data[offset + 3] = 255;
		}

		const border = [
			[0, 0],
			[1, 0],
			[2, 0],
			[3, 0],
			[4, 0],
			[5, 0],
			[5, 1],
			[5, 2],
			[5, 3],
			[5, 4],
			[5, 5],
			[4, 5],
			[3, 5],
			[2, 5],
			[1, 5],
			[0, 5],
			[0, 4],
			[0, 3],
			[0, 2],
			[0, 1],
		] as const;
		const nonKeyColors = [
			[16, 8, 40],
			[24, 24, 56],
			[40, 16, 72],
			[56, 40, 88],
			[72, 24, 104],
			[88, 56, 120],
			[104, 40, 136],
			[120, 72, 152],
			[136, 56, 168],
			[152, 88, 184],
			[168, 72, 200],
			[184, 104, 216],
			[200, 88, 232],
			[216, 120, 248],
			[232, 104, 160],
			[248, 136, 176],
		] as const;

		border.forEach(([x, y], index) => {
			const offset = (y * width + x) * 4;
			if (index === 0) {
				data[offset] = 0;
				data[offset + 1] = 255;
				data[offset + 2] = 0;
				return;
			}
			const color = nonKeyColors[index - 1];
			if (!color) {
				return;
			}
			data[offset] = color[0];
			data[offset + 1] = color[1];
			data[offset + 2] = color[2];
		});

		// borderと連結している緑背景
		setPixel(data, width, 1, 1, 0, 255, 0, 255);
		setPixel(data, width, 2, 1, 0, 255, 0, 255);
		// 孤立した緑背景（flood-fillでは到達不能）
		setPixel(data, width, 3, 3, 0, 255, 0, 255);
		// 非キー色は維持
		setPixel(data, width, 4, 3, 255, 128, 64, 255);

		const layer = { data };
		const changed = applyColorKeyTransparency(layer, width, height);
		expect(changed).toBe(true);
		expect(getAlpha(layer.data, width, 3, 3)).toBe(0);
		expect(getAlpha(layer.data, width, 4, 3)).toBe(255);
	});
});

function setPixel(
	data: Uint8ClampedArray,
	width: number,
	x: number,
	y: number,
	r: number,
	g: number,
	b: number,
	a: number,
): void {
	const offset = (y * width + x) * 4;
	data[offset] = r;
	data[offset + 1] = g;
	data[offset + 2] = b;
	data[offset + 3] = a;
}

function getAlpha(data: Uint8ClampedArray, width: number, x: number, y: number): number {
	return data[(y * width + x) * 4 + 3] ?? 0;
}
