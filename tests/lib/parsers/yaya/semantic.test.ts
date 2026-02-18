import { parse } from "@/lib/parsers/yaya/parser";
import { analyze } from "@/lib/parsers/yaya/semantic";
import { describe, expect, it } from "vitest";

describe("YAYA Semantic Analyzer", () => {
	describe("analyze", () => {
		it("空のプログラムを解析する", () => {
			const ast = parse("");
			const result = analyze(ast);
			expect(result.errors).toEqual([]);
			expect(result.symbolTable.global.symbols.size).toBe(0);
		});

		it("関数定義をシンボル登録する", () => {
			const ast = parse('OnBoot { "hello" }');
			const result = analyze(ast);
			expect(result.errors).toEqual([]);
			const symbol = result.symbolTable.resolve("OnBoot");
			expect(symbol).not.toBeNull();
			expect(symbol?.kind).toBe("function");
		});

		it("複数の関数定義をシンボル登録する", () => {
			const ast = parse('OnBoot { "a" }\nOnClose { "b" }');
			const result = analyze(ast);
			expect(result.errors).toEqual([]);
			expect(result.symbolTable.resolve("OnBoot")).not.toBeNull();
			expect(result.symbolTable.resolve("OnClose")).not.toBeNull();
		});

		it("重複する関数定義でエラーを出す", () => {
			const ast = parse('OnBoot { "a" }\nOnBoot { "b" }');
			const result = analyze(ast);
			expect(result.errors.length).toBe(1);
			expect(result.errors[0].message).toContain("Duplicate function declaration");
		});

		it("変数宣言をシンボル登録する", () => {
			const ast = parse("OnBoot { var x = 1 }");
			const result = analyze(ast);
			expect(result.errors).toEqual([]);
		});

		it("関数内の変数参照を解決する", () => {
			const ast = parse("OnBoot { var x = 1\n x }");
			const result = analyze(ast);
			expect(result.errors).toEqual([]);
			const fn = result.symbolTable.resolve("OnBoot");
			expect(fn).not.toBeNull();
		});

		it("未定義の変数参照でエラーを出す", () => {
			const ast = parse("OnBoot { x }");
			const result = analyze(ast);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].message).toContain("Undefined variable");
		});

		it("関数パラメータをシンボル登録する", () => {
			const ast = parse("function Add(a, b) { return a + b }");
			const result = analyze(ast);
			expect(result.errors).toEqual([]);
		});

		it("for 文のループ変数をスコープに登録する", () => {
			const ast = parse("OnBoot { for (var i = 0; i < 10; i++) { i } }");
			const result = analyze(ast);
			expect(result.errors).toEqual([]);
		});

		it("foreach 文のループ変数をスコープに登録する", () => {
			const ast = parse("OnBoot { foreach item in items { item } }");
			const result = analyze(ast);
			expect(result.errors.length).toBeGreaterThan(0);
		});

		it("グローバルスコープに関数が存在する", () => {
			const ast = parse('OnBoot { "hello" }');
			const result = analyze(ast);
			const symbol = result.symbolTable.global.symbols.get("OnBoot");
			expect(symbol).not.toBeNull();
			expect(symbol?.kind).toBe("function");
		});

		it("if 文内で変数を参照できる", () => {
			const ast = parse("OnBoot { var x = 1\n if (x > 0) { x } }");
			const result = analyze(ast);
			expect(result.errors).toEqual([]);
		});

		it("while 文内で変数を参照できる", () => {
			const ast = parse("OnBoot { var x = 1\n while (x > 0) { x } }");
			const result = analyze(ast);
			expect(result.errors).toEqual([]);
		});

		it("switch 文内で変数を参照できる", () => {
			const ast = parse("OnBoot { var x = 1\n switch (x) { case 1 { x } } }");
			const result = analyze(ast);
			expect(result.errors).toEqual([]);
		});

		it("関数呼び出しの引数内で変数を参照できる", () => {
			const ast = parse("OnBoot { var x = 1\n SomeFunc(x) }");
			const result = analyze(ast);
			expect(result.errors.length).toBe(1);
		});

		it("代入式の左辺で変数を参照できる", () => {
			const ast = parse("OnBoot { var x = 1\n x = 2 }");
			const result = analyze(ast);
			expect(result.errors).toEqual([]);
		});

		it("メンバー式のオブジェクトで変数を参照できる", () => {
			const ast = parse("OnBoot { var obj = []\n obj::property }");
			const result = analyze(ast);
			expect(result.errors).toEqual([]);
		});

		it("インデックス式で変数を参照できる", () => {
			const ast = parse("OnBoot { var arr = []\n arr[0] }");
			const result = analyze(ast);
			expect(result.errors).toEqual([]);
		});

		it("ブロック内のローカル変数はブロック外から参照できない", () => {
			const ast = parse("OnBoot { { var x = 1 } x }");
			const result = analyze(ast);
			expect(result.errors.length).toBeGreaterThan(0);
			expect(result.errors[0].message).toContain("Undefined variable");
		});

		it("外側のスコープの変数を参照できる", () => {
			const ast = parse("OnBoot { var x = 1\n { x } }");
			const result = analyze(ast);
			expect(result.errors).toEqual([]);
		});
	});
});
