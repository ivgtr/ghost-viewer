import type { SourceLocation } from "../core/ast";
import { SymbolTable, resetScopeIdCounter } from "../core/symbol-table";
import type { EventDecl, SatoriLineNode, SatoriProgram, SectionBlock, TextLine } from "./ast";

interface SemanticAnalysisResult {
	symbolTable: SymbolTable;
	errors: SemanticError[];
}

interface SemanticError {
	message: string;
	loc?: SourceLocation;
}

interface VariableReference {
	name: string;
	columnStart: number;
	columnEnd: number;
}

function isEventDecl(node: EventDecl | SectionBlock): node is EventDecl {
	return node.type === "EventDecl";
}

function isDollarSection(node: EventDecl | SectionBlock): node is SectionBlock {
	return node.type === "SectionBlock" && node.separator.marker === "＄";
}

function isTextLine(line: SatoriLineNode): line is TextLine {
	return line.type === "TextLine";
}

function getLineText(line: SatoriLineNode): string {
	if (line.type === "DialogueLine") {
		return line.rawText;
	}
	return line.value;
}

function extractVariableDeclarationName(line: string): string | null {
	const trimmed = line.trim();
	if (trimmed === "") {
		return null;
	}

	const separatorIndex = trimmed.indexOf("=");
	const variableName =
		separatorIndex === -1 ? trimmed : trimmed.slice(0, Math.max(separatorIndex, 0)).trim();

	return variableName === "" ? null : variableName;
}

function extractVariableReferences(text: string): VariableReference[] {
	const references: VariableReference[] = [];
	const variablePattern = /\$\(([^)]*)\)/gu;

	let match: RegExpExecArray | null = variablePattern.exec(text);
	while (match) {
		const rawName = match[1] ?? "";
		const trimmedName = rawName.trim();

		if (trimmedName !== "") {
			const leadingWhitespaceLength = rawName.length - rawName.trimStart().length;
			const nameStart = match.index + 2 + leadingWhitespaceLength;
			references.push({
				name: trimmedName,
				columnStart: nameStart,
				columnEnd: nameStart + trimmedName.length,
			});
		}

		match = variablePattern.exec(text);
	}

	return references;
}

function buildReferenceLoc(lineLoc: SourceLocation, reference: VariableReference): SourceLocation {
	const baseLine = lineLoc.start.line;
	const baseColumn = lineLoc.start.column;
	return {
		start: {
			line: baseLine,
			column: baseColumn + reference.columnStart,
		},
		end: {
			line: baseLine,
			column: baseColumn + reference.columnEnd,
		},
	};
}

class SemanticAnalyzer {
	private symbolTable: SymbolTable;
	private errors: SemanticError[];

	constructor() {
		resetScopeIdCounter();
		this.symbolTable = new SymbolTable();
		this.errors = [];
	}

	analyze(program: SatoriProgram): SemanticAnalysisResult {
		this.declareEvents(program);
		this.symbolTable.enterScope("block");
		this.declareDollarSectionVariables(program);
		this.resolveVariableReferences(program);

		return {
			symbolTable: this.symbolTable,
			errors: this.errors,
		};
	}

	private declareEvents(program: SatoriProgram): void {
		for (const node of program.body) {
			if (!isEventDecl(node)) {
				continue;
			}

			const existing = this.symbolTable.global.symbols.get(node.name);
			if (existing && existing.kind === "event") {
				this.errors.push({
					message: `Duplicate event declaration: ${node.name}`,
					loc: node.loc,
				});
				continue;
			}

			this.symbolTable.declare({
				name: node.name,
				kind: "event",
				scope: this.symbolTable.current,
				defLoc: node.loc,
				refLocs: [],
			});
		}
	}

	private declareDollarSectionVariables(program: SatoriProgram): void {
		for (const node of program.body) {
			if (!isDollarSection(node)) {
				continue;
			}

			for (const line of node.lines) {
				if (!isTextLine(line)) {
					continue;
				}

				const variableName = extractVariableDeclarationName(line.value);
				if (!variableName) {
					continue;
				}

				this.symbolTable.declare({
					name: variableName,
					kind: "variable",
					scope: this.symbolTable.current,
					defLoc: line.loc,
					refLocs: [],
				});
			}
		}
	}

	private resolveVariableReferences(program: SatoriProgram): void {
		for (const node of program.body) {
			for (const line of node.lines) {
				this.resolveVariableReferencesInLine(line);
			}
		}
	}

	private resolveVariableReferencesInLine(line: SatoriLineNode): void {
		const references = extractVariableReferences(getLineText(line));
		for (const reference of references) {
			const loc = buildReferenceLoc(line.loc, reference);
			const symbol = this.symbolTable.resolve(reference.name);

			if (!symbol || symbol.kind !== "variable") {
				this.errors.push({
					message: `Undefined variable: ${reference.name}`,
					loc,
				});
				continue;
			}

			this.symbolTable.addReference(symbol, loc);
		}
	}
}

function analyze(program: SatoriProgram): SemanticAnalysisResult {
	const analyzer = new SemanticAnalyzer();
	return analyzer.analyze(program);
}

export type { SemanticAnalysisResult, SemanticError, VariableReference };
export {
	SemanticAnalyzer,
	analyze,
	buildReferenceLoc,
	extractVariableDeclarationName,
	extractVariableReferences,
};
