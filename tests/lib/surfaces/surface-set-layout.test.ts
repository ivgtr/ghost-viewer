import { buildSurfaceSetLayout } from "@/lib/surfaces/surface-set-layout";
import type { SurfaceScene } from "@/types";
import { describe, expect, it } from "vitest";

describe("buildSurfaceSetLayout", () => {
	it("scene ノード外接矩形をビューアー領域へ全体 fit する", () => {
		const layout = buildSurfaceSetLayout({
			viewportWidth: 500,
			viewportHeight: 300,
			scene: createScene({
				nodes: [
					{ scopeId: 0, worldLeft: 100, worldBottom: 0, width: 200, height: 200 },
					{ scopeId: 1, worldLeft: 0, worldBottom: 0, width: 100, height: 100 },
				],
			}),
			padding: 10,
		});

		expect(layout.worldWidth).toBe(300);
		expect(layout.worldHeight).toBe(200);
		expect(layout.scale).toBeCloseTo(1.4, 5);
		for (const placement of layout.placements) {
			expect(placement.screenX).toBeGreaterThanOrEqual(0);
			expect(placement.screenY).toBeGreaterThanOrEqual(0);
			expect(placement.screenX + placement.screenWidth).toBeLessThanOrEqual(500);
			expect(placement.screenY + placement.screenHeight).toBeLessThanOrEqual(300);
		}
	});

	it("alignment=free のとき defaultleft/defaulttop をオフセットに反映する", () => {
		const base = buildSurfaceSetLayout({
			viewportWidth: 500,
			viewportHeight: 300,
			scene: createScene(),
		});
		const shifted = buildSurfaceSetLayout({
			viewportWidth: 500,
			viewportHeight: 300,
			scene: createScene({
				alignmentMode: "free",
				defaultLeft: 20,
				defaultTop: 30,
			}),
		});

		expect(shifted.offsetX).toBeCloseTo(base.offsetX + 20, 5);
		expect(shifted.offsetY).toBeCloseTo(base.offsetY + 30, 5);
		expect(shifted.placements[0]?.screenX).toBeCloseTo((base.placements[0]?.screenX ?? 0) + 20, 5);
		expect(shifted.placements[0]?.screenY).toBeCloseTo((base.placements[0]?.screenY ?? 0) + 30, 5);
	});
});

function createScene(overrides: Partial<SurfaceScene> = {}): SurfaceScene {
	return {
		nodes: [
			{
				scopeId: 0,
				surfaceId: 0,
				fileName: "surface0.png",
				width: 200,
				height: 200,
				worldLeft: 0,
				worldBottom: 0,
				position: {
					scopeId: 0,
					centerX: 100,
					bottomY: 0,
					xKey: null,
					yKey: null,
					xSource: "fallback",
					ySource: "fallback",
					isFallback: true,
				},
			},
		],
		alignmentMode: "none",
		defaultLeft: 0,
		defaultTop: 0,
		...overrides,
	};
}
