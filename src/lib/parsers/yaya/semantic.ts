import type { SourceLocation } from "../core/ast";
import { SymbolTable, resetScopeIdCounter } from "../core/symbol-table";
import type {
	BlockStatement,
	Expression,
	FunctionDecl,
	Parameter,
	Statement,
	VariableDecl,
	YayaProgram,
} from "./ast";

interface SemanticAnalysisResult {
	symbolTable: SymbolTable;
	errors: SemanticError[];
}

interface SemanticError {
	message: string;
	loc?: SourceLocation;
}

class SemanticAnalyzer {
	private symbolTable: SymbolTable;
	private errors: SemanticError[];

	constructor() {
		resetScopeIdCounter();
		this.symbolTable = new SymbolTable();
		this.errors = [];
	}

	analyze(program: YayaProgram): SemanticAnalysisResult {
		this.declareFunctions(program);

		for (const node of program.body) {
			if (node.type === "FunctionDecl") {
				this.analyzeFunction(node);
			}
		}

		return {
			symbolTable: this.symbolTable,
			errors: this.errors,
		};
	}

	private declareFunctions(program: YayaProgram): void {
		for (const node of program.body) {
			if (node.type !== "FunctionDecl") {
				continue;
			}

			const existing = this.symbolTable.resolveLocal(node.name.name);
			if (existing) {
				this.errors.push({
					message: `Duplicate function declaration: ${node.name.name}`,
					loc: node.loc,
				});
				continue;
			}

			this.symbolTable.declare({
				name: node.name.name,
				kind: "function",
				scope: this.symbolTable.current,
				defLoc: node.loc,
				refLocs: [],
			});
		}
	}

	private analyzeFunction(fn: FunctionDecl): void {
		this.symbolTable.enterScope("function");

		for (const param of fn.params) {
			this.analyzeParameter(param);
		}

		this.analyzeBlock(fn.body);
		this.symbolTable.exitScope();
	}

	private analyzeParameter(param: Parameter): void {
		const existing = this.symbolTable.resolveLocal(param.name.name);
		if (existing) {
			this.errors.push({
				message: `Duplicate parameter name: ${param.name.name}`,
				loc: param.loc,
			});
		} else {
			this.symbolTable.declare({
				name: param.name.name,
				kind: "parameter",
				scope: this.symbolTable.current,
				defLoc: param.loc,
				refLocs: [],
			});
		}

		if (param.defaultValue) {
			this.analyzeExpression(param.defaultValue);
		}
	}

	private analyzeBlock(block: BlockStatement): void {
		for (const stmt of block.body) {
			this.analyzeStatement(stmt);
		}
	}

	private analyzeStatement(node: Statement): void {
		switch (node.type) {
			case "VariableDecl":
				this.analyzeVariableDecl(node);
				break;

			case "ExpressionStatement":
				this.analyzeExpression(node.expression);
				break;

			case "ReturnStatement":
				if (node.value) {
					this.analyzeExpression(node.value);
				}
				break;

			case "ParallelStatement":
				this.analyzeExpression(node.expression);
				break;

			case "VoidStatement":
				this.analyzeExpression(node.expression);
				break;

			case "IfStatement":
				this.analyzeExpression(node.test);
				this.analyzeBlock(node.consequent);
				if (node.alternate) {
					if (node.alternate.type === "BlockStatement") {
						this.analyzeBlock(node.alternate);
					} else {
						this.analyzeStatement(node.alternate);
					}
				}
				break;

			case "WhileStatement":
				this.analyzeExpression(node.test);
				this.analyzeBlock(node.body);
				break;

			case "ForStatement":
				this.analyzeForStatement(node);
				break;

			case "ForeachStatement":
				this.symbolTable.enterScope("block");
				this.symbolTable.declare({
					name: node.variable.name,
					kind: "variable",
					scope: this.symbolTable.current,
					defLoc: node.variable.loc,
					refLocs: [],
				});
				this.analyzeExpression(node.iterable);
				this.analyzeBlock(node.body);
				this.symbolTable.exitScope();
				break;

			case "SwitchStatement":
				this.analyzeExpression(node.discriminant);
				for (const caseClause of node.cases) {
					if (caseClause.test) {
						this.analyzeExpression(caseClause.test);
					}
					for (const caseStmt of caseClause.consequent) {
						this.analyzeStatement(caseStmt);
					}
				}
				break;

			case "BlockStatement":
				this.symbolTable.enterScope("block");
				this.analyzeBlock(node);
				this.symbolTable.exitScope();
				break;

			case "Separator":
			case "BreakStatement":
			case "ContinueStatement":
			case "DoStatement":
			case "FunctionDecl":
				break;
		}
	}

	private analyzeForStatement(node: Statement & { type: "ForStatement" }): void {
		this.symbolTable.enterScope("block");
		if (node.init) {
			if (node.init.type === "VariableDecl") {
				this.analyzeVariableDecl(node.init);
			} else {
				this.analyzeExpression(node.init);
			}
		}
		if (node.test) {
			this.analyzeExpression(node.test);
		}
		if (node.update) {
			this.analyzeExpression(node.update);
		}
		this.analyzeBlock(node.body);
		this.symbolTable.exitScope();
	}

	private analyzeVariableDecl(decl: VariableDecl): void {
		const existing = this.symbolTable.resolveLocal(decl.name.name);
		if (existing) {
			this.errors.push({
				message: `Duplicate variable declaration: ${decl.name.name}`,
				loc: decl.loc,
			});
		} else {
			this.symbolTable.declare({
				name: decl.name.name,
				kind: "variable",
				scope: this.symbolTable.current,
				defLoc: decl.loc,
				refLocs: [],
			});
		}

		if (decl.init) {
			this.analyzeExpression(decl.init);
		}
	}

	private analyzeExpression(expr: Expression): void {
		switch (expr.type) {
			case "Identifier": {
				const symbol = this.symbolTable.resolve(expr.name);
				if (symbol) {
					this.symbolTable.addReference(
						symbol,
						expr.loc ?? { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } },
					);
				} else {
					this.errors.push({
						message: `Undefined variable: ${expr.name}`,
						loc: expr.loc,
					});
				}
				break;
			}

			case "CallExpression":
				this.analyzeExpression(expr.callee);
				for (const arg of expr.arguments) {
					this.analyzeExpression(arg);
				}
				break;

			case "MemberExpression":
				this.analyzeExpression(expr.object);
				break;

			case "IndexExpression":
				this.analyzeExpression(expr.object);
				this.analyzeExpression(expr.index);
				break;

			case "BinaryExpression":
				this.analyzeExpression(expr.left);
				this.analyzeExpression(expr.right);
				break;

			case "UnaryExpression":
				this.analyzeExpression(expr.operand);
				break;

			case "ConditionalExpression":
				this.analyzeExpression(expr.test);
				this.analyzeExpression(expr.consequent);
				this.analyzeExpression(expr.alternate);
				break;

			case "AssignmentExpression":
				this.analyzeExpression(expr.left);
				this.analyzeExpression(expr.right);
				break;

			case "TupleExpression":
			case "ArrayLiteral":
				for (const elem of expr.elements) {
					this.analyzeExpression(elem);
				}
				break;

			case "StringLiteral":
			case "NumberLiteral":
			case "BooleanLiteral":
			case "NullLiteral":
				break;
		}
	}
}

function analyze(program: YayaProgram): SemanticAnalysisResult {
	const analyzer = new SemanticAnalyzer();
	return analyzer.analyze(program);
}

export type { SemanticAnalysisResult, SemanticError };
export { SemanticAnalyzer, analyze };
