import {
	resolveSurfaceAlignment,
	resolveSurfacePosition,
} from "@/lib/surfaces/surface-position-resolver";
import { describe, expect, it } from "vitest";

describe("surface-position-resolver", () => {
	it("座標キーは shell descript を ghost descript より優先する", () => {
		const resolved = resolveSurfacePosition({
			scopeId: 0,
			shellDescriptProperties: {
				"sakura.defaultx": "220",
				"sakura.defaulty": "330",
			},
			ghostDescriptProperties: {
				"sakura.defaultx": "10",
				"sakura.defaulty": "20",
			},
			fallbackCenterX: 0,
			fallbackBottomY: 0,
		});

		expect(resolved.centerX).toBe(220);
		expect(resolved.bottomY).toBe(330);
		expect(resolved.xSource).toBe("shell");
		expect(resolved.ySource).toBe("shell");
		expect(resolved.isFallback).toBe(false);
	});

	it("alignmenttodesktop=free のときのみ defaultleft/defaulttop を適用する", () => {
		const free = resolveSurfaceAlignment({
			shellDescriptProperties: {
				alignmenttodesktop: "free",
				defaultleft: "12",
				defaulttop: "34",
			},
			ghostDescriptProperties: {},
		});
		expect(free.mode).toBe("free");
		expect(free.defaultLeft).toBe(12);
		expect(free.defaultTop).toBe(34);

		const none = resolveSurfaceAlignment({
			shellDescriptProperties: {
				alignmenttodesktop: "none",
				defaultleft: "99",
				defaulttop: "88",
			},
			ghostDescriptProperties: {},
		});
		expect(none.mode).toBe("none");
		expect(none.defaultLeft).toBe(0);
		expect(none.defaultTop).toBe(0);
	});

	it("明示座標がない場合は fallback 座標を使う", () => {
		const resolved = resolveSurfacePosition({
			scopeId: 1,
			shellDescriptProperties: {},
			ghostDescriptProperties: {},
			fallbackCenterX: 150,
			fallbackBottomY: 40,
		});

		expect(resolved.centerX).toBe(150);
		expect(resolved.bottomY).toBe(40);
		expect(resolved.xSource).toBe("fallback");
		expect(resolved.ySource).toBe("fallback");
		expect(resolved.isFallback).toBe(true);
	});
});
