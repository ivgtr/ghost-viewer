import type { BaseNode, SourceLocation } from "../core/ast";

interface Identifier extends BaseNode {
	type: "Identifier";
	name: string;
}

interface StringLiteral extends BaseNode {
	type: "StringLiteral";
	value: string;
	raw?: string;
}

interface NumberLiteral extends BaseNode {
	type: "NumberLiteral";
	value: number;
	raw: string;
}

interface BooleanLiteral extends BaseNode {
	type: "BooleanLiteral";
	value: boolean;
}

interface NullLiteral extends BaseNode {
	type: "NullLiteral";
}

interface ArrayLiteral extends BaseNode {
	type: "ArrayLiteral";
	elements: Expression[];
}

interface TupleExpression extends BaseNode {
	type: "TupleExpression";
	elements: Expression[];
}

interface CallExpression extends BaseNode {
	type: "CallExpression";
	callee: Expression;
	arguments: Expression[];
}

interface MemberExpression extends BaseNode {
	type: "MemberExpression";
	object: Expression;
	property: Identifier;
}

interface IndexExpression extends BaseNode {
	type: "IndexExpression";
	object: Expression;
	index: Expression;
}

interface BinaryExpression extends BaseNode {
	type: "BinaryExpression";
	operator: string;
	left: Expression;
	right: Expression;
}

interface UnaryExpression extends BaseNode {
	type: "UnaryExpression";
	operator: string;
	operand: Expression;
	prefix: boolean;
}

interface ConditionalExpression extends BaseNode {
	type: "ConditionalExpression";
	test: Expression;
	consequent: Expression;
	alternate: Expression;
}

interface AssignmentExpression extends BaseNode {
	type: "AssignmentExpression";
	operator: string;
	left: Expression;
	right: Expression;
}

type Expression =
	| Identifier
	| StringLiteral
	| NumberLiteral
	| BooleanLiteral
	| NullLiteral
	| ArrayLiteral
	| TupleExpression
	| CallExpression
	| MemberExpression
	| IndexExpression
	| BinaryExpression
	| UnaryExpression
	| ConditionalExpression
	| AssignmentExpression;

interface ExpressionStatement extends BaseNode {
	type: "ExpressionStatement";
	expression: Expression;
}

interface BlockStatement extends BaseNode {
	type: "BlockStatement";
	body: Statement[];
}

interface IfStatement extends BaseNode {
	type: "IfStatement";
	test: Expression;
	consequent: BlockStatement;
	alternate: BlockStatement | IfStatement | null;
}

interface WhileStatement extends BaseNode {
	type: "WhileStatement";
	test: Expression;
	body: BlockStatement;
}

interface ForStatement extends BaseNode {
	type: "ForStatement";
	init: Expression | VariableDecl | null;
	test: Expression | null;
	update: Expression | null;
	body: BlockStatement;
}

interface ForeachStatement extends BaseNode {
	type: "ForeachStatement";
	variable: Identifier;
	iterable: Expression;
	body: BlockStatement;
}

interface SwitchStatement extends BaseNode {
	type: "SwitchStatement";
	discriminant: Expression;
	cases: CaseClause[];
}

interface CaseClause extends BaseNode {
	type: "CaseClause";
	test: Expression | null;
	consequent: Statement[];
}

interface DoStatement extends BaseNode {
	type: "DoStatement";
	body: BlockStatement;
	test: Expression;
}

interface ReturnStatement extends BaseNode {
	type: "ReturnStatement";
	value: Expression | null;
}

interface BreakStatement extends BaseNode {
	type: "BreakStatement";
}

interface ContinueStatement extends BaseNode {
	type: "ContinueStatement";
}

interface ParallelStatement extends BaseNode {
	type: "ParallelStatement";
	expression: Expression;
}

interface VoidStatement extends BaseNode {
	type: "VoidStatement";
	expression: Expression;
}

interface Separator extends BaseNode {
	type: "Separator";
}

interface FunctionDecl extends BaseNode {
	type: "FunctionDecl";
	name: Identifier;
	params: Parameter[];
	body: BlockStatement;
	returnType?: TypeAnnotation;
}

interface Parameter extends BaseNode {
	type: "Parameter";
	name: Identifier;
	typeAnnotation?: TypeAnnotation;
	defaultValue?: Expression;
}

interface TypeAnnotation extends BaseNode {
	type: "TypeAnnotation";
	name: string;
	params?: TypeAnnotation[];
}

interface VariableDecl extends BaseNode {
	type: "VariableDecl";
	kind: "var" | "const";
	name: Identifier;
	init?: Expression;
	typeAnnotation?: TypeAnnotation;
}

type Statement =
	| ExpressionStatement
	| IfStatement
	| WhileStatement
	| ForStatement
	| ForeachStatement
	| SwitchStatement
	| DoStatement
	| ReturnStatement
	| BreakStatement
	| ContinueStatement
	| ParallelStatement
	| VoidStatement
	| Separator
	| FunctionDecl
	| VariableDecl
	| BlockStatement;

interface YayaProgram extends BaseNode {
	type: "Program";
	body: Statement[];
	filePath?: string;
}

function createLoc(
	line: number,
	column: number,
	endLine?: number,
	endColumn?: number,
): SourceLocation {
	return {
		start: { line, column },
		end: { line: endLine ?? line, column: endColumn ?? column },
	};
}

function mergeLoc(start: SourceLocation, end: SourceLocation): SourceLocation {
	return {
		start: start.start,
		end: end.end,
	};
}

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
};

function createNullLiteral(loc: SourceLocation): NullLiteral {
	return { type: "NullLiteral", loc };
}

function createStringLiteral(value: string, loc: SourceLocation): StringLiteral {
	return { type: "StringLiteral", value, loc };
}

function createNumberLiteral(value: number, raw: string, loc: SourceLocation): NumberLiteral {
	return { type: "NumberLiteral", value, raw, loc };
}

function createBooleanLiteral(value: boolean, loc: SourceLocation): BooleanLiteral {
	return { type: "BooleanLiteral", value, loc };
}

function createIdentifier(name: string, loc: SourceLocation): Identifier {
	return { type: "Identifier", name, loc };
}

function createArrayLiteral(elements: Expression[], loc: SourceLocation): ArrayLiteral {
	return { type: "ArrayLiteral", elements, loc };
}

export {
	createLoc,
	mergeLoc,
	createNullLiteral,
	createStringLiteral,
	createNumberLiteral,
	createBooleanLiteral,
	createIdentifier,
	createArrayLiteral,
};
