import { buildSurfaceSetLayout } from "@/lib/surfaces/surface-set-layout";
import { describe, expect, it } from "vitest";

describe("buildSurfaceSetLayout", () => {
	it("descript座標を優先し、複数キーを解決する", () => {
		const layout = buildSurfaceSetLayout({
			viewportWidth: 800,
			viewportHeight: 600,
			descriptProperties: {
				"sakura.defaultx": "10",
				"sakura.defaulty": "20",
				"char1.defaultx": "200",
				"char1.defaulty": "40",
			},
			characters: [
				{ scopeId: 0, surfaceId: 0, fileName: "surface0.png", width: 100, height: 200 },
				{ scopeId: 1, surfaceId: 10, fileName: "surface10.png", width: 80, height: 120 },
			],
		});

		const scope0 = layout.placements.find((placement) => placement.scopeId === 0);
		const scope1 = layout.placements.find((placement) => placement.scopeId === 1);
		expect(scope0?.positionSource.xKey).toBe("sakura.defaultx");
		expect(scope0?.positionSource.yKey).toBe("sakura.defaulty");
		expect(scope1?.positionSource.xKey).toBe("char1.defaultx");
		expect(scope1?.positionSource.yKey).toBe("char1.defaulty");
		expect(scope1?.worldX).toBe(200);
		expect(scope1?.worldY).toBe(40);
	});

	it("scope1座標が未指定の場合は scope0 右隣 + 下揃えでフォールバックする", () => {
		const layout = buildSurfaceSetLayout({
			viewportWidth: 800,
			viewportHeight: 600,
			descriptProperties: {
				"char0.defaultx": "50",
				"char0.defaulty": "25",
			},
			characters: [
				{ scopeId: 0, surfaceId: 0, fileName: "surface0.png", width: 120, height: 200 },
				{ scopeId: 1, surfaceId: 10, fileName: "surface10.png", width: 90, height: 140 },
			],
			gap: 24,
		});

		const scope1 = layout.placements.find((placement) => placement.scopeId === 1);
		expect(scope1?.worldX).toBe(50 + 120 + 24);
		expect(scope1?.worldY).toBe(25);
		expect(scope1?.positionSource.isFallback).toBe(true);
	});

	it("外接矩形をビューアー領域に全体fitする", () => {
		const layout = buildSurfaceSetLayout({
			viewportWidth: 500,
			viewportHeight: 300,
			descriptProperties: {},
			characters: [
				{ scopeId: 0, surfaceId: 0, fileName: "surface0.png", width: 200, height: 200 },
				{ scopeId: 1, surfaceId: 10, fileName: "surface10.png", width: 100, height: 100 },
			],
			gap: 20,
			padding: 10,
		});

		expect(layout.worldWidth).toBe(320);
		expect(layout.worldHeight).toBe(200);
		expect(layout.scale).toBeCloseTo(1.4, 5);
		for (const placement of layout.placements) {
			expect(placement.screenX).toBeGreaterThanOrEqual(0);
			expect(placement.screenY).toBeGreaterThanOrEqual(0);
			expect(placement.screenX + placement.screenWidth).toBeLessThanOrEqual(500);
			expect(placement.screenY + placement.screenHeight).toBeLessThanOrEqual(300);
		}
	});
});
