import type { DicFunction } from "@/types";
import { extractDialogues } from "./extract-dialogues";
import { lex } from "./lexer";
import { parse } from "./parser";
export type { Token, TokenType } from "./lexer";
export { Parser } from "./parser";
export type {
	Identifier,
	StringLiteral,
	BlockStatement,
	NumberLiteral,
	BooleanLiteral,
	NullLiteral,
	ArrayLiteral,
	TupleExpression,
	CallExpression,
	MemberExpression,
	IndexExpression,
	BinaryExpression,
	UnaryExpression,
	ConditionalExpression,
	AssignmentExpression,
	ExpressionStatement,
	IfStatement,
	WhileStatement,
	ForStatement,
	ForeachStatement,
	SwitchStatement,
	CaseClause,
	DoStatement,
	ReturnStatement,
	BreakStatement,
	ContinueStatement,
	Separator,
	FunctionDecl,
	Parameter,
	TypeAnnotation,
	VariableDecl,
	Expression,
	Statement,
	YayaProgram,
} from "./ast";
export { createLoc, mergeLoc } from "./ast";
export { traverse, traverseAll } from "./visitor";
export type { Visitor } from "./visitor";
export { extractDialogues } from "./extract-dialogues";
export { analyze } from "./semantic";
export type { SemanticAnalysisResult, SemanticError } from "./semantic";

function parseYayaDic(source: string, filePath: string): DicFunction[] {
	try {
		const ast = parse(source, filePath);
		const functions: DicFunction[] = [];

		for (const node of ast.body) {
			if (node.type === "FunctionDecl") {
				const fn = node as import("./ast").FunctionDecl;
				functions.push({
					name: fn.name.name,
					filePath,
					startLine: fn.loc?.start.line ?? 0,
					endLine: fn.loc?.end.line ?? 0,
					dialogues: extractDialogues(fn),
				});
			}
		}

		return functions;
	} catch (e) {
		console.error(`[parseYayaDic] Error parsing ${filePath}:`, e);
		return [];
	}
}

export { lex, parseYayaDic };
