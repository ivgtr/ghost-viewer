import type { YayaProgram } from "../ast";
import { parse as parseLegacy } from "./legacy-parser";
import type { NormalizedProgram } from "./types";

interface BuiltAst {
	program: YayaProgram;
	lineMap: number[];
}

interface RenderedProgram {
	source: string;
	lineMap: number[];
}

function buildAst(program: NormalizedProgram, filePath?: string): BuiltAst {
	const rendered = renderNormalizedProgram(program);
	return {
		program: parseLegacy(rendered.source, filePath),
		lineMap: rendered.lineMap,
	};
}

function renderNormalizedProgram(program: NormalizedProgram): RenderedProgram {
	const lines: string[] = [];
	const lineMap: number[] = [];
	let remainingSeparators = program.separators;

	for (const [index, fn] of program.functions.entries()) {
		const header = fn.returnType ? `${fn.name} : ${fn.returnType}` : fn.name;
		appendLine(lines, lineMap, header, fn.line - 1);
		appendLine(lines, lineMap, "{", fn.line - 1);

		let indent = 1;
		for (const token of fn.bodyTokens) {
			if (token.text === "}") {
				indent = Math.max(0, indent - 1);
			}

			appendLine(lines, lineMap, `${"\t".repeat(indent)}${token.text}`, token.line - 1);

			if (token.text === "{") {
				indent += 1;
			}
		}

		appendLine(lines, lineMap, "}", fn.endLine - 1);

		if (remainingSeparators > 0 && index < program.functions.length - 1) {
			appendLine(lines, lineMap, "--", fn.endLine - 1);
			remainingSeparators--;
		}
	}

	return {
		source: lines.join("\n"),
		lineMap,
	};
}

function appendLine(lines: string[], lineMap: number[], text: string, sourceLine: number): void {
	lines.push(text);
	lineMap.push(normalizeSourceLine(sourceLine));
}

function normalizeSourceLine(line: number): number {
	return line >= 0 ? line : 0;
}

export { buildAst, renderNormalizedProgram };
