import { tokenize } from "@/lib/sakura-script/tokenize";
import type { Dialogue } from "@/types/shiori";
import type { BlockStatement, Expression, FunctionDecl, Statement } from "./ast";
import {
	type ConventionalSplitSegment,
	splitExtractedStringByConventionalSeparators,
} from "./internal/dialogue-separator";

type ExtractedEntry =
	| { kind: "text"; value: string; line: number }
	| { kind: "hard-separator"; line: number }
	| { kind: "concat"; line: number };

type TextEntry = Extract<ExtractedEntry, { kind: "text" }>;

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

function mergeControlOnlyDialogues(rawDialogues: TextEntry[]): TextEntry[] {
	if (rawDialogues.length === 0) return [];

	const result: TextEntry[] = [];
	let pending: TextEntry | null = null;

	for (const d of rawDialogues) {
		if (!isTextDialogue(d.value)) {
			if (pending) {
				pending = {
					kind: "text",
					value: pending.value + d.value,
					line: pending.line,
				};
			} else {
				pending = d;
			}
		} else {
			if (pending) {
				result.push({
					kind: "text",
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

function extractStringsFromFunction(fn: FunctionDecl): ExtractedEntry[] {
	const strings: ExtractedEntry[] = [];
	const context: ExtractionContext = {
		inCondition: false,
		inCallArgument: false,
		inAssignment: false,
		inSwitchDiscriminant: false,
		inCaseTest: false,
	};

	function extractFromExpression(expr: Expression, localContext: ExtractionContext): void {
		switch (expr.type) {
			case "StringLiteral":
				if (
					!localContext.inCondition &&
					!localContext.inCallArgument &&
					!localContext.inAssignment &&
					!localContext.inSwitchDiscriminant &&
					!localContext.inCaseTest
				) {
					strings.push({
						kind: "text",
						value: expr.value,
						line: expr.loc?.start.line ?? 0,
					});
				}
				break;

			case "CallExpression":
				extractFromExpression(expr.callee, localContext);
				for (const arg of expr.arguments) {
					extractFromExpression(arg, { ...localContext, inCallArgument: true });
				}
				break;

			case "MemberExpression":
				extractFromExpression(expr.object, localContext);
				break;

			case "IndexExpression":
				extractFromExpression(expr.object, localContext);
				extractFromExpression(expr.index, localContext);
				break;

			case "BinaryExpression":
				extractFromExpression(expr.left, localContext);
				extractFromExpression(expr.right, localContext);
				break;

			case "UnaryExpression":
				extractFromExpression(expr.operand, localContext);
				break;

			case "ConditionalExpression":
				extractFromExpression(expr.test, { ...localContext, inCondition: true });
				extractFromExpression(expr.consequent, localContext);
				extractFromExpression(expr.alternate, localContext);
				break;

			case "AssignmentExpression":
				extractFromExpression(expr.right, { ...localContext, inAssignment: true });
				break;

			case "TupleExpression":
				for (const elem of expr.elements) {
					extractFromExpression(elem, localContext);
				}
				break;

			case "ArrayLiteral":
				for (const elem of expr.elements) {
					extractFromExpression(elem, localContext);
				}
				break;

			case "Identifier":
			case "NumberLiteral":
			case "BooleanLiteral":
			case "NullLiteral":
				break;
		}
	}

	function extractFromStatement(stmt: Statement): void {
		switch (stmt.type) {
			case "ExpressionStatement":
				extractFromExpression(stmt.expression, context);
				break;

			case "ReturnStatement":
				if (stmt.value) {
					extractFromExpression(stmt.value, context);
				}
				break;

			case "ParallelStatement":
				extractFromExpression(stmt.expression, context);
				break;

			case "VoidStatement":
				extractFromExpression(stmt.expression, context);
				break;

			case "VariableDecl":
				if (stmt.init) {
					extractFromExpression(stmt.init, { ...context, inAssignment: true });
				}
				break;

			case "IfStatement":
				extractFromExpression(stmt.test, { ...context, inCondition: true });
				extractFromBlock(stmt.consequent);
				if (stmt.alternate) {
					if (stmt.alternate.type === "BlockStatement") {
						extractFromBlock(stmt.alternate);
					} else {
						extractFromStatement(stmt.alternate);
					}
				}
				break;

			case "WhileStatement":
				extractFromExpression(stmt.test, { ...context, inCondition: true });
				extractFromBlock(stmt.body);
				break;

			case "ForStatement":
				if (stmt.init && stmt.init.type !== "VariableDecl") {
					extractFromExpression(stmt.init, context);
				} else if (stmt.init && stmt.init.type === "VariableDecl") {
					extractFromStatement(stmt.init);
				}
				if (stmt.test) {
					extractFromExpression(stmt.test, { ...context, inCondition: true });
				}
				if (stmt.update) {
					extractFromExpression(stmt.update, context);
				}
				extractFromBlock(stmt.body);
				break;

			case "ForeachStatement":
				extractFromExpression(stmt.iterable, context);
				extractFromBlock(stmt.body);
				break;

			case "SwitchStatement":
				extractFromExpression(stmt.discriminant, { ...context, inSwitchDiscriminant: true });
				for (const caseClause of stmt.cases) {
					if (caseClause.test) {
						extractFromExpression(caseClause.test, { ...context, inCaseTest: true });
					}
					for (const caseStmt of caseClause.consequent) {
						extractFromStatement(caseStmt);
					}
				}
				break;

			case "BlockStatement":
				extractFromBlock(stmt);
				break;

			case "Separator":
				strings.push({ kind: "concat", line: stmt.loc?.start.line ?? 0 });
				break;

			case "DoStatement":
			case "BreakStatement":
			case "ContinueStatement":
			case "FunctionDecl":
				break;
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

function expandExtractedStrings(strings: ExtractedEntry[]): ExtractedEntry[] {
	const expanded: ExtractedEntry[] = [];

	for (const entry of strings) {
		if (entry.kind !== "text") {
			expanded.push(entry);
			continue;
		}

		const parts = splitExtractedStringByConventionalSeparators(entry.value, entry.line);
		appendExpandedParts(expanded, parts, entry.line);
	}

	return expanded;
}

function appendExpandedParts(
	target: ExtractedEntry[],
	parts: ConventionalSplitSegment[],
	line: number,
): void {
	for (const [index, part] of parts.entries()) {
		target.push({
			kind: "text",
			value: part.value,
			line: part.line,
		});
		if (index < parts.length - 1) {
			target.push({ kind: "hard-separator", line });
		}
	}
}

function mergeConcatenatedEntries(entries: ExtractedEntry[]): ExtractedEntry[] {
	const result: ExtractedEntry[] = [];
	let sections: TextEntry[][] = [[]];

	function flushSections(): void {
		const nonEmpty = sections.filter((s) => s.length > 0);
		sections = [[]];

		if (nonEmpty.length === 0) return;

		const first = nonEmpty[0];
		if (!first) return;

		if (nonEmpty.length === 1) {
			for (const entry of first) {
				result.push(entry);
			}
			return;
		}

		let combinations: TextEntry[] = first.map((e) => ({ ...e }));
		for (let i = 1; i < nonEmpty.length; i++) {
			const section = nonEmpty[i];
			if (!section) continue;
			const next: TextEntry[] = [];
			for (const prev of combinations) {
				for (const curr of section) {
					next.push({
						kind: "text",
						value: prev.value + curr.value,
						line: prev.line,
					});
				}
			}
			combinations = next;
		}

		for (const entry of combinations) {
			if (entry.value.length > 0) {
				result.push(entry);
			}
		}
	}

	for (const entry of entries) {
		switch (entry.kind) {
			case "text": {
				const lastSection = sections[sections.length - 1];
				if (lastSection) lastSection.push(entry);
				break;
			}

			case "concat":
				sections.push([]);
				break;

			case "hard-separator":
				flushSections();
				result.push(entry);
				break;
		}
	}

	flushSections();

	return result;
}

function groupByHardSeparator(entries: ExtractedEntry[]): TextEntry[][] {
	const groups: TextEntry[][] = [];
	let current: TextEntry[] = [];

	for (const s of entries) {
		if (s.kind === "hard-separator") {
			if (current.length > 0) {
				groups.push(current);
				current = [];
			}
		} else if (s.kind === "text") {
			current.push(s);
		}
	}

	if (current.length > 0) {
		groups.push(current);
	}

	return groups;
}

function stringsToDialogues(strings: ExtractedEntry[]): Dialogue[] {
	if (strings.length === 0) return [];

	const expanded = expandExtractedStrings(strings);
	const concatenated = mergeConcatenatedEntries(expanded);
	const groups = groupByHardSeparator(concatenated);
	const merged = mergeControlOnlyAcrossGroups(groups);
	const result: Dialogue[] = [];

	for (const d of merged) {
		if (d.value.length === 0) continue;

		result.push({
			rawText: d.value,
			tokens: tokenize(d.value),
			startLine: d.line,
			endLine: d.line,
		});
	}

	return result;
}

function mergeControlOnlyAcrossGroups(groups: TextEntry[][]): TextEntry[] {
	const result: TextEntry[] = [];
	let pendingControl: TextEntry | null = null;

	for (const group of groups) {
		if (group.length === 0) {
			continue;
		}

		const mergedInGroup = mergeControlOnlyDialogues(group);
		for (const entry of mergedInGroup) {
			if (entry.value.length === 0) {
				continue;
			}

			if (isTextDialogue(entry.value)) {
				if (!pendingControl) {
					result.push(entry);
					continue;
				}

				result.push({
					kind: "text",
					value: pendingControl.value + entry.value,
					line: pendingControl.line,
				});
				pendingControl = null;
				continue;
			}

			if (!pendingControl) {
				pendingControl = entry;
				continue;
			}

			pendingControl = {
				kind: "text",
				value: pendingControl.value + entry.value,
				line: pendingControl.line,
			};
		}
	}

	if (pendingControl) {
		result.push(pendingControl);
	}

	return result;
}

function extractDialogues(fn: FunctionDecl): Dialogue[] {
	const strings = extractStringsFromFunction(fn);
	return stringsToDialogues(strings);
}

export { extractDialogues };
