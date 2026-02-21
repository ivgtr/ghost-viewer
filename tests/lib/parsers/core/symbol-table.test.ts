import { SymbolTable, resetScopeIdCounter } from "@/lib/parsers/core/symbol-table";
import type { SymbolInfo } from "@/lib/parsers/core/symbol-table";
import { beforeEach, describe, expect, it } from "vitest";

describe("SymbolTable", () => {
	let table: SymbolTable;

	beforeEach(() => {
		resetScopeIdCounter();
		table = new SymbolTable();
	});

	describe("global scope", () => {
		it("should start with global scope", () => {
			expect(table.current.type).toBe("global");
			expect(table.global.type).toBe("global");
			expect(table.current).toBe(table.global);
		});

		it("should declare and resolve symbol in global scope", () => {
			const sym: SymbolInfo = {
				name: "foo",
				kind: "function",
				scope: table.current,
				refLocs: [],
			};
			table.declare(sym);

			const resolved = table.resolve("foo");
			expect(resolved).toBe(sym);
		});

		it("should return null for undefined symbol", () => {
			expect(table.resolve("undefined")).toBeNull();
		});
	});

	describe("scope nesting", () => {
		it("should enter and exit scopes", () => {
			const global = table.current;
			const func = table.enterScope("function");

			expect(table.current).toBe(func);
			expect(func.parent).toBe(global);
			expect(func.type).toBe("function");

			const exited = table.exitScope();
			expect(exited).toBe(func);
			expect(table.current).toBe(global);
		});

		it("should return null when exiting global scope", () => {
			expect(table.exitScope()).toBeNull();
			expect(table.current.type).toBe("global");
		});

		it("should nest multiple scopes", () => {
			const func = table.enterScope("function");
			const block = table.enterScope("block");

			expect(table.current).toBe(block);
			expect(block.parent).toBe(func);
			expect(func.parent).toBe(table.global);

			table.exitScope();
			expect(table.current).toBe(func);

			table.exitScope();
			expect(table.current).toBe(table.global);
		});
	});

	describe("symbol resolution", () => {
		it("should resolve symbol from parent scope", () => {
			const globalSym: SymbolInfo = {
				name: "x",
				kind: "variable",
				scope: table.global,
				refLocs: [],
			};
			table.declare(globalSym);

			table.enterScope("function");
			const resolved = table.resolve("x");
			expect(resolved).toBe(globalSym);
		});

		it("should shadow symbol in nested scope", () => {
			const globalSym: SymbolInfo = {
				name: "x",
				kind: "variable",
				scope: table.global,
				refLocs: [],
			};
			table.declare(globalSym);

			const func = table.enterScope("function");
			const localSym: SymbolInfo = {
				name: "x",
				kind: "variable",
				scope: func,
				refLocs: [],
			};
			table.declare(localSym);

			expect(table.resolve("x")).toBe(localSym);
			table.exitScope();
			expect(table.resolve("x")).toBe(globalSym);
		});

		it("should resolveLocal only in current scope", () => {
			const globalSym: SymbolInfo = {
				name: "x",
				kind: "variable",
				scope: table.global,
				refLocs: [],
			};
			table.declare(globalSym);

			table.enterScope("function");
			expect(table.resolveLocal("x")).toBeNull();
			expect(table.resolve("x")).toBe(globalSym);
		});
	});

	describe("addReference", () => {
		it("should add reference location to symbol", () => {
			const sym: SymbolInfo = {
				name: "foo",
				kind: "function",
				scope: table.current,
				refLocs: [],
			};
			table.declare(sym);

			const loc = { start: { line: 1, column: 0 }, end: { line: 1, column: 3 } };
			table.addReference(sym, loc);

			expect(sym.refLocs).toHaveLength(1);
			expect(sym.refLocs[0]).toBe(loc);
		});
	});

	describe("scope children", () => {
		it("should track children scopes", () => {
			const func = table.enterScope("function");
			expect(table.global.children).toContain(func);

			const block = table.enterScope("block");
			expect(func.children).toContain(block);
		});
	});
});
