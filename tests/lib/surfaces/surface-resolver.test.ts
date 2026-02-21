import { resolveSurfaceId } from "@/lib/surfaces/surface-resolver";
import type { SurfaceAliasMap } from "@/types";
import { describe, expect, it } from "vitest";

describe("resolveSurfaceId", () => {
	it("alias 候補から rng に応じて選択する", () => {
		const aliasMap: SurfaceAliasMap = new Map([[0, new Map([[0, [100, 101, 102]]])]]);
		const result = resolveSurfaceId(0, 0, {
			aliasMap,
			rng: () => 0.51,
		});
		expect(result).toBe(101);
	});

	it("alias 未定義時は requestedId を返す", () => {
		const aliasMap: SurfaceAliasMap = new Map();
		const result = resolveSurfaceId(1, 10, {
			aliasMap,
			rng: () => 0.3,
		});
		expect(result).toBe(10);
	});

	it("空の aliasMap では requestedId をそのまま返す", () => {
		const aliasMap: SurfaceAliasMap = new Map([[0, new Map()]]);
		const result = resolveSurfaceId(0, 5, {
			aliasMap,
			rng: () => 0.5,
		});
		expect(result).toBe(5);
	});

	it("候補が1つの場合はその候補を返す", () => {
		const aliasMap: SurfaceAliasMap = new Map([[0, new Map([[0, [42]]])]]);
		const result = resolveSurfaceId(0, 0, {
			aliasMap,
			rng: () => 0.99,
		});
		expect(result).toBe(42);
	});

	it("rng が 0.0 の場合は最初の候補を選択する", () => {
		const aliasMap: SurfaceAliasMap = new Map([[0, new Map([[0, [100, 101, 102]]])]]);
		const result = resolveSurfaceId(0, 0, {
			aliasMap,
			rng: () => 0.0,
		});
		expect(result).toBe(100);
	});

	it("rng が 1.0 に近い場合は最後の候補を選択する", () => {
		const aliasMap: SurfaceAliasMap = new Map([[0, new Map([[0, [100, 101, 102]]])]]);
		const result = resolveSurfaceId(0, 0, {
			aliasMap,
			rng: () => 0.9999999999999999,
		});
		expect(result).toBe(102);
	});

	it("rng が 1.0 の場合もクランプされ範囲外にならない", () => {
		const aliasMap: SurfaceAliasMap = new Map([[0, new Map([[0, [100, 101, 102]]])]]);
		const result = resolveSurfaceId(0, 0, {
			aliasMap,
			rng: () => 1.0,
		});
		expect(result).toBe(102);
	});

	it("rng が負数の場合は最初の候補を選択する", () => {
		const aliasMap: SurfaceAliasMap = new Map([[0, new Map([[0, [100, 101, 102]]])]]);
		const result = resolveSurfaceId(0, 0, {
			aliasMap,
			rng: () => -0.5,
		});
		expect(result).toBe(100);
	});

	it("rng が NaN の場合は最初の候補を選択する", () => {
		const aliasMap: SurfaceAliasMap = new Map([[0, new Map([[0, [100, 101]]])]]);
		const result = resolveSurfaceId(0, 0, {
			aliasMap,
			rng: () => Number.NaN,
		});
		expect(result).toBe(100);
	});

	it("空の候補配列では requestedId を返す", () => {
		const aliasMap: SurfaceAliasMap = new Map([[0, new Map([[0, []]])]]);
		const result = resolveSurfaceId(0, 0, {
			aliasMap,
			rng: () => 0.5,
		});
		expect(result).toBe(0);
	});
});
