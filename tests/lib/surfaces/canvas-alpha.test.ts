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

		const changed = applyColorKeyTransparency(layer);
		expect(changed).toBe(true);
		expect(layer.data[3]).toBe(0);
		expect(layer.data[7]).toBe(255);
		expect(layer.data[11]).toBe(0);
	});

	it("既にalphaを持つ画像には色キー透過を適用しない", () => {
		const layer = {
			data: new Uint8ClampedArray([0, 255, 0, 255, 10, 20, 30, 200]),
		};

		const changed = applyColorKeyTransparency(layer);
		expect(changed).toBe(false);
		expect(layer.data[3]).toBe(255);
		expect(layer.data[7]).toBe(200);
	});
});
