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
} from "./ast";
import {
	isBlockStatement,
	isFunctionDef,
	isIdentifier,
	isParameter,
	isProgram,
	isStringLiteral,
	isTypeAnnotation,
	isVariableDecl,
} from "./ast";

interface Visitor {
	enter?(node: BaseNode): void;
	exit?(node: BaseNode): void;
	visitProgram?(node: Program): void;
	visitFunctionDef?(node: FunctionDef): void;
	visitVariableDecl?(node: VariableDecl): void;
	visitIdentifier?(node: Identifier): void;
	visitStringLiteral?(node: StringLiteral): void;
	visitBlockStatement?(node: BlockStatement): void;
	visitParameter?(node: Parameter): void;
	visitTypeAnnotation?(node: TypeAnnotation): void;
}

function traverse(node: BaseNode, visitor: Visitor): void {
	visitor.enter?.(node);

	if (isProgram(node)) {
		visitor.visitProgram?.(node);
		traverseAll(node.body, visitor);
	} else if (isFunctionDef(node)) {
		visitor.visitFunctionDef?.(node);
		traverse(node.name, visitor);
		traverseAll(node.params, visitor);
		traverse(node.body, visitor);
		if (node.returnType) traverse(node.returnType, visitor);
	} else if (isVariableDecl(node)) {
		visitor.visitVariableDecl?.(node);
		traverse(node.name, visitor);
		if (node.init) traverse(node.init, visitor);
		if (node.typeAnnotation) traverse(node.typeAnnotation, visitor);
	} else if (isBlockStatement(node)) {
		visitor.visitBlockStatement?.(node);
		traverseAll(node.body, visitor);
	} else if (isParameter(node)) {
		visitor.visitParameter?.(node);
		traverse(node.name, visitor);
		if (node.typeAnnotation) traverse(node.typeAnnotation, visitor);
	} else if (isTypeAnnotation(node)) {
		visitor.visitTypeAnnotation?.(node);
		if (node.params) traverseAll(node.params, visitor);
	} else if (isIdentifier(node)) {
		visitor.visitIdentifier?.(node);
	} else if (isStringLiteral(node)) {
		visitor.visitStringLiteral?.(node);
	}

	visitor.exit?.(node);
}

function traverseAll(nodes: BaseNode[], visitor: Visitor): void {
	for (const node of nodes) {
		traverse(node, visitor);
	}
}

export type { Visitor };

export { traverse, traverseAll };
