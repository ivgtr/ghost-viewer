import {
	isEquivalentVisualModel,
	mergeDescriptProperties,
	parseSurfaceId,
	resolveAvailableSurfaceIds,
	resolveRequestedSurfaceId,
	resolveSelectedShellName,
	toDefaultSurfaceKey,
} from "@/lib/surfaces/surface-resolution";
import type { ShellSurfaceCatalog, SurfaceDefinitionsByShell, SurfaceVisualModel } from "@/types";
import { describe, expect, it } from "vitest";

describe("resolveSelectedShellName", () => {
	const catalog: ShellSurfaceCatalog[] = [
		{ shellName: "master", assets: [] },
		{ shellName: "sub", assets: [] },
	];

	it("preferredShellName がカタログに存在すればそれを返す", () => {
		expect(resolveSelectedShellName(catalog, "sub")).toBe("sub");
	});

	it("preferredShellName がカタログに存在しなければ最初のシェルを返す", () => {
		expect(resolveSelectedShellName(catalog, "unknown")).toBe("master");
	});

	it("preferredShellName が null ならば最初のシェルを返す", () => {
		expect(resolveSelectedShellName(catalog, null)).toBe("master");
	});

	it("カタログが空なら null を返す", () => {
		expect(resolveSelectedShellName([], null)).toBe(null);
	});
});

describe("resolveAvailableSurfaceIds", () => {
	it("定義があれば定義のキーをソートして返す", () => {
		const definitions: SurfaceDefinitionsByShell = new Map([
			[
				"master",
				new Map([
					[10, { id: 10, elements: [], collisions: [], animations: [] }],
					[0, { id: 0, elements: [], collisions: [], animations: [] }],
					[5, { id: 5, elements: [], collisions: [], animations: [] }],
				]),
			],
		]);
		expect(resolveAvailableSurfaceIds("master", [], definitions)).toEqual([0, 5, 10]);
	});

	it("定義がなければカタログアセットの ID を返す", () => {
		const catalog: ShellSurfaceCatalog[] = [
			{
				shellName: "master",
				assets: [
					{ id: 3, path: "surface0003.png" },
					{ id: 1, path: "surface0001.png" },
				],
			},
		];
		expect(resolveAvailableSurfaceIds("master", catalog, new Map())).toEqual([1, 3]);
	});

	it("シェルが見つからなければ空配列を返す", () => {
		expect(resolveAvailableSurfaceIds("unknown", [], new Map())).toEqual([]);
	});
});

describe("resolveRequestedSurfaceId", () => {
	it("descript プロパティからデフォルトサーフェスを取得する", () => {
		const result = resolveRequestedSurfaceId(0, [0, 5, 10], {
			"sakura.seriko.defaultsurface": "5",
		});
		expect(result).toBe(5);
	});

	it("scope 0 のフォールバックは 0", () => {
		const result = resolveRequestedSurfaceId(0, [0, 5], {});
		expect(result).toBe(0);
	});

	it("scope 1 のフォールバックは 10", () => {
		const result = resolveRequestedSurfaceId(1, [5, 10, 15], {});
		expect(result).toBe(10);
	});

	it("フォールバックが利用不可なら最初の ID を返す", () => {
		const result = resolveRequestedSurfaceId(1, [5, 15], {});
		expect(result).toBe(5);
	});

	it("空配列なら null を返す", () => {
		const result = resolveRequestedSurfaceId(0, [], {});
		expect(result).toBe(null);
	});
});

describe("toDefaultSurfaceKey", () => {
	it("scope 0 は sakura.seriko.defaultsurface を返す", () => {
		expect(toDefaultSurfaceKey(0)).toBe("sakura.seriko.defaultsurface");
	});

	it("scope 1 は kero.seriko.defaultsurface を返す", () => {
		expect(toDefaultSurfaceKey(1)).toBe("kero.seriko.defaultsurface");
	});

	it("scope 2 以上は char{n}.seriko.defaultsurface を返す", () => {
		expect(toDefaultSurfaceKey(2)).toBe("char2.seriko.defaultsurface");
	});
});

describe("parseSurfaceId", () => {
	it("整数文字列をパースする", () => {
		expect(parseSurfaceId("42")).toBe(42);
	});

	it("前後の空白をトリムする", () => {
		expect(parseSurfaceId("  10  ")).toBe(10);
	});

	it("undefined は null を返す", () => {
		expect(parseSurfaceId(undefined)).toBe(null);
	});

	it("非整数文字列は null を返す", () => {
		expect(parseSurfaceId("abc")).toBe(null);
	});

	it("小数は null を返す", () => {
		expect(parseSurfaceId("1.5")).toBe(null);
	});
});

describe("mergeDescriptProperties", () => {
	it("shell プロパティが ghost プロパティを上書きする", () => {
		const result = mergeDescriptProperties({ key: "ghost" }, { key: "shell" });
		expect(result).toEqual({ key: "shell" });
	});

	it("両方のキーがマージされる", () => {
		const result = mergeDescriptProperties({ a: "1" }, { b: "2" });
		expect(result).toEqual({ a: "1", b: "2" });
	});
});

describe("isEquivalentVisualModel", () => {
	const baseModel: SurfaceVisualModel = {
		surfaceId: 0,
		fileName: "surface0000.png",
		mode: "direct",
		width: 100,
		height: 200,
		layers: [{ path: "a.png", alphaMaskPath: null, x: 0, y: 0, width: 100, height: 200 }],
	};

	it("同一参照は true を返す", () => {
		expect(isEquivalentVisualModel(baseModel, baseModel)).toBe(true);
	});

	it("null 同士は true を返す", () => {
		expect(isEquivalentVisualModel(null, null)).toBe(true);
	});

	it("片方が null なら false を返す", () => {
		expect(isEquivalentVisualModel(baseModel, null)).toBe(false);
		expect(isEquivalentVisualModel(null, baseModel)).toBe(false);
	});

	it("同じ内容の別オブジェクトは true を返す", () => {
		const clone = {
			...baseModel,
			layers: [...baseModel.layers.map((l) => ({ ...l }))],
		};
		expect(isEquivalentVisualModel(baseModel, clone)).toBe(true);
	});

	it("レイヤーの path が異なれば false を返す", () => {
		const different = {
			...baseModel,
			layers: [{ ...baseModel.layers[0], path: "b.png" }],
		};
		expect(isEquivalentVisualModel(baseModel, different)).toBe(false);
	});

	it("レイヤー数が異なれば false を返す", () => {
		const different = { ...baseModel, layers: [] };
		expect(isEquivalentVisualModel(baseModel, different)).toBe(false);
	});
});
