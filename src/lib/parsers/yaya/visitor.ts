import type { BaseNode } from "../core/ast";
import type {
	ArrayLiteral,
	AssignmentExpression,
	BlockStatement,
	BooleanLiteral,
	BreakStatement,
	CallExpression,
	CaseClause,
	ConditionalExpression,
	ContinueStatement,
	DoStatement,
	Expression,
	ExpressionStatement,
	ForStatement,
	ForeachStatement,
	FunctionDecl,
	Identifier,
	IfStatement,
	IndexExpression,
	MemberExpression,
	NullLiteral,
	NumberLiteral,
	ParallelStatement,
	Parameter,
	ReturnStatement,
	Separator,
	Statement,
	StringLiteral,
	SwitchStatement,
	TupleExpression,
	TypeAnnotation,
	VariableDecl,
	VoidStatement,
	WhileStatement,
	YayaProgram,
} from "./ast";

interface Visitor {
	enter?(node: BaseNode): void;
	exit?(node: BaseNode): void;
	visitProgram?(node: YayaProgram): void;
	visitFunctionDecl?(node: FunctionDecl): void;
	visitVariableDecl?(node: VariableDecl): void;
	visitIdentifier?(node: Identifier): void;
	visitStringLiteral?(node: StringLiteral): void;
	visitNumberLiteral?(node: NumberLiteral): void;
	visitBooleanLiteral?(node: BooleanLiteral): void;
	visitNullLiteral?(node: NullLiteral): void;
	visitArrayLiteral?(node: ArrayLiteral): void;
	visitBlockStatement?(node: BlockStatement): void;
	visitParameter?(node: Parameter): void;
	visitTypeAnnotation?(node: TypeAnnotation): void;
	visitExpressionStatement?(node: ExpressionStatement): void;
	visitIfStatement?(node: IfStatement): void;
	visitWhileStatement?(node: WhileStatement): void;
	visitForStatement?(node: ForStatement): void;
	visitForeachStatement?(node: ForeachStatement): void;
	visitSwitchStatement?(node: SwitchStatement): void;
	visitCaseClause?(node: CaseClause): void;
	visitDoStatement?(node: DoStatement): void;
	visitReturnStatement?(node: ReturnStatement): void;
	visitBreakStatement?(node: BreakStatement): void;
	visitContinueStatement?(node: ContinueStatement): void;
	visitParallelStatement?(node: ParallelStatement): void;
	visitVoidStatement?(node: VoidStatement): void;
	visitSeparator?(node: Separator): void;
	visitCallExpression?(node: CallExpression): void;
	visitMemberExpression?(node: MemberExpression): void;
	visitIndexExpression?(node: IndexExpression): void;
	visitBinaryExpression?(node: import("./ast").BinaryExpression): void;
	visitUnaryExpression?(node: import("./ast").UnaryExpression): void;
	visitConditionalExpression?(node: ConditionalExpression): void;
	visitAssignmentExpression?(node: AssignmentExpression): void;
	visitTupleExpression?(node: TupleExpression): void;
	visitParenthesizedExpression?(node: TupleExpression): void;
}

type TraversableNode =
	| YayaProgram
	| Statement
	| Expression
	| Parameter
	| TypeAnnotation
	| CaseClause;

function traverse(node: TraversableNode, visitor: Visitor): void {
	visitor.enter?.(node);

	switch (node.type) {
		case "Program":
			visitor.visitProgram?.(node);
			traverseAll(node.body, visitor);
			break;

		case "FunctionDecl":
			visitor.visitFunctionDecl?.(node);
			traverse(node.name, visitor);
			traverseAll(node.params, visitor);
			traverse(node.body, visitor);
			if (node.returnType) {
				traverse(node.returnType, visitor);
			}
			break;

		case "VariableDecl":
			visitor.visitVariableDecl?.(node);
			traverse(node.name, visitor);
			if (node.init) {
				traverse(node.init, visitor);
			}
			if (node.typeAnnotation) {
				traverse(node.typeAnnotation, visitor);
			}
			break;

		case "BlockStatement":
			visitor.visitBlockStatement?.(node);
			traverseAll(node.body, visitor);
			break;

		case "Parameter":
			visitor.visitParameter?.(node);
			traverse(node.name, visitor);
			if (node.typeAnnotation) {
				traverse(node.typeAnnotation, visitor);
			}
			if (node.defaultValue) {
				traverse(node.defaultValue, visitor);
			}
			break;

		case "TypeAnnotation":
			visitor.visitTypeAnnotation?.(node);
			if (node.params) {
				traverseAll(node.params, visitor);
			}
			break;

		case "Identifier":
			visitor.visitIdentifier?.(node);
			break;

		case "StringLiteral":
			visitor.visitStringLiteral?.(node);
			break;

		case "NumberLiteral":
			visitor.visitNumberLiteral?.(node);
			break;

		case "BooleanLiteral":
			visitor.visitBooleanLiteral?.(node);
			break;

		case "NullLiteral":
			visitor.visitNullLiteral?.(node);
			break;

		case "ArrayLiteral":
			visitor.visitArrayLiteral?.(node);
			traverseAll(node.elements, visitor);
			break;

		case "ExpressionStatement":
			visitor.visitExpressionStatement?.(node);
			traverse(node.expression, visitor);
			break;

		case "IfStatement":
			visitor.visitIfStatement?.(node);
			traverse(node.test, visitor);
			traverse(node.consequent, visitor);
			if (node.alternate) {
				traverse(node.alternate, visitor);
			}
			break;

		case "WhileStatement":
			visitor.visitWhileStatement?.(node);
			traverse(node.test, visitor);
			traverse(node.body, visitor);
			break;

		case "ForStatement":
			visitor.visitForStatement?.(node);
			if (node.init) {
				traverse(node.init, visitor);
			}
			if (node.test) {
				traverse(node.test, visitor);
			}
			if (node.update) {
				traverse(node.update, visitor);
			}
			traverse(node.body, visitor);
			break;

		case "ForeachStatement":
			visitor.visitForeachStatement?.(node);
			traverse(node.variable, visitor);
			traverse(node.iterable, visitor);
			traverse(node.body, visitor);
			break;

		case "SwitchStatement":
			visitor.visitSwitchStatement?.(node);
			traverse(node.discriminant, visitor);
			traverseAll(node.cases, visitor);
			break;

		case "CaseClause":
			visitor.visitCaseClause?.(node);
			if (node.test) {
				traverse(node.test, visitor);
			}
			traverseAll(node.consequent, visitor);
			break;

		case "DoStatement":
			visitor.visitDoStatement?.(node);
			traverse(node.body, visitor);
			traverse(node.test, visitor);
			break;

		case "ReturnStatement":
			visitor.visitReturnStatement?.(node);
			if (node.value) {
				traverse(node.value, visitor);
			}
			break;

		case "BreakStatement":
			visitor.visitBreakStatement?.(node);
			break;

		case "ContinueStatement":
			visitor.visitContinueStatement?.(node);
			break;

		case "ParallelStatement":
			visitor.visitParallelStatement?.(node);
			traverse(node.expression, visitor);
			break;

		case "VoidStatement":
			visitor.visitVoidStatement?.(node);
			traverse(node.expression, visitor);
			break;

		case "Separator":
			visitor.visitSeparator?.(node);
			break;

		case "CallExpression":
			visitor.visitCallExpression?.(node);
			traverse(node.callee, visitor);
			traverseAll(node.arguments, visitor);
			break;

		case "MemberExpression":
			visitor.visitMemberExpression?.(node);
			traverse(node.object, visitor);
			traverse(node.property, visitor);
			break;

		case "IndexExpression":
			visitor.visitIndexExpression?.(node);
			traverse(node.object, visitor);
			traverse(node.index, visitor);
			break;

		case "BinaryExpression":
			visitor.visitBinaryExpression?.(node);
			traverse(node.left, visitor);
			traverse(node.right, visitor);
			break;

		case "UnaryExpression":
			visitor.visitUnaryExpression?.(node);
			traverse(node.operand, visitor);
			break;

		case "ConditionalExpression":
			visitor.visitConditionalExpression?.(node);
			traverse(node.test, visitor);
			traverse(node.consequent, visitor);
			traverse(node.alternate, visitor);
			break;

		case "AssignmentExpression":
			visitor.visitAssignmentExpression?.(node);
			traverse(node.left, visitor);
			traverse(node.right, visitor);
			break;

		case "TupleExpression":
			visitor.visitTupleExpression?.(node);
			if (node.elements.length === 1) {
				visitor.visitParenthesizedExpression?.(node);
			}
			traverseAll(node.elements, visitor);
			break;
	}

	visitor.exit?.(node);
}

function traverseAll(nodes: TraversableNode[], visitor: Visitor): void {
	for (const node of nodes) {
		traverse(node, visitor);
	}
}

export type { Visitor };
export { traverse, traverseAll };
