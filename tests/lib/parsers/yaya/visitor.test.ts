import type { FunctionDecl, StringLiteral, Visitor } from "@/lib/parsers/yaya";
import { parse } from "@/lib/parsers/yaya/parser";
import { traverse, traverseAll } from "@/lib/parsers/yaya/visitor";
import { describe, expect, it } from "vitest";

describe("YAYA Visitor", () => {
	describe("traverse", () => {
		it("Program ノードを走査する", () => {
			const ast = parse('OnBoot { "hello" }');
			let visited = false;
			const visitor: Visitor = {
				visitProgram: () => {
					visited = true;
				},
			};
			traverse(ast, visitor);
			expect(visited).toBe(true);
		});

		it("FunctionDecl ノードを走査する", () => {
			const ast = parse('OnBoot { "hello" }');
			const visited: string[] = [];
			const visitor: Visitor = {
				visitFunctionDecl: (node) => {
					visited.push(node.name.name);
				},
			};
			traverse(ast, visitor);
			expect(visited).toEqual(["OnBoot"]);
		});

		it("StringLiteral ノードを走査する", () => {
			const ast = parse('OnBoot { "hello" }');
			const visited: string[] = [];
			const visitor: Visitor = {
				visitStringLiteral: (node) => {
					visited.push(node.value);
				},
			};
			traverse(ast, visitor);
			expect(visited).toEqual(["hello"]);
		});

		it("enter/exit フックが呼ばれる", () => {
			const ast = parse('OnBoot { "hello" }');
			const entered: string[] = [];
			const exited: string[] = [];
			const visitor: Visitor = {
				enter: (node) => entered.push(node.type),
				exit: (node) => exited.push(node.type),
			};
			traverse(ast, visitor);
			expect(entered.length).toBeGreaterThan(0);
			expect(exited.length).toBeGreaterThan(0);
			expect(entered.length).toBe(exited.length);
		});

		it("if 文の条件式を走査する", () => {
			const ast = parse('OnBoot { if (x == 1) { "hello" } }');
			const visited: string[] = [];
			const visitor: Visitor = {
				visitIdentifier: (node) => {
					visited.push(node.name);
				},
			};
			traverse(ast, visitor);
			expect(visited).toContain("x");
		});

		it("関数呼び出しの引数を走査する", () => {
			const ast = parse('OnBoot { SomeFunc("arg") }');
			const visited: string[] = [];
			const visitor: Visitor = {
				visitStringLiteral: (node) => {
					visited.push(node.value);
				},
			};
			traverse(ast, visitor);
			expect(visited).toEqual(["arg"]);
		});

		it("代入式の右辺を走査する", () => {
			const ast = parse('OnBoot { x = "value" }');
			const visited: string[] = [];
			const visitor: Visitor = {
				visitStringLiteral: (node) => {
					visited.push(node.value);
				},
			};
			traverse(ast, visitor);
			expect(visited).toEqual(["value"]);
		});

		it("return 文の値を走査する", () => {
			const ast = parse('OnBoot { return "hello" }');
			const visited: string[] = [];
			const visitor: Visitor = {
				visitStringLiteral: (node) => {
					visited.push(node.value);
				},
			};
			traverse(ast, visitor);
			expect(visited).toEqual(["hello"]);
		});

		it("switch 文を走査する", () => {
			const ast = parse('OnBoot { switch (x) { case 1 { "a" } } }');
			let switchVisited = false;
			let caseVisited = false;
			const visitor: Visitor = {
				visitSwitchStatement: () => {
					switchVisited = true;
				},
				visitCaseClause: () => {
					caseVisited = true;
				},
			};
			traverse(ast, visitor);
			expect(switchVisited).toBe(true);
			expect(caseVisited).toBe(true);
		});

		it("for 文の init/test/update を走査する", () => {
			const ast = parse('OnBoot { for (i = 0; i < 10; i++) { "hello" } }');
			const visited: string[] = [];
			const visitor: Visitor = {
				visitIdentifier: (node) => {
					visited.push(node.name);
				},
			};
			traverse(ast, visitor);
			expect(visited).toContain("i");
		});

		it("foreach 文を走査する", () => {
			const ast = parse('OnBoot { foreach item in items { "hello" } }');
			const visited: string[] = [];
			const visitor: Visitor = {
				visitIdentifier: (node) => {
					visited.push(node.name);
				},
			};
			traverse(ast, visitor);
			expect(visited).toContain("item");
			expect(visited).toContain("items");
		});

		it("while 文を走査する", () => {
			const ast = parse('OnBoot { while (x > 0) { "hello" } }');
			let whileVisited = false;
			const visitor: Visitor = {
				visitWhileStatement: () => {
					whileVisited = true;
				},
			};
			traverse(ast, visitor);
			expect(whileVisited).toBe(true);
		});

		it("BinaryExpression を走査する", () => {
			const ast = parse('OnBoot { if (a + b > 0) { "x" } }');
			const visited: string[] = [];
			const visitor: Visitor = {
				visitIdentifier: (node) => {
					visited.push(node.name);
				},
			};
			traverse(ast, visitor);
			expect(visited).toContain("a");
			expect(visited).toContain("b");
		});

		it("MemberExpression を走査する", () => {
			const ast = parse("OnBoot { x::property }");
			const visited: string[] = [];
			const visitor: Visitor = {
				visitIdentifier: (node) => {
					visited.push(node.name);
				},
			};
			traverse(ast, visitor);
			expect(visited).toContain("x");
			expect(visited).toContain("property");
		});

		it("IndexExpression を走査する", () => {
			const ast = parse("OnBoot { arr[0] }");
			let indexVisited = false;
			const visitor: Visitor = {
				visitIndexExpression: () => {
					indexVisited = true;
				},
			};
			traverse(ast, visitor);
			expect(indexVisited).toBe(true);
		});

		it("ArrayLiteral を走査する", () => {
			const ast = parse("OnBoot { [1, 2, 3] }");
			let arrayVisited = false;
			const visitor: Visitor = {
				visitArrayLiteral: () => {
					arrayVisited = true;
				},
			};
			traverse(ast, visitor);
			expect(arrayVisited).toBe(true);
		});

		it("UnaryExpression を走査する", () => {
			const ast = parse("OnBoot { !x }");
			let unaryVisited = false;
			const visitor: Visitor = {
				visitUnaryExpression: () => {
					unaryVisited = true;
				},
			};
			traverse(ast, visitor);
			expect(unaryVisited).toBe(true);
		});

		it("ConditionalExpression を走査する", () => {
			const ast = parse('OnBoot { x ? "a" : "b" }');
			const visited: string[] = [];
			const visitor: Visitor = {
				visitStringLiteral: (node) => {
					visited.push(node.value);
				},
			};
			traverse(ast, visitor);
			expect(visited).toEqual(["a", "b"]);
		});

		it("ParenthesizedExpression を走査する", () => {
			const ast = parse("OnBoot { (x) }");
			let parenVisited = false;
			const visitor: Visitor = {
				visitParenthesizedExpression: () => {
					parenVisited = true;
				},
			};
			traverse(ast, visitor);
			expect(parenVisited).toBe(true);
		});

		it("VariableDecl を走査する", () => {
			const ast = parse("OnBoot { var x = 1 }");
			let varVisited = false;
			const visitor: Visitor = {
				visitVariableDecl: () => {
					varVisited = true;
				},
			};
			traverse(ast, visitor);
			expect(varVisited).toBe(true);
		});
	});

	describe("traverseAll", () => {
		it("複数ノードを走査する", () => {
			const ast = parse('OnBoot { "a" }\nOnClose { "b" }');
			const visited: string[] = [];
			const visitor: Visitor = {
				visitFunctionDecl: (node) => {
					visited.push(node.name.name);
				},
			};
			traverseAll(ast.body, visitor);
			expect(visited).toEqual(["OnBoot", "OnClose"]);
		});
	});
});
