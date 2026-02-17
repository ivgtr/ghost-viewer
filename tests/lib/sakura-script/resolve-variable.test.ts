import { resolveVariable } from "@/lib/sakura-script/resolve-variable";
import { describe, expect, it } from "vitest";

describe("resolveVariable", () => {
	it("charname(N) → characterNames[N] を返す", () => {
		const ctx = { characterNames: { 0: "さくら", 1: "うにゅう" }, properties: {} };
		expect(resolveVariable("charname(0)", ctx)).toBe("さくら");
		expect(resolveVariable("charname(1)", ctx)).toBe("うにゅう");
	});

	it("charname(N) が存在しない場合 null を返す", () => {
		const ctx = { characterNames: { 0: "さくら" }, properties: {} };
		expect(resolveVariable("charname(99)", ctx)).toBeNull();
	});

	it("custom 変数を優先して返す", () => {
		const ctx = {
			characterNames: {},
			properties: { username: "デフォルト" },
			custom: { username: "カスタム" },
		};
		expect(resolveVariable("username", ctx)).toBe("カスタム");
	});

	it("properties から値を返す", () => {
		const ctx = { characterNames: {}, properties: { "sakura.name": "さくら" } };
		expect(resolveVariable("sakura.name", ctx)).toBe("さくら");
	});

	it("いずれにも存在しない場合 null を返す", () => {
		const ctx = { characterNames: {}, properties: {} };
		expect(resolveVariable("unknown", ctx)).toBeNull();
	});

	it("custom が未定義の場合 properties から返す", () => {
		const ctx = { characterNames: {}, properties: { name: "ゴースト名" } };
		expect(resolveVariable("name", ctx)).toBe("ゴースト名");
	});
});
