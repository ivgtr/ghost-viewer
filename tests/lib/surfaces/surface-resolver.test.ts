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
});
