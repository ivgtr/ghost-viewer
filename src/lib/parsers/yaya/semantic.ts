import type { BaseNode, SourceLocation } from "../core/ast";
import { SymbolTable, resetScopeIdCounter } from "../core/symbol-table";
import type {
	ArrayLiteral,
	AssignmentExpression,
	BlockStatement,
	CallExpression,
	ConditionalExpression,
	Expression,
	ForStatement,
	ForeachStatement,
	FunctionDecl,
	Identifier,
	IfStatement,
	IndexExpression,
	MemberExpression,
	ParallelStatement,
	Parameter,
	ReturnStatement,
	SwitchStatement,
	VariableDecl,
	VoidStatement,
	WhileStatement,
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
				this.analyzeFunction(node as FunctionDecl);
			}
		}

		return {
			symbolTable: this.symbolTable,
			errors: this.errors,
		};
	}

	private declareFunctions(program: YayaProgram): void {
		for (const node of program.body) {
			if (node.type === "FunctionDecl") {
				const fn = node as FunctionDecl;
				const existing = this.symbolTable.resolveLocal(fn.name.name);
				if (existing) {
					this.errors.push({
						message: `Duplicate function declaration: ${fn.name.name}`,
						loc: fn.loc,
					});
				} else {
					this.symbolTable.declare({
						name: fn.name.name,
						kind: "function",
						scope: this.symbolTable.current,
						defLoc: fn.loc,
						refLocs: [],
					});
				}
			}
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

	private analyzeStatement(node: BaseNode): void {
		switch (node.type) {
			case "VariableDecl":
				this.analyzeVariableDecl(node as VariableDecl);
				break;

			case "ExpressionStatement":
				this.analyzeExpression((node as import("./ast").ExpressionStatement).expression);
				break;

			case "ReturnStatement": {
				const ret = node as ReturnStatement;
				if (ret.value) {
					this.analyzeExpression(ret.value);
				}
				break;
			}

			case "ParallelStatement":
				this.analyzeExpression((node as ParallelStatement).expression);
				break;

			case "VoidStatement":
				this.analyzeExpression((node as VoidStatement).expression);
				break;

			case "IfStatement": {
				const ifStmt = node as IfStatement;
				this.analyzeExpression(ifStmt.test);
				this.analyzeBlock(ifStmt.consequent);
				if (ifStmt.alternate) {
					if (ifStmt.alternate.type === "BlockStatement") {
						this.analyzeBlock(ifStmt.alternate);
					} else {
						this.analyzeStatement(ifStmt.alternate);
					}
				}
				break;
			}

			case "WhileStatement": {
				const whileStmt = node as WhileStatement;
				this.analyzeExpression(whileStmt.test);
				this.analyzeBlock(whileStmt.body);
				break;
			}

			case "ForStatement": {
				const forStmt = node as ForStatement;
				this.symbolTable.enterScope("block");
				if (forStmt.init) {
					if (forStmt.init.type === "VariableDecl") {
						this.analyzeVariableDecl(forStmt.init);
					} else {
						this.analyzeExpression(forStmt.init as Expression);
					}
				}
				if (forStmt.test) {
					this.analyzeExpression(forStmt.test);
				}
				if (forStmt.update) {
					this.analyzeExpression(forStmt.update);
				}
				this.analyzeBlock(forStmt.body);
				this.symbolTable.exitScope();
				break;
			}

			case "ForeachStatement": {
				const foreachStmt = node as ForeachStatement;
				this.symbolTable.enterScope("block");
				this.symbolTable.declare({
					name: foreachStmt.variable.name,
					kind: "variable",
					scope: this.symbolTable.current,
					defLoc: foreachStmt.variable.loc,
					refLocs: [],
				});
				this.analyzeExpression(foreachStmt.iterable);
				this.analyzeBlock(foreachStmt.body);
				this.symbolTable.exitScope();
				break;
			}

			case "SwitchStatement": {
				const switchStmt = node as SwitchStatement;
				this.analyzeExpression(switchStmt.discriminant);
				for (const caseClause of switchStmt.cases) {
					if (caseClause.test) {
						this.analyzeExpression(caseClause.test);
					}
					for (const caseStmt of caseClause.consequent) {
						this.analyzeStatement(caseStmt);
					}
				}
				break;
			}

			case "BlockStatement":
				this.symbolTable.enterScope("block");
				this.analyzeBlock(node as BlockStatement);
				this.symbolTable.exitScope();
				break;

			case "Separator":
				break;
		}
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
				const id = expr as Identifier;
				const symbol = this.symbolTable.resolve(id.name);
				if (symbol) {
					this.symbolTable.addReference(
						symbol,
						id.loc ?? { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } },
					);
				} else {
					this.errors.push({
						message: `Undefined variable: ${id.name}`,
						loc: id.loc,
					});
				}
				break;
			}

			case "CallExpression": {
				const call = expr as CallExpression;
				this.analyzeExpression(call.callee);
				for (const arg of call.arguments) {
					this.analyzeExpression(arg);
				}
				break;
			}

			case "MemberExpression": {
				const member = expr as MemberExpression;
				this.analyzeExpression(member.object);
				break;
			}

			case "IndexExpression": {
				const index = expr as IndexExpression;
				this.analyzeExpression(index.object);
				this.analyzeExpression(index.index);
				break;
			}

			case "BinaryExpression": {
				const binary = expr as import("./ast").BinaryExpression;
				this.analyzeExpression(binary.left);
				this.analyzeExpression(binary.right);
				break;
			}

			case "UnaryExpression": {
				const unary = expr as import("./ast").UnaryExpression;
				this.analyzeExpression(unary.operand);
				break;
			}

			case "ConditionalExpression": {
				const cond = expr as ConditionalExpression;
				this.analyzeExpression(cond.test);
				this.analyzeExpression(cond.consequent);
				this.analyzeExpression(cond.alternate);
				break;
			}

			case "AssignmentExpression": {
				const assign = expr as AssignmentExpression;
				this.analyzeExpression(assign.left);
				this.analyzeExpression(assign.right);
				break;
			}

			case "TupleExpression": {
				const tuple = expr as import("./ast").TupleExpression;
				for (const elem of tuple.elements) {
					this.analyzeExpression(elem);
				}
				break;
			}

			case "ArrayLiteral": {
				const arr = expr as ArrayLiteral;
				for (const elem of arr.elements) {
					this.analyzeExpression(elem);
				}
				break;
			}

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
