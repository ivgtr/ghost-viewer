import type {
	BinaryExpression,
	BlockStatement,
	CallExpression,
	ForStatement,
	ForeachStatement,
	FunctionDecl,
	IfStatement,
	ParallelStatement,
	ReturnStatement,
	VariableDecl,
	VoidStatement,
	WhileStatement,
} from "@/lib/parsers/yaya/ast";
import { parse } from "@/lib/parsers/yaya/parser";
import { describe, expect, it } from "vitest";

describe("YAYA Parser", () => {
	describe("function definitions", () => {
		it("should parse simple function definition", () => {
			const ast = parse("foo { }");
			expect(ast.body).toHaveLength(1);
			const func = ast.body[0] as FunctionDecl;
			expect(func.type).toBe("FunctionDecl");
			expect(func.name.name).toBe("foo");
			expect(func.params).toHaveLength(0);
		});

		it("should parse function with return type", () => {
			const ast = parse("foo : int { }");
			const func = ast.body[0] as FunctionDecl;
			expect(func.returnType?.name).toBe("int");
		});

		it("should parse function with body", () => {
			const ast = parse('foo { "hello" }');
			const func = ast.body[0] as FunctionDecl;
			expect(func.body.body).toHaveLength(1);
		});

		it("should parse function definition on separate line", () => {
			const ast = parse("foo\n{ }");
			const func = ast.body[0] as FunctionDecl;
			expect(func.name.name).toBe("foo");
		});

		it("should not treat block-level identifier:identifier as function definition", () => {
			const ast = parse("foo { x : y }");
			const func = ast.body[0] as FunctionDecl;
			expect(func.type).toBe("FunctionDecl");
			expect(func.body.body).toHaveLength(1);
		});
	});

	describe("variable declarations", () => {
		it("should parse var declaration", () => {
			const ast = parse("var x");
			const decl = ast.body[0] as VariableDecl;
			expect(decl.type).toBe("VariableDecl");
			expect(decl.kind).toBe("var");
			expect(decl.name.name).toBe("x");
		});

		it("should parse const declaration with init", () => {
			const ast = parse('const x = "value"');
			const decl = ast.body[0] as VariableDecl;
			expect(decl.kind).toBe("const");
			expect(decl.init).toBeDefined();
		});

		it("should parse variable with type annotation", () => {
			const ast = parse("var x : int = 10");
			const decl = ast.body[0] as VariableDecl;
			expect(decl.typeAnnotation?.name).toBe("int");
		});
	});

	describe("control flow", () => {
		it("should parse if statement", () => {
			const ast = parse("if (true) { }");
			const stmt = ast.body[0] as IfStatement;
			expect(stmt.type).toBe("IfStatement");
			expect(stmt.consequent).toBeDefined();
		});

		it("should parse if-else statement", () => {
			const ast = parse("if (true) { } else { }");
			const stmt = ast.body[0] as IfStatement;
			expect(stmt.alternate).toBeDefined();
			expect((stmt.alternate as BlockStatement).type).toBe("BlockStatement");
		});

		it("should parse if-elseif-else chain", () => {
			const ast = parse("if (a) { } elseif (b) { } else { }");
			const stmt = ast.body[0] as IfStatement;
			expect(stmt.alternate?.type).toBe("IfStatement");
		});

		it("should parse if-elseif-others chain as else alias", () => {
			const ast = parse("if (a) { } elseif (b) { } others { }");
			const stmt = ast.body[0] as IfStatement;
			expect(stmt.alternate?.type).toBe("IfStatement");
			const elseIf = stmt.alternate as IfStatement;
			expect(elseIf.alternate?.type).toBe("BlockStatement");
		});

		it("should parse while statement", () => {
			const ast = parse("while (true) { }");
			const stmt = ast.body[0] as WhileStatement;
			expect(stmt.type).toBe("WhileStatement");
		});

		it("should parse for statement", () => {
			const ast = parse("for (var i = 0; i < 10; i++) { }");
			const stmt = ast.body[0] as ForStatement;
			expect(stmt.type).toBe("ForStatement");
			expect(stmt.init).toBeDefined();
			expect(stmt.test).toBeDefined();
			expect(stmt.update).toBeDefined();
		});

		it("should parse foreach statement", () => {
			const ast = parse("foreach item in items { }");
			const stmt = ast.body[0] as ForeachStatement;
			expect(stmt.type).toBe("ForeachStatement");
			expect(stmt.variable.name).toBe("item");
		});

		it("should parse for statement with separator body", () => {
			const ast = parse("for i = 0 ; i < 3 ; i++ --");
			const stmt = ast.body[0] as ForStatement;
			expect(stmt.type).toBe("ForStatement");
		});

		it("should parse parallel statement", () => {
			const ast = parse("parallel FuncCall()");
			const stmt = ast.body[0] as ParallelStatement;
			expect(stmt.type).toBe("ParallelStatement");
		});

		it("should parse void statement", () => {
			const ast = parse("void FuncCall()");
			const stmt = ast.body[0] as VoidStatement;
			expect(stmt.type).toBe("VoidStatement");
		});

		it("should keep function name compatibility for parallel", () => {
			const ast = parse("parallel { }");
			const func = ast.body[0] as FunctionDecl;
			expect(func.type).toBe("FunctionDecl");
			expect(func.name.name).toBe("parallel");
		});
	});

	describe("expressions", () => {
		it("should parse string literal", () => {
			const ast = parse('"hello"');
			expect(ast.body).toHaveLength(1);
		});

		it("should parse number literal", () => {
			const ast = parse("123");
			expect(ast.body).toHaveLength(1);
		});

		it("should parse boolean literals", () => {
			const ast = parse("true false");
			expect(ast.body).toHaveLength(2);
		});

		it("should parse function call", () => {
			const ast = parse("foo()");
			const expr = ast.body[0];
			expect(expr.type).toBe("ExpressionStatement");
		});

		it("should parse function call with arguments", () => {
			const ast = parse('foo("arg", 123)');
			expect(ast.body).toHaveLength(1);
		});

		it("should parse binary expression", () => {
			const ast = parse("1 + 2");
			expect(ast.body).toHaveLength(1);
		});

		it("should parse operator precedence", () => {
			const ast = parse("1 + 2 * 3");
			expect(ast.body).toHaveLength(1);
		});

		it("should parse comma operator with lowest precedence", () => {
			const ast = parse("1 + 2, 3 * 4");
			const stmt = ast.body[0] as import("@/lib/parsers/yaya/ast").ExpressionStatement;
			const root = stmt.expression as BinaryExpression;
			expect(root.operator).toBe(",");
			expect((root.left as BinaryExpression).operator).toBe("+");
			expect((root.right as BinaryExpression).operator).toBe("*");
		});

		it("should parse member expression", () => {
			const ast = parse("foo::bar");
			expect(ast.body).toHaveLength(1);
		});

		it("should parse index expression", () => {
			const ast = parse("arr[0]");
			expect(ast.body).toHaveLength(1);
		});

		it("should parse index expression with tuple index", () => {
			const ast = parse("arr[0,1]");
			expect(ast.body).toHaveLength(1);
		});

		it("should parse assignment", () => {
			const ast = parse("x = 10");
			expect(ast.body).toHaveLength(1);
		});

		it("should parse := assignment", () => {
			const ast = parse("x := 10");
			expect(ast.body).toHaveLength(1);
		});

		it("should parse semicolon separated expressions", () => {
			const ast = parse("x = 1; y = 2;");
			expect(ast.body).toHaveLength(2);
		});

		it("should parse function calls with implicit argument separators", () => {
			const ast = parse('foo("a" "b")');
			expect(ast.body).toHaveLength(1);
		});

		it("should keep comma as argument delimiter in calls", () => {
			const ast = parse('foo("a", "b")');
			const stmt = ast.body[0] as import("@/lib/parsers/yaya/ast").ExpressionStatement;
			const call = stmt.expression as CallExpression;
			expect(call.arguments).toHaveLength(2);
		});
	});

	describe("return statement", () => {
		it("should parse return without value", () => {
			const ast = parse("return");
			const stmt = ast.body[0] as ReturnStatement;
			expect(stmt.type).toBe("ReturnStatement");
			expect(stmt.value).toBeNull();
		});

		it("should parse return with value", () => {
			const ast = parse('return "hello"');
			const stmt = ast.body[0] as ReturnStatement;
			expect(stmt.value).toBeDefined();
		});
	});

	describe("separator", () => {
		it("should parse separator", () => {
			const ast = parse("--");
			expect(ast.body[0].type).toBe("Separator");
		});
	});

	describe("complex examples", () => {
		it("should parse multiple functions", () => {
			const code = `
foo { "hello" }
--
bar { "world" }
`;
			const ast = parse(code);
			expect(ast.body).toHaveLength(3);
			expect(ast.body[0].type).toBe("FunctionDecl");
			expect(ast.body[1].type).toBe("Separator");
			expect(ast.body[2].type).toBe("FunctionDecl");
		});

		it("should parse nested blocks", () => {
			const code = `
foo {
  if (true) {
    "nested"
  }
}
`;
			const ast = parse(code);
			expect(ast.body).toHaveLength(1);
			const func = ast.body[0] as FunctionDecl;
			expect(func.body.body).toHaveLength(1);
		});
	});
});
