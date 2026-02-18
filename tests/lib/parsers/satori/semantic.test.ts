import { parseSatori } from "@/lib/parsers/satori/parser";
import { analyze } from "@/lib/parsers/satori/semantic";
import { describe, expect, it } from "vitest";

describe("satori/semantic", () => {
	it("空 Program を解析できる", () => {
		const program = parseSatori("");
		const result = analyze(program);
		expect(result.errors).toEqual([]);
		expect(result.symbolTable.global.symbols.size).toBe(0);
	});

	it("イベント名を global scope に登録する", () => {
		const program = parseSatori("＊OnBoot\n：hello");
		const result = analyze(program);
		const event = result.symbolTable.global.symbols.get("OnBoot");

		expect(result.errors).toEqual([]);
		expect(event).not.toBeUndefined();
		expect(event?.kind).toBe("event");
	});

	it("重複イベント名をエラー化する", () => {
		const program = parseSatori("＊OnBoot\n：a\n＊OnBoot\n：b");
		const result = analyze(program);

		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]?.message).toContain("Duplicate event declaration");
	});

	it("$(var) 参照を解決して refLocs を記録する", () => {
		const source = "＄変数\nname=ghost\n＊OnBoot\n：hello $(name)";
		const program = parseSatori(source);
		const result = analyze(program);
		const variable = result.symbolTable.resolve("name");

		expect(result.errors).toEqual([]);
		expect(variable).not.toBeNull();
		expect(variable?.kind).toBe("variable");
		expect(variable?.refLocs).toHaveLength(1);
		expect(variable?.refLocs[0]?.start.line).toBe(3);
	});

	it("未定義 $(var) をエラー化する", () => {
		const program = parseSatori("＊OnBoot\n：$(unknown)");
		const result = analyze(program);

		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]?.message).toContain("Undefined variable: unknown");
		expect(result.errors[0]?.loc?.start.line).toBe(1);
	});

	it("複数イベント/複数参照の refLocs を記録する", () => {
		const source = [
			"＄変数",
			"name=ghost",
			"count=1",
			"＊OnBoot",
			"：$(name)",
			"text $(count)",
			"＊OnClose",
			"：$(name)",
		].join("\n");
		const result = analyze(parseSatori(source));
		const nameSymbol = result.symbolTable.resolve("name");
		const countSymbol = result.symbolTable.resolve("count");

		expect(result.errors).toEqual([]);
		expect(nameSymbol?.refLocs).toHaveLength(2);
		expect(countSymbol?.refLocs).toHaveLength(1);
	});

	it("＄同名変数は後勝ちで上書きする", () => {
		const source = ["＄変数", "name=first", "name=second", "＊OnBoot", "：$(name)"].join("\n");
		const result = analyze(parseSatori(source));
		const variable = result.symbolTable.resolve("name");

		expect(result.errors).toEqual([]);
		expect(variable).not.toBeNull();
		expect(variable?.kind).toBe("variable");
		expect(variable?.defLoc?.start.line).toBe(2);
		expect(variable?.refLocs).toHaveLength(1);
	});
});
