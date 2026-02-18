interface Position {
	line: number;
	column: number;
}

interface SourceLocation {
	start: Position;
	end: Position;
	filePath?: string;
}

interface BaseNode {
	type: string;
	loc?: SourceLocation;
}

interface Program extends BaseNode {
	type: "Program";
	body: Statement[];
	filePath?: string;
}

interface TypeAnnotation extends BaseNode {
	type: "TypeAnnotation";
	name: string;
	params?: TypeAnnotation[];
}

interface Parameter extends BaseNode {
	type: "Parameter";
	name: Identifier;
	typeAnnotation?: TypeAnnotation;
}

interface FunctionDef extends BaseNode {
	type: "FunctionDef";
	name: Identifier;
	params: Parameter[];
	body: BlockStatement;
	returnType?: TypeAnnotation;
}

interface VariableDecl extends BaseNode {
	type: "VariableDecl";
	name: Identifier;
	init?: Expression;
	typeAnnotation?: TypeAnnotation;
}

interface Identifier extends BaseNode {
	type: "Identifier";
	name: string;
}

interface StringLiteral extends BaseNode {
	type: "StringLiteral";
	value: string;
	raw?: string;
}

interface BlockStatement extends BaseNode {
	type: "BlockStatement";
	body: Statement[];
}

type Statement = FunctionDef | VariableDecl | BlockStatement;

type Expression = Identifier | StringLiteral;

type AnyNode = Program | Statement | Expression | Parameter | TypeAnnotation;

function isProgram(node: BaseNode): node is Program {
	return node.type === "Program";
}

function isFunctionDef(node: BaseNode): node is FunctionDef {
	return node.type === "FunctionDef";
}

function isVariableDecl(node: BaseNode): node is VariableDecl {
	return node.type === "VariableDecl";
}

function isIdentifier(node: BaseNode): node is Identifier {
	return node.type === "Identifier";
}

function isStringLiteral(node: BaseNode): node is StringLiteral {
	return node.type === "StringLiteral";
}

function isBlockStatement(node: BaseNode): node is BlockStatement {
	return node.type === "BlockStatement";
}

function isParameter(node: BaseNode): node is Parameter {
	return node.type === "Parameter";
}

function isTypeAnnotation(node: BaseNode): node is TypeAnnotation {
	return node.type === "TypeAnnotation";
}

export type {
	Position,
	SourceLocation,
	BaseNode,
	Program,
	TypeAnnotation,
	Parameter,
	FunctionDef,
	VariableDecl,
	Identifier,
	StringLiteral,
	BlockStatement,
	Statement,
	Expression,
	AnyNode,
};

export {
	isProgram,
	isFunctionDef,
	isVariableDecl,
	isIdentifier,
	isStringLiteral,
	isBlockStatement,
	isParameter,
	isTypeAnnotation,
};
