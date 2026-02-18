import { tokenize } from "@/lib/sakura-script/tokenize";
import type { Dialogue } from "@/types/shiori";
import type { BaseNode } from "../core/ast";
import type {
	ArrayLiteral,
	AssignmentExpression,
	BlockStatement,
	CallExpression,
	ConditionalExpression,
	Expression,
	ExpressionStatement,
	ForStatement,
	ForeachStatement,
	FunctionDecl,
	IfStatement,
	IndexExpression,
	MemberExpression,
	ReturnStatement,
	StringLiteral,
	SwitchStatement,
	VariableDecl,
	WhileStatement,
} from "./ast";

interface ExtractedString {
	value: string;
	line: number;
}

interface ExtractionContext {
	inCondition: boolean;
	inCallArgument: boolean;
	inAssignment: boolean;
	inSwitchDiscriminant: boolean;
	inCaseTest: boolean;
}

function isTextDialogue(text: string): boolean {
	const tokens = tokenize(text);
	return tokens.some((t) => t.tokenType === "text");
}

function mergeControlOnlyDialogues(rawDialogues: ExtractedString[]): ExtractedString[] {
	if (rawDialogues.length === 0) return [];

	const result: ExtractedString[] = [];
	let pending: ExtractedString | null = null;

	for (const d of rawDialogues) {
		if (!isTextDialogue(d.value)) {
			if (pending) {
				pending = {
					value: pending.value + d.value,
					line: pending.line,
				};
			} else {
				pending = d;
			}
		} else {
			if (pending) {
				result.push({
					value: pending.value + d.value,
					line: pending.line,
				});
				pending = null;
			} else {
				result.push(d);
			}
		}
	}

	if (pending) {
		result.push(pending);
	}

	return result;
}

function extractStringsFromFunction(fn: FunctionDecl): ExtractedString[] {
	const strings: ExtractedString[] = [];
	const context: ExtractionContext = {
		inCondition: false,
		inCallArgument: false,
		inAssignment: false,
		inSwitchDiscriminant: false,
		inCaseTest: false,
	};

	function extractFromExpression(expr: Expression, localContext: ExtractionContext): void {
		switch (expr.type) {
			case "StringLiteral": {
				const str = expr as StringLiteral;
				if (
					!localContext.inCondition &&
					!localContext.inCallArgument &&
					!localContext.inAssignment &&
					!localContext.inSwitchDiscriminant &&
					!localContext.inCaseTest
				) {
					strings.push({
						value: str.value,
						line: str.loc?.start.line ?? 0,
					});
				}
				break;
			}

			case "CallExpression": {
				const call = expr as CallExpression;
				extractFromExpression(call.callee, localContext);
				for (const arg of call.arguments) {
					extractFromExpression(arg, { ...localContext, inCallArgument: true });
				}
				break;
			}

			case "MemberExpression": {
				const member = expr as MemberExpression;
				extractFromExpression(member.object, localContext);
				break;
			}

			case "IndexExpression": {
				const index = expr as IndexExpression;
				extractFromExpression(index.object, localContext);
				extractFromExpression(index.index, localContext);
				break;
			}

			case "BinaryExpression": {
				const binary = expr as import("./ast").BinaryExpression;
				extractFromExpression(binary.left, localContext);
				extractFromExpression(binary.right, localContext);
				break;
			}

			case "UnaryExpression": {
				const unary = expr as import("./ast").UnaryExpression;
				extractFromExpression(unary.operand, localContext);
				break;
			}

			case "ConditionalExpression": {
				const cond = expr as ConditionalExpression;
				extractFromExpression(cond.test, { ...localContext, inCondition: true });
				extractFromExpression(cond.consequent, localContext);
				extractFromExpression(cond.alternate, localContext);
				break;
			}

			case "AssignmentExpression": {
				const assign = expr as AssignmentExpression;
				extractFromExpression(assign.right, { ...localContext, inAssignment: true });
				break;
			}

			case "TupleExpression": {
				const tuple = expr as import("./ast").TupleExpression;
				for (const elem of tuple.elements) {
					extractFromExpression(elem, localContext);
				}
				break;
			}

			case "ArrayLiteral": {
				const arr = expr as ArrayLiteral;
				for (const elem of arr.elements) {
					extractFromExpression(elem, localContext);
				}
				break;
			}

			case "Identifier":
			case "NumberLiteral":
			case "BooleanLiteral":
			case "NullLiteral":
				break;
		}
	}

	function extractFromStatement(stmt: BaseNode): void {
		switch (stmt.type) {
			case "ExpressionStatement": {
				const exprStmt = stmt as ExpressionStatement;
				extractFromExpression(exprStmt.expression, context);
				break;
			}

			case "ReturnStatement": {
				const ret = stmt as ReturnStatement;
				if (ret.value) {
					extractFromExpression(ret.value, context);
				}
				break;
			}

			case "VariableDecl": {
				const decl = stmt as VariableDecl;
				if (decl.init) {
					extractFromExpression(decl.init, { ...context, inAssignment: true });
				}
				break;
			}

			case "IfStatement": {
				const ifStmt = stmt as IfStatement;
				extractFromExpression(ifStmt.test, { ...context, inCondition: true });
				extractFromBlock(ifStmt.consequent);
				if (ifStmt.alternate) {
					if (ifStmt.alternate.type === "BlockStatement") {
						extractFromBlock(ifStmt.alternate);
					} else {
						extractFromStatement(ifStmt.alternate);
					}
				}
				break;
			}

			case "WhileStatement": {
				const whileStmt = stmt as WhileStatement;
				extractFromExpression(whileStmt.test, { ...context, inCondition: true });
				extractFromBlock(whileStmt.body);
				break;
			}

			case "ForStatement": {
				const forStmt = stmt as ForStatement;
				if (forStmt.init && forStmt.init.type !== "VariableDecl") {
					extractFromExpression(forStmt.init as Expression, context);
				} else if (forStmt.init && forStmt.init.type === "VariableDecl") {
					extractFromStatement(forStmt.init);
				}
				if (forStmt.test) {
					extractFromExpression(forStmt.test, { ...context, inCondition: true });
				}
				if (forStmt.update) {
					extractFromExpression(forStmt.update, context);
				}
				extractFromBlock(forStmt.body);
				break;
			}

			case "ForeachStatement": {
				const foreachStmt = stmt as ForeachStatement;
				extractFromExpression(foreachStmt.iterable, context);
				extractFromBlock(foreachStmt.body);
				break;
			}

			case "SwitchStatement": {
				const switchStmt = stmt as SwitchStatement;
				extractFromExpression(switchStmt.discriminant, { ...context, inSwitchDiscriminant: true });
				for (const caseClause of switchStmt.cases) {
					if (caseClause.test) {
						extractFromExpression(caseClause.test, { ...context, inCaseTest: true });
					}
					for (const caseStmt of caseClause.consequent) {
						extractFromStatement(caseStmt);
					}
				}
				break;
			}

			case "BlockStatement": {
				const block = stmt as BlockStatement;
				extractFromBlock(block);
				break;
			}
		}
	}

	function extractFromBlock(block: BlockStatement): void {
		for (const stmt of block.body) {
			extractFromStatement(stmt);
		}
	}

	extractFromBlock(fn.body);

	return strings;
}

function splitBySeparator(strings: ExtractedString[]): ExtractedString[][] {
	const groups: ExtractedString[][] = [];
	let current: ExtractedString[] = [];

	for (const s of strings) {
		if (s.value === "--") {
			if (current.length > 0) {
				groups.push(current);
				current = [];
			}
		} else {
			current.push(s);
		}
	}

	if (current.length > 0) {
		groups.push(current);
	}

	return groups;
}

function stringsToDialogues(strings: ExtractedString[]): Dialogue[] {
	if (strings.length === 0) return [];

	const groups = splitBySeparator(strings);
	const result: Dialogue[] = [];

	for (const group of groups) {
		if (group.length === 0) continue;

		const merged = mergeControlOnlyDialogues(group);

		for (const d of merged) {
			if (d.value.length === 0) continue;

			result.push({
				rawText: d.value,
				tokens: tokenize(d.value),
				startLine: d.line,
				endLine: d.line,
			});
		}
	}

	return result;
}

function extractDialogues(fn: FunctionDecl): Dialogue[] {
	const strings = extractStringsFromFunction(fn);
	return stringsToDialogues(strings);
}

export { extractDialogues };
