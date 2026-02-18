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
	Parameter,
	ReturnStatement,
	Separator,
	StringLiteral,
	SwitchStatement,
	TupleExpression,
	TypeAnnotation,
	VariableDecl,
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

function traverse(node: BaseNode, visitor: Visitor): void {
	visitor.enter?.(node);

	switch (node.type) {
		case "Program":
			visitor.visitProgram?.(node as YayaProgram);
			traverseAll((node as YayaProgram).body, visitor);
			break;

		case "FunctionDecl": {
			const fn = node as FunctionDecl;
			visitor.visitFunctionDecl?.(fn);
			traverse(fn.name, visitor);
			traverseAll(fn.params, visitor);
			traverse(fn.body, visitor);
			if (fn.returnType) traverse(fn.returnType, visitor);
			break;
		}

		case "VariableDecl": {
			const decl = node as VariableDecl;
			visitor.visitVariableDecl?.(decl);
			traverse(decl.name, visitor);
			if (decl.init) traverse(decl.init, visitor);
			if (decl.typeAnnotation) traverse(decl.typeAnnotation, visitor);
			break;
		}

		case "BlockStatement": {
			const block = node as BlockStatement;
			visitor.visitBlockStatement?.(block);
			traverseAll(block.body, visitor);
			break;
		}

		case "Parameter": {
			const param = node as Parameter;
			visitor.visitParameter?.(param);
			traverse(param.name, visitor);
			if (param.typeAnnotation) traverse(param.typeAnnotation, visitor);
			if (param.defaultValue) traverse(param.defaultValue, visitor);
			break;
		}

		case "TypeAnnotation": {
			const type = node as TypeAnnotation;
			visitor.visitTypeAnnotation?.(type);
			if (type.params) traverseAll(type.params, visitor);
			break;
		}

		case "Identifier":
			visitor.visitIdentifier?.(node as Identifier);
			break;

		case "StringLiteral":
			visitor.visitStringLiteral?.(node as StringLiteral);
			break;

		case "NumberLiteral":
			visitor.visitNumberLiteral?.(node as NumberLiteral);
			break;

		case "BooleanLiteral":
			visitor.visitBooleanLiteral?.(node as BooleanLiteral);
			break;

		case "NullLiteral":
			visitor.visitNullLiteral?.(node as NullLiteral);
			break;

		case "ArrayLiteral": {
			const arr = node as ArrayLiteral;
			visitor.visitArrayLiteral?.(arr);
			traverseAll(arr.elements, visitor);
			break;
		}

		case "ExpressionStatement": {
			const stmt = node as ExpressionStatement;
			visitor.visitExpressionStatement?.(stmt);
			traverse(stmt.expression, visitor);
			break;
		}

		case "IfStatement": {
			const ifStmt = node as IfStatement;
			visitor.visitIfStatement?.(ifStmt);
			traverse(ifStmt.test, visitor);
			traverse(ifStmt.consequent, visitor);
			if (ifStmt.alternate) traverse(ifStmt.alternate, visitor);
			break;
		}

		case "WhileStatement": {
			const whileStmt = node as WhileStatement;
			visitor.visitWhileStatement?.(whileStmt);
			traverse(whileStmt.test, visitor);
			traverse(whileStmt.body, visitor);
			break;
		}

		case "ForStatement": {
			const forStmt = node as ForStatement;
			visitor.visitForStatement?.(forStmt);
			if (forStmt.init) traverse(forStmt.init, visitor);
			if (forStmt.test) traverse(forStmt.test, visitor);
			if (forStmt.update) traverse(forStmt.update, visitor);
			traverse(forStmt.body, visitor);
			break;
		}

		case "ForeachStatement": {
			const foreachStmt = node as ForeachStatement;
			visitor.visitForeachStatement?.(foreachStmt);
			traverse(foreachStmt.variable, visitor);
			traverse(foreachStmt.iterable, visitor);
			traverse(foreachStmt.body, visitor);
			break;
		}

		case "SwitchStatement": {
			const switchStmt = node as SwitchStatement;
			visitor.visitSwitchStatement?.(switchStmt);
			traverse(switchStmt.discriminant, visitor);
			traverseAll(switchStmt.cases, visitor);
			break;
		}

		case "CaseClause": {
			const caseClause = node as CaseClause;
			visitor.visitCaseClause?.(caseClause);
			if (caseClause.test) traverse(caseClause.test, visitor);
			traverseAll(caseClause.consequent, visitor);
			break;
		}

		case "DoStatement": {
			const doStmt = node as DoStatement;
			visitor.visitDoStatement?.(doStmt);
			traverse(doStmt.body, visitor);
			traverse(doStmt.test, visitor);
			break;
		}

		case "ReturnStatement": {
			const ret = node as ReturnStatement;
			visitor.visitReturnStatement?.(ret);
			if (ret.value) traverse(ret.value, visitor);
			break;
		}

		case "BreakStatement":
			visitor.visitBreakStatement?.(node as BreakStatement);
			break;

		case "ContinueStatement":
			visitor.visitContinueStatement?.(node as ContinueStatement);
			break;

		case "Separator":
			visitor.visitSeparator?.(node as Separator);
			break;

		case "CallExpression": {
			const call = node as CallExpression;
			visitor.visitCallExpression?.(call);
			traverse(call.callee, visitor);
			traverseAll(call.arguments, visitor);
			break;
		}

		case "MemberExpression": {
			const member = node as MemberExpression;
			visitor.visitMemberExpression?.(member);
			traverse(member.object, visitor);
			traverse(member.property, visitor);
			break;
		}

		case "IndexExpression": {
			const index = node as IndexExpression;
			visitor.visitIndexExpression?.(index);
			traverse(index.object, visitor);
			traverse(index.index, visitor);
			break;
		}

		case "BinaryExpression": {
			const binary = node as import("./ast").BinaryExpression;
			visitor.visitBinaryExpression?.(binary);
			traverse(binary.left, visitor);
			traverse(binary.right, visitor);
			break;
		}

		case "UnaryExpression": {
			const unary = node as import("./ast").UnaryExpression;
			visitor.visitUnaryExpression?.(unary);
			traverse(unary.operand, visitor);
			break;
		}

		case "ConditionalExpression": {
			const cond = node as ConditionalExpression;
			visitor.visitConditionalExpression?.(cond);
			traverse(cond.test, visitor);
			traverse(cond.consequent, visitor);
			traverse(cond.alternate, visitor);
			break;
		}

		case "AssignmentExpression": {
			const assign = node as AssignmentExpression;
			visitor.visitAssignmentExpression?.(assign);
			traverse(assign.left, visitor);
			traverse(assign.right, visitor);
			break;
		}

		case "TupleExpression": {
			const tuple = node as TupleExpression;
			visitor.visitTupleExpression?.(tuple);
			if (tuple.elements.length === 1) {
				visitor.visitParenthesizedExpression?.(tuple);
			}
			traverseAll(tuple.elements, visitor);
			break;
		}
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
