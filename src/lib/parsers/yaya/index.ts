import type { DicFunction, ParseDiagnostic } from "@/types";
import { extractDialogues } from "./extract-dialogues";
import type { YayaPreprocessState } from "./internal/preprocessor";
import { lex } from "./lexer";
import { parseDicProgram } from "./parser";
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
	ParallelStatement,
	VoidStatement,
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

interface ParseYayaDicResult {
	functions: DicFunction[];
	diagnostics: ParseDiagnostic[];
}

interface ParseYayaDicOptions {
	preprocessState?: YayaPreprocessState;
}

function parseYayaDic(source: string, filePath: string): DicFunction[] {
	return parseYayaDicWithDiagnostics(source, filePath).functions;
}

function parseYayaDicWithDiagnostics(
	source: string,
	filePath: string,
	options?: ParseYayaDicOptions,
): ParseYayaDicResult {
	try {
		const parsed = parseDicProgram(source, filePath, options?.preprocessState);
		const functions: DicFunction[] = [];

		for (const node of parsed.program.body) {
			if (node.type === "FunctionDecl") {
				functions.push({
					name: node.name.name,
					filePath,
					startLine: node.loc?.start.line ?? 0,
					endLine: node.loc?.end.line ?? 0,
					dialogues: extractDialogues(node),
				});
			}
		}

		return {
			functions,
			diagnostics: parsed.diagnostics,
		};
	} catch (e) {
		const message = e instanceof Error ? e.message : "YAYA の解析に失敗しました";
		return {
			functions: [],
			diagnostics: [
				{
					level: "error",
					code: "YAYA_PARSE_FAILED",
					message,
					filePath,
					line: inferErrorLine(e),
				},
			],
		};
	}
}

function inferErrorLine(error: unknown): number {
	if (!(error instanceof Error)) {
		return 0;
	}
	const match = /line\s+(\d+)/u.exec(error.message);
	if (!match) {
		return 0;
	}
	const parsed = Number.parseInt(match[1] ?? "0", 10);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export { lex, parseYayaDic, parseYayaDicWithDiagnostics };
