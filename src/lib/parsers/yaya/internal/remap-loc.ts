import type { BaseNode } from "../../core/ast";
import type { YayaProgram } from "../ast";
import { traverse } from "../visitor";

function remapProgramLoc(program: YayaProgram, lineMap: number[]): YayaProgram {
	traverse(program, {
		enter(node) {
			remapNodeLoc(node, lineMap);
		},
	});
	return program;
}

function remapNodeLoc(node: BaseNode, lineMap: number[]): void {
	if (!node.loc) {
		return;
	}
	node.loc.start.line = remapLine(node.loc.start.line, lineMap);
	node.loc.end.line = remapLine(node.loc.end.line, lineMap);
}

function remapLine(generatedLine: number, lineMap: number[]): number {
	const mappedLine = lineMap[generatedLine];
	return typeof mappedLine === "number" ? mappedLine : generatedLine;
}

export { remapProgramLoc };
