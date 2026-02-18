import { buildSurfaceScene } from "@/lib/surfaces/surface-scene-builder";
import { describe, expect, it } from "vitest";

describe("buildSurfaceScene", () => {
	it("未指定時は kero 左 / sakura 右で下端揃えする", () => {
		const scene = buildSurfaceScene({
			characters: [
				{ scopeId: 0, surfaceId: 0, fileName: "surface0.png", width: 120, height: 200 },
				{ scopeId: 1, surfaceId: 10, fileName: "surface10.png", width: 80, height: 140 },
			],
			shellDescriptProperties: {},
			ghostDescriptProperties: {},
			gap: 24,
		});

		const sakura = scene.nodes.find((node) => node.scopeId === 0);
		const kero = scene.nodes.find((node) => node.scopeId === 1);
		expect(kero?.worldLeft).toBe(0);
		expect(sakura?.worldLeft).toBe(104);
		expect(kero?.worldBottom).toBe(0);
		expect(sakura?.worldBottom).toBe(0);
	});

	it("defaultx/defaulty は中心X/下端Yとして world 座標へ変換する", () => {
		const scene = buildSurfaceScene({
			characters: [{ scopeId: 0, surfaceId: 0, fileName: "surface0.png", width: 100, height: 180 }],
			shellDescriptProperties: {
				"sakura.defaultx": "300",
				"sakura.defaulty": "40",
			},
			ghostDescriptProperties: {},
		});

		const sakura = scene.nodes[0];
		expect(sakura?.worldLeft).toBe(250);
		expect(sakura?.worldBottom).toBe(40);
	});

	it("明示座標がある scope はフォールバック配置で上書きしない", () => {
		const scene = buildSurfaceScene({
			characters: [
				{ scopeId: 0, surfaceId: 0, fileName: "surface0.png", width: 120, height: 200 },
				{ scopeId: 1, surfaceId: 10, fileName: "surface10.png", width: 80, height: 140 },
			],
			shellDescriptProperties: {
				"kero.defaultx": "300",
				"kero.defaulty": "20",
			},
			ghostDescriptProperties: {},
		});

		const kero = scene.nodes.find((node) => node.scopeId === 1);
		expect(kero?.worldLeft).toBe(260);
		expect(kero?.worldBottom).toBe(20);
	});

	it("描画サイズが不正な scope は scene node を生成しない", () => {
		const scene = buildSurfaceScene({
			characters: [
				{ scopeId: 0, surfaceId: 0, fileName: "surface0.png", width: 0, height: 200 },
				{ scopeId: 1, surfaceId: 10, fileName: "surface10.png", width: 80, height: 140 },
			],
			shellDescriptProperties: {},
			ghostDescriptProperties: {},
		});

		expect(scene.nodes).toHaveLength(1);
		expect(scene.nodes[0]?.scopeId).toBe(1);
	});
});
