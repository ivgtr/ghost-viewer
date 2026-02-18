import type {
	BaseNode,
	BlockStatement,
	FunctionDef,
	Identifier,
	Parameter,
	Program,
	StringLiteral,
	TypeAnnotation,
	VariableDecl,
} from "@/lib/parsers/core/ast";
import { traverse, traverseAll } from "@/lib/parsers/core/visitor";
import type { Visitor } from "@/lib/parsers/core/visitor";
import { describe, expect, it } from "vitest";

function createIdentifier(name: string): Identifier {
	return { type: "Identifier", name };
}

function createStringLiteral(value: string): StringLiteral {
	return { type: "StringLiteral", value };
}

function createBlockStatement(body: BaseNode[] = []): BlockStatement {
	return { type: "BlockStatement", body };
}

function createFunctionDef(name: string, body: BlockStatement): FunctionDef {
	return {
		type: "FunctionDef",
		name: createIdentifier(name),
		params: [],
		body,
	};
}

function createVariableDecl(name: string, init?: StringLiteral): VariableDecl {
	return {
		type: "VariableDecl",
		name: createIdentifier(name),
		init,
	};
}

function createProgram(body: BaseNode[]): Program {
	return { type: "Program", body };
}

describe("traverse", () => {
	describe("basic traversal", () => {
		it("should visit Identifier node", () => {
			const node = createIdentifier("foo");
			const visited: string[] = [];

			traverse(node, {
				visitIdentifier(n) {
					visited.push(n.name);
				},
			});

			expect(visited).toEqual(["foo"]);
		});

		it("should visit StringLiteral node", () => {
			const node = createStringLiteral("hello");
			const visited: string[] = [];

			traverse(node, {
				visitStringLiteral(n) {
					visited.push(n.value);
				},
			});

			expect(visited).toEqual(["hello"]);
		});

		it("should visit BlockStatement and its children", () => {
			const block = createBlockStatement([createIdentifier("a"), createIdentifier("b")]);
			const visited: string[] = [];

			traverse(block, {
				visitIdentifier(n) {
					visited.push(n.name);
				},
			});

			expect(visited).toEqual(["a", "b"]);
		});
	});

	describe("nested traversal", () => {
		it("should traverse Program with FunctionDef", () => {
			const program = createProgram([
				createFunctionDef("main", createBlockStatement()),
				createFunctionDef("helper", createBlockStatement()),
			]);
			const visited: string[] = [];

			traverse(program, {
				visitFunctionDef(n) {
					visited.push(n.name.name);
				},
			});

			expect(visited).toEqual(["main", "helper"]);
		});

		it("should traverse FunctionDef with body", () => {
			const func = createFunctionDef("test", createBlockStatement([createStringLiteral("hello")]));
			const visited: string[] = [];

			traverse(func, {
				visitStringLiteral(n) {
					visited.push(n.value);
				},
			});

			expect(visited).toEqual(["hello"]);
		});

		it("should traverse VariableDecl with init", () => {
			const decl = createVariableDecl("x", createStringLiteral("value"));
			const visited: string[] = [];

			traverse(decl, {
				visitIdentifier(n) {
					visited.push(`id:${n.name}`);
				},
				visitStringLiteral(n) {
					visited.push(`str:${n.value}`);
				},
			});

			expect(visited).toEqual(["id:x", "str:value"]);
		});
	});

	describe("enter/exit hooks", () => {
		it("should call enter before visit and exit after", () => {
			const node = createIdentifier("foo");
			const order: string[] = [];

			traverse(node, {
				enter(n) {
					order.push(`enter:${n.type}`);
				},
				visitIdentifier(n) {
					order.push(`visit:${n.name}`);
				},
				exit(n) {
					order.push(`exit:${n.type}`);
				},
			});

			expect(order).toEqual(["enter:Identifier", "visit:foo", "exit:Identifier"]);
		});

		it("should call enter/exit for nested nodes", () => {
			const block = createBlockStatement([createIdentifier("a")]);
			const order: string[] = [];

			traverse(block, {
				enter(n) {
					order.push(`enter:${n.type}`);
				},
				exit(n) {
					order.push(`exit:${n.type}`);
				},
			});

			expect(order).toEqual([
				"enter:BlockStatement",
				"enter:Identifier",
				"exit:Identifier",
				"exit:BlockStatement",
			]);
		});
	});

	describe("Parameter and TypeAnnotation", () => {
		it("should traverse Parameter with typeAnnotation", () => {
			const param: Parameter = {
				type: "Parameter",
				name: createIdentifier("x"),
				typeAnnotation: { type: "TypeAnnotation", name: "int" },
			};
			const visited: string[] = [];

			traverse(param, {
				visitIdentifier(n) {
					visited.push(`id:${n.name}`);
				},
				visitTypeAnnotation(n) {
					visited.push(`type:${n.name}`);
				},
			});

			expect(visited).toEqual(["id:x", "type:int"]);
		});

		it("should traverse TypeAnnotation with params", () => {
			const annotation: TypeAnnotation = {
				type: "TypeAnnotation",
				name: "array",
				params: [
					{ type: "TypeAnnotation", name: "int" },
					{ type: "TypeAnnotation", name: "string" },
				],
			};
			const visited: string[] = [];

			traverse(annotation, {
				visitTypeAnnotation(n) {
					visited.push(n.name);
				},
			});

			expect(visited).toEqual(["array", "int", "string"]);
		});
	});
});

describe("traverseAll", () => {
	it("should traverse all nodes in array", () => {
		const nodes = [createIdentifier("a"), createIdentifier("b"), createIdentifier("c")];
		const visited: string[] = [];

		traverseAll(nodes, {
			visitIdentifier(n) {
				visited.push(n.name);
			},
		});

		expect(visited).toEqual(["a", "b", "c"]);
	});
});
