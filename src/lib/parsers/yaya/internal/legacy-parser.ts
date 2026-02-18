import type { SourceLocation } from "../../core/ast";
import type {
	ArrayLiteral,
	BlockStatement,
	BooleanLiteral,
	BreakStatement,
	CaseClause,
	ContinueStatement,
	DoStatement,
	Expression,
	ExpressionStatement,
	ForStatement,
	ForeachStatement,
	FunctionDecl,
	Identifier,
	IfStatement,
	NullLiteral,
	NumberLiteral,
	Parameter,
	ReturnStatement,
	Separator,
	Statement,
	StringLiteral,
	SwitchStatement,
	TupleExpression,
	TypeAnnotation,
	VariableDecl,
	WhileStatement,
	YayaProgram,
} from "../ast";
import { createLoc, mergeLoc } from "../ast";
import type { Token } from "../lexer";
import { lex } from "../lexer";

const BINARY_PRECEDENCE: Record<string, number> = {
	"||": 1,
	"&&": 2,
	"==": 3,
	"!=": 3,
	":": 3,
	"<": 4,
	">": 4,
	"<=": 4,
	">=": 4,
	_in_: 4,
	"!_in_": 4,
	"+": 5,
	"-": 5,
	"*": 6,
	"/": 6,
	"%": 6,
	"::": 7,
};

const ASSIGNMENT_OPERATORS = new Set([
	"=",
	"+=",
	"-=",
	"*=",
	"/=",
	"%=",
	":=",
	"+:=",
	"-:=",
	"*:=",
	"/:=",
	"%:=",
	",=",
]);

class Parser {
	private tokens: Token[] = [];
	private pos = 0;

	parse(source: string, filePath?: string): YayaProgram {
		this.tokens = lex(source);
		this.pos = 0;

		const body: Statement[] = [];
		const startLoc = this.current().type !== "eof" ? this.currentLoc() : createLoc(0, 0);

		while (!this.isAtEnd()) {
			const stmt = this.parseStatement(true);
			if (stmt) {
				body.push(stmt);
			}
		}

		const endToken = this.prev();
		return {
			type: "Program",
			body,
			filePath,
			loc: createLoc(startLoc.start.line, startLoc.start.column, endToken?.line ?? 0, 0),
		};
	}

	private current(): Token {
		return this.tokens[this.pos] ?? this.eofToken();
	}

	private eofToken(): Token {
		const last = this.tokens[this.tokens.length - 1];
		return last ?? { type: "eof", value: "", line: 0, column: 0 };
	}

	private prev(): Token | undefined {
		return this.pos > 0 ? this.tokens[this.pos - 1] : undefined;
	}

	private peek(offset = 0): Token {
		return this.tokens[this.pos + offset] ?? this.eofToken();
	}

	private isAtEnd(): boolean {
		return this.current().type === "eof";
	}

	private advance(): Token {
		const token = this.current();
		if (!this.isAtEnd()) {
			this.pos++;
		}
		return token;
	}

	private check(type: Token["type"], value?: string): boolean {
		const token = this.current();
		if (token.type !== type) {
			return false;
		}
		if (value !== undefined && token.value !== value) {
			return false;
		}
		return true;
	}

	private match(type: Token["type"], value?: string): boolean {
		if (this.check(type, value)) {
			this.advance();
			return true;
		}
		return false;
	}

	private expect(type: Token["type"], value?: string): Token {
		if (this.match(type, value)) {
			const prev = this.prev();
			if (prev) {
				return prev;
			}
		}
		throw new Error(
			`Expected ${type}${value ? ` "${value}"` : ""} but got ${this.current().type} "${this.current().value}" at line ${this.current().line}`,
		);
	}

	private currentLoc(): SourceLocation {
		const t = this.current();
		return createLoc(t.line, t.column);
	}

	private prevLoc(): SourceLocation {
		const t = this.prev();
		return t ? createLoc(t.line, t.column) : createLoc(0, 0);
	}

	private skipNewlines(): void {
		while (this.match("newline")) {}
	}

	private isKeyword(value: string): boolean {
		return this.check("keyword", value);
	}

	private isIdentifier(value: string): boolean {
		return this.check("identifier", value);
	}

	private isFunctionDefStart(): boolean {
		if (!this.check("identifier")) {
			return false;
		}

		const next = this.peek(1);
		if (next.type === "colon") {
			const typeToken = this.peek(2);
			return typeToken.type === "identifier" || typeToken.type === "keyword";
		}
		if (next.type === "lbrace") {
			return true;
		}
		if (next.type !== "newline") {
			return false;
		}

		let offset = 1;
		while (this.peek(offset).type === "newline") {
			offset++;
		}
		return this.peek(offset).type === "lbrace";
	}

	private isExpressionStatementBoundary(): boolean {
		return (
			this.check("semicolon") ||
			this.check("newline") ||
			this.check("rbrace") ||
			this.check("separator") ||
			this.isAtEnd()
		);
	}

	private isControlBodyStartToken(): boolean {
		return (
			this.check("lbrace") ||
			this.check("semicolon") ||
			this.check("newline") ||
			this.check("separator") ||
			this.isAtEnd()
		);
	}

	private canStartExpression(token: Token): boolean {
		if (token.type === "string" || token.type === "number" || token.type === "identifier") {
			return true;
		}
		if (token.type === "keyword") {
			return token.value === "true" || token.value === "false" || token.value === "null";
		}
		if (token.type === "lparen" || token.type === "lbracket") {
			return true;
		}
		if (token.type === "operator") {
			return ["!", "-", "+", "++", "--", "&"].includes(token.value);
		}
		return false;
	}

	private createEmptyBlock(): BlockStatement {
		const loc = this.prevLoc();
		return {
			type: "BlockStatement",
			body: [],
			loc,
		};
	}

	private parseControlBody(): BlockStatement {
		this.skipNewlines();
		if (this.match("lbrace")) {
			return this.parseBlockBody();
		}
		if (this.match("semicolon")) {
			this.skipNewlines();
			if (
				this.check("rbrace") ||
				this.isAtEnd() ||
				this.isKeyword("elseif") ||
				this.isKeyword("else") ||
				this.isKeyword("when") ||
				this.isKeyword("others")
			) {
				return this.createEmptyBlock();
			}

			const stmt = this.parseStatement(false);
			if (!stmt) {
				return this.createEmptyBlock();
			}
			return {
				type: "BlockStatement",
				body: [stmt],
				loc: mergeLoc(stmt.loc ?? this.prevLoc(), stmt.loc ?? this.prevLoc()),
			};
		}

		const start = this.currentLoc();
		const stmt = this.parseStatement(false);
		if (!stmt) {
			return {
				type: "BlockStatement",
				body: [],
				loc: mergeLoc(start, this.prevLoc()),
			};
		}
		return {
			type: "BlockStatement",
			body: [stmt],
			loc: mergeLoc(start, stmt.loc ?? this.prevLoc()),
		};
	}

	private parseStatement(allowFunctionDef: boolean): Statement | null {
		this.skipNewlines();
		if (this.isAtEnd()) {
			return null;
		}

		const token = this.current();

		if (token.type === "semicolon") {
			this.advance();
			return null;
		}

		if (token.type === "separator") {
			return this.parseSeparator();
		}

		if (token.type === "keyword") {
			switch (token.value) {
				case "if":
					return this.parseIf();
				case "elseif":
					return this.parseStandaloneElseIf();
				case "while":
					return this.parseWhile();
				case "for":
					return this.parseFor();
				case "foreach":
					return this.parseForeach();
				case "switch":
					return this.parseSwitchLike("switch");
				case "case":
					return this.parseSwitchLike("case");
				case "when":
					return this.parseWhenAsIf();
				case "do":
					return this.parseDo();
				case "return":
					return this.parseReturn();
				case "break":
					return this.parseBreak();
				case "continue":
					return this.parseContinue();
				case "function":
					return this.parseFunctionDecl();
				case "var":
				case "const":
					return this.parseVariableDecl(token.value as "var" | "const");
			}
		}

		if (allowFunctionDef && this.isFunctionDefStart()) {
			return this.parseFunctionDef();
		}

		if (token.type === "lbrace") {
			return this.parseBlock();
		}

		return this.parseExpressionStatement();
	}

	private parseSeparator(): Separator {
		const start = this.currentLoc();
		this.expect("separator");
		return { type: "Separator", loc: start };
	}

	private parseFunctionDef(): FunctionDecl {
		const start = this.currentLoc();
		const name = this.parseIdentifier();

		let returnType: TypeAnnotation | undefined;
		if (this.match("colon")) {
			returnType = this.parseTypeAnnotation();
		}

		this.skipNewlines();
		this.expect("lbrace");
		const body = this.parseBlockBody();

		return {
			type: "FunctionDecl",
			name,
			params: [],
			body,
			returnType,
			loc: mergeLoc(start, this.prevLoc()),
		};
	}

	private parseFunctionDecl(): FunctionDecl {
		const start = this.currentLoc();
		this.expect("keyword", "function");

		const name = this.parseIdentifier();
		this.expect("lparen");

		const params: Parameter[] = [];
		if (!this.check("rparen")) {
			do {
				params.push(this.parseParameter());
			} while (this.match("comma"));
		}
		this.expect("rparen");

		let returnType: TypeAnnotation | undefined;
		if (this.match("colon")) {
			returnType = this.parseTypeAnnotation();
		}

		this.skipNewlines();
		this.expect("lbrace");
		const body = this.parseBlockBody();

		return {
			type: "FunctionDecl",
			name,
			params,
			body,
			returnType,
			loc: mergeLoc(start, this.prevLoc()),
		};
	}

	private parseParameter(): Parameter {
		const start = this.currentLoc();
		const name = this.parseIdentifier();

		let typeAnnotation: TypeAnnotation | undefined;
		if (this.match("colon")) {
			typeAnnotation = this.parseTypeAnnotation();
		}

		let defaultValue: Expression | undefined;
		if (this.match("operator", "=")) {
			defaultValue = this.parseExpression();
		}

		return {
			type: "Parameter",
			name,
			typeAnnotation,
			defaultValue,
			loc: mergeLoc(start, this.prevLoc()),
		};
	}

	private parseVariableDecl(kind: "var" | "const"): VariableDecl {
		const start = this.currentLoc();
		this.expect("keyword", kind);
		const name = this.parseIdentifier();

		let typeAnnotation: TypeAnnotation | undefined;
		if (this.match("colon")) {
			typeAnnotation = this.parseTypeAnnotation();
		}

		let init: Expression | undefined;
		if (this.match("operator", "=")) {
			init = this.parseExpression(() => this.isExpressionStatementBoundary());
		}

		return {
			type: "VariableDecl",
			kind,
			name,
			init,
			typeAnnotation,
			loc: mergeLoc(start, this.prevLoc()),
		};
	}

	private parseTypeAnnotation(): TypeAnnotation {
		const start = this.currentLoc();
		const nameToken = this.current();

		if (this.match("identifier") || this.match("keyword")) {
			let params: TypeAnnotation[] | undefined;
			if (this.match("operator", "<")) {
				params = [];
				do {
					params.push(this.parseTypeAnnotation());
				} while (this.match("comma"));
				this.expect("operator", ">");
			}

			return {
				type: "TypeAnnotation",
				name: nameToken.value,
				params,
				loc: mergeLoc(start, this.prevLoc()),
			};
		}

		throw new Error(`Expected type name at line ${this.current().line}`);
	}

	private parseIf(): IfStatement {
		const start = this.currentLoc();
		this.expect("keyword", "if");
		const test = this.parseConditionExpression();
		const consequent = this.parseControlBody();

		let alternate: BlockStatement | IfStatement | null = null;
		this.skipNewlines();
		if (this.match("keyword", "elseif")) {
			alternate = this.parseElseIf();
		} else if (this.match("keyword", "else")) {
			alternate = this.parseControlBody();
		}

		return {
			type: "IfStatement",
			test,
			consequent,
			alternate,
			loc: mergeLoc(start, this.prevLoc()),
		};
	}

	private parseElseIf(): IfStatement {
		const start = this.currentLoc();
		const test = this.parseConditionExpression();
		const consequent = this.parseControlBody();

		let alternate: BlockStatement | IfStatement | null = null;
		this.skipNewlines();
		if (this.match("keyword", "elseif")) {
			alternate = this.parseElseIf();
		} else if (this.match("keyword", "else")) {
			alternate = this.parseControlBody();
		}

		return {
			type: "IfStatement",
			test,
			consequent,
			alternate,
			loc: mergeLoc(start, this.prevLoc()),
		};
	}

	private parseStandaloneElseIf(): IfStatement {
		const start = this.currentLoc();
		this.expect("keyword", "elseif");
		const test = this.parseConditionExpression();
		const consequent = this.parseControlBody();

		let alternate: BlockStatement | IfStatement | null = null;
		this.skipNewlines();
		if (this.match("keyword", "elseif")) {
			alternate = this.parseElseIf();
		} else if (this.match("keyword", "else")) {
			alternate = this.parseControlBody();
		}

		return {
			type: "IfStatement",
			test,
			consequent,
			alternate,
			loc: mergeLoc(start, this.prevLoc()),
		};
	}

	private parseConditionExpression(): Expression {
		return this.parseExpression(() => this.isControlBodyStartToken() || this.check("rparen"));
	}

	private parseWhile(): WhileStatement {
		const start = this.currentLoc();
		this.expect("keyword", "while");
		const test = this.parseConditionExpression();
		const body = this.parseControlBody();

		return {
			type: "WhileStatement",
			test,
			body,
			loc: mergeLoc(start, this.prevLoc()),
		};
	}

	private parseFor(): ForStatement {
		const start = this.currentLoc();
		this.expect("keyword", "for");

		const hasParen = this.match("lparen");
		const isHeaderEnd = () => (hasParen ? this.check("rparen") : this.isControlBodyStartToken());
		const isDelimiter = () => this.check("semicolon") || (!hasParen && this.check("newline"));

		let init: Expression | VariableDecl | null = null;
		if (!isDelimiter()) {
			if (this.isKeyword("var") || this.isKeyword("const")) {
				init = this.parseVariableDecl(this.current().value as "var" | "const");
			} else {
				init = this.parseExpression(() => isDelimiter());
			}
		}
		this.consumeForDelimiter(hasParen);

		let test: Expression | null = null;
		if (!isDelimiter()) {
			test = this.parseExpression(() => isDelimiter());
		}
		this.consumeForDelimiter(hasParen);

		let update: Expression | null = null;
		if (!isHeaderEnd()) {
			update = this.parseExpression(() => isHeaderEnd() || (!hasParen && this.check("newline")));
		}
		if (hasParen) {
			this.expect("rparen");
		}
		const body = this.parseControlBody();

		return {
			type: "ForStatement",
			init,
			test,
			update,
			body,
			loc: mergeLoc(start, this.prevLoc()),
		};
	}

	private consumeForDelimiter(hasParen: boolean): void {
		if (this.match("semicolon")) {
			return;
		}
		if (!hasParen && this.match("newline")) {
			this.skipNewlines();
			return;
		}
		this.expect("semicolon");
	}

	private parseForeach(): ForeachStatement {
		const start = this.currentLoc();
		this.expect("keyword", "foreach");

		let variable: Identifier;
		let iterable: Expression;
		const hasParen = this.match("lparen");
		const headerEnd = () =>
			hasParen ? this.check("rparen") : this.isControlBodyStartToken() || this.check("rparen");

		if (
			this.check("identifier") &&
			this.peek(1).type === "keyword" &&
			this.peek(1).value === "in"
		) {
			variable = this.parseIdentifier();
			this.expect("keyword", "in");
			iterable = this.parseExpression(headerEnd);
		} else if (
			this.check("identifier") &&
			this.peek(1).type === "operator" &&
			(this.peek(1).value === "_in_" || this.peek(1).value === "!_in_")
		) {
			variable = this.parseIdentifier();
			this.expect("operator");
			iterable = this.parseExpression(headerEnd);
		} else {
			iterable = this.parseExpression(() => this.check("semicolon"));
			this.expect("semicolon");
			variable = this.parseIdentifier();
		}
		if (hasParen) {
			this.expect("rparen");
		}
		const body = this.parseControlBody();

		return {
			type: "ForeachStatement",
			variable,
			iterable,
			body,
			loc: mergeLoc(start, this.prevLoc()),
		};
	}

	private parseWhenAsIf(): IfStatement {
		const start = this.currentLoc();
		this.expect("keyword", "when");
		const test = this.normalizeWhenTest(this.parseCaseTestExpression());
		const consequent = this.parseControlBody();

		return {
			type: "IfStatement",
			test,
			consequent,
			alternate: null,
			loc: mergeLoc(start, this.prevLoc()),
		};
	}

	private parseSwitchLike(kind: "switch" | "case"): SwitchStatement {
		const start = this.currentLoc();
		this.expect("keyword", kind);

		let discriminant: Expression;
		if (this.match("lparen")) {
			discriminant = this.parseExpression(() => this.check("rparen"));
			this.expect("rparen");
		} else if (this.check("lbrace")) {
			discriminant = {
				type: "NullLiteral",
				loc: createLoc(this.current().line, this.current().column),
			} as NullLiteral;
		} else {
			discriminant = this.parseExpression(() => this.check("lbrace"));
		}

		this.skipNewlines();
		this.expect("lbrace");

		const cases: CaseClause[] = [];
		this.skipNewlines();
		while (!this.check("rbrace") && !this.isAtEnd()) {
			cases.push(this.parseCaseClause());
			this.skipNewlines();
		}
		this.expect("rbrace");

		return {
			type: "SwitchStatement",
			discriminant,
			cases,
			loc: mergeLoc(start, this.prevLoc()),
		};
	}

	private parseCaseClause(): CaseClause {
		const start = this.currentLoc();

		if (this.match("keyword", "case") || this.match("keyword", "when")) {
			const test = this.parseCaseTestExpression();
			const consequent = this.parseCaseConsequent();
			return {
				type: "CaseClause",
				test,
				consequent,
				loc: mergeLoc(start, this.prevLoc()),
			};
		}

		if (this.matchDefaultOrOthers()) {
			const consequent = this.parseCaseConsequent();
			return {
				type: "CaseClause",
				test: null,
				consequent,
				loc: mergeLoc(start, this.prevLoc()),
			};
		}

		// implicit case style: switch expr { "A" "B" }
		const test = this.parseExpression(
			() =>
				this.check("lbrace") ||
				this.check("newline") ||
				this.check("semicolon") ||
				this.isCaseClauseBoundaryToken(),
		);
		this.skipNewlines();
		return {
			type: "CaseClause",
			test,
			consequent: [],
			loc: mergeLoc(start, this.prevLoc()),
		};
	}

	private parseCaseTestExpression(): Expression {
		const tests: Expression[] = [];
		tests.push(
			this.parseExpression(
				() =>
					this.check("comma") ||
					this.check("lbrace") ||
					this.check("newline") ||
					this.check("semicolon"),
			),
		);

		while (this.match("comma")) {
			this.skipNewlines();
			tests.push(
				this.parseExpression(
					() =>
						this.check("comma") ||
						this.check("lbrace") ||
						this.check("newline") ||
						this.check("semicolon"),
				),
			);
		}

		if (tests.length === 1) {
			const only = tests[0];
			if (!only) {
				throw new Error("Case test expression is empty");
			}
			return only;
		}
		return this.createTupleFromExpressions(tests);
	}

	private normalizeWhenTest(test: Expression): Expression {
		if (test.type !== "TupleExpression" || test.elements.length < 2) {
			return test;
		}
		const first = test.elements[0];
		if (!first) {
			return test;
		}
		let current: Expression = first;
		for (let i = 1; i < test.elements.length; i++) {
			const right = test.elements[i];
			if (!right) {
				continue;
			}
			current = {
				type: "BinaryExpression",
				operator: "||",
				left: current,
				right,
				loc: mergeLoc(current.loc ?? createLoc(0, 0), right.loc ?? current.loc ?? createLoc(0, 0)),
			};
		}
		return current;
	}

	private createTupleFromExpressions(elements: Expression[]): TupleExpression {
		const firstLoc = elements[0]?.loc ?? createLoc(0, 0);
		const lastLoc = elements[elements.length - 1]?.loc ?? firstLoc;
		return {
			type: "TupleExpression",
			elements,
			loc: mergeLoc(firstLoc, lastLoc),
		};
	}

	private parseCaseConsequent(): Statement[] {
		this.skipNewlines();
		if (this.match("semicolon")) {
			return [];
		}
		if (this.match("lbrace")) {
			return this.parseBlockBody().body;
		}

		const consequent: Statement[] = [];
		while (!this.isCaseClauseBoundaryToken() && !this.isAtEnd()) {
			const stmt = this.parseStatement(false);
			if (stmt) {
				consequent.push(stmt);
			}
			this.skipNewlines();
		}
		return consequent;
	}

	private isCaseClauseBoundaryToken(): boolean {
		if (this.check("rbrace")) {
			return true;
		}
		if (
			this.isKeyword("case") ||
			this.isKeyword("when") ||
			this.isKeyword("default") ||
			this.isKeyword("others")
		) {
			return true;
		}
		if (this.isIdentifier("default") || this.isIdentifier("others")) {
			return true;
		}
		return false;
	}

	private matchDefaultOrOthers(): boolean {
		return (
			this.match("keyword", "default") ||
			this.match("keyword", "others") ||
			this.match("identifier", "default") ||
			this.match("identifier", "others")
		);
	}

	private parseDo(): DoStatement {
		const start = this.currentLoc();
		this.expect("keyword", "do");
		this.skipNewlines();
		this.expect("lbrace");
		const body = this.parseBlockBody();

		this.skipNewlines();
		this.expect("keyword", "while");
		this.expect("lparen");
		const test = this.parseExpression(() => this.check("rparen"));
		this.expect("rparen");

		return {
			type: "DoStatement",
			body,
			test,
			loc: mergeLoc(start, this.prevLoc()),
		};
	}

	private parseReturn(): ReturnStatement {
		const start = this.currentLoc();
		this.expect("keyword", "return");

		let value: Expression | null = null;
		if (
			!this.check("newline") &&
			!this.check("rbrace") &&
			!this.check("semicolon") &&
			!this.check("separator") &&
			!this.isAtEnd()
		) {
			value = this.parseExpression(() => this.isExpressionStatementBoundary());
		}
		this.match("semicolon");

		return {
			type: "ReturnStatement",
			value,
			loc: mergeLoc(start, this.prevLoc()),
		};
	}

	private parseBreak(): BreakStatement {
		const start = this.currentLoc();
		this.expect("keyword", "break");
		return { type: "BreakStatement", loc: start };
	}

	private parseContinue(): ContinueStatement {
		const start = this.currentLoc();
		this.expect("keyword", "continue");
		return { type: "ContinueStatement", loc: start };
	}

	private parseBlock(): BlockStatement {
		const start = this.currentLoc();
		this.expect("lbrace");
		const body = this.parseBlockBody();
		return { type: "BlockStatement", body: body.body, loc: mergeLoc(start, this.prevLoc()) };
	}

	private parseBlockBody(): BlockStatement {
		const start = this.currentLoc();
		const body: Statement[] = [];

		this.skipNewlines();
		while (!this.check("rbrace") && !this.isAtEnd()) {
			const stmt = this.parseStatement(false);
			if (stmt) {
				body.push(stmt);
			}
			this.skipNewlines();
		}

		this.expect("rbrace");
		return { type: "BlockStatement", body, loc: mergeLoc(start, this.prevLoc()) };
	}

	private parseExpressionStatement(): ExpressionStatement {
		const start = this.currentLoc();
		const expression = this.parseExpression(() => this.isExpressionStatementBoundary());
		this.match("semicolon");
		return { type: "ExpressionStatement", expression, loc: mergeLoc(start, this.prevLoc()) };
	}

	private parseExpression(boundary: () => boolean = () => false): Expression {
		return this.parseAssignment(boundary);
	}

	private parseAssignment(boundary: () => boolean): Expression {
		const start = this.currentLoc();
		const left = this.parseConditional(boundary);

		if (!boundary() && this.check("operator") && ASSIGNMENT_OPERATORS.has(this.current().value)) {
			const operator = this.advance().value;
			this.skipNewlines();
			const right = this.parseAssignment(boundary);
			return {
				type: "AssignmentExpression",
				operator,
				left,
				right,
				loc: mergeLoc(start, this.prevLoc()),
			};
		}

		return left;
	}

	private parseConditional(boundary: () => boolean): Expression {
		const start = this.currentLoc();
		const test = this.parseBinary(0, boundary);

		if (!boundary() && this.match("operator", "?")) {
			const consequent = this.parseExpression(() => this.check("colon"));
			this.expect("colon");
			const alternate = this.parseConditional(boundary);
			return {
				type: "ConditionalExpression",
				test,
				consequent,
				alternate,
				loc: mergeLoc(start, this.prevLoc()),
			};
		}

		return test;
	}

	private parseBinary(minPrec: number, boundary: () => boolean): Expression {
		let left = this.parseUnary(boundary);

		while (!boundary() && (this.check("operator") || this.check("colon"))) {
			const token = this.current();
			const op = token.type === "colon" ? ":" : token.value;
			const prec = BINARY_PRECEDENCE[op];
			if (prec === undefined || prec < minPrec) {
				break;
			}

			this.advance();
			const right = this.parseBinary(prec + 1, boundary);
			left = {
				type: "BinaryExpression",
				operator: op,
				left,
				right,
				loc: mergeLoc(left.loc ?? createLoc(0, 0), this.prevLoc()),
			};
		}

		return left;
	}

	private parseUnary(boundary: () => boolean): Expression {
		const start = this.currentLoc();

		if (
			!boundary() &&
			this.check("operator") &&
			["!", "-", "+", "++", "--", "&"].includes(this.current().value)
		) {
			const operator = this.advance().value;
			const operand = this.parseUnary(boundary);
			return {
				type: "UnaryExpression",
				operator,
				operand,
				prefix: true,
				loc: mergeLoc(start, this.prevLoc()),
			};
		}

		const expr = this.parsePostfix(boundary);
		if (!boundary() && this.check("operator") && ["++", "--"].includes(this.current().value)) {
			const operator = this.advance().value;
			return {
				type: "UnaryExpression",
				operator,
				operand: expr,
				prefix: false,
				loc: mergeLoc(start, this.prevLoc()),
			};
		}

		return expr;
	}

	private parsePostfix(boundary: () => boolean): Expression {
		let expr = this.parsePrimary(boundary);

		while (!boundary()) {
			if (this.match("lparen")) {
				const args = this.parseCallArguments();
				this.skipNewlines();
				this.expect("rparen");
				expr = {
					type: "CallExpression",
					callee: expr,
					arguments: args,
					loc: mergeLoc(expr.loc ?? createLoc(0, 0), this.prevLoc()),
				};
				continue;
			}

			if (this.match("lbracket")) {
				const index = this.parseBracketIndex();
				this.expect("rbracket");
				expr = {
					type: "IndexExpression",
					object: expr,
					index,
					loc: mergeLoc(expr.loc ?? createLoc(0, 0), this.prevLoc()),
				};
				continue;
			}

			if (this.match("operator", "::")) {
				const property = this.parseIdentifier();
				expr = {
					type: "MemberExpression",
					object: expr,
					property,
					loc: mergeLoc(expr.loc ?? createLoc(0, 0), this.prevLoc()),
				};
				continue;
			}

			break;
		}

		return expr;
	}

	private parseCallArguments(): Expression[] {
		const args: Expression[] = [];
		this.skipNewlines();
		if (this.check("rparen")) {
			return args;
		}

		for (;;) {
			args.push(
				this.parseExpression(
					() => this.check("comma") || this.check("rparen") || this.check("newline"),
				),
			);
			this.skipNewlines();
			if (this.match("comma")) {
				this.skipNewlines();
				continue;
			}
			if (this.check("rparen")) {
				break;
			}
			if (!this.canStartExpression(this.current())) {
				break;
			}
		}
		return args;
	}

	private parseBracketIndex(): Expression {
		const indexes: Expression[] = [];
		this.skipNewlines();
		if (!this.check("rbracket")) {
			indexes.push(this.parseExpression(() => this.check("comma") || this.check("rbracket")));
			while (this.match("comma")) {
				this.skipNewlines();
				indexes.push(this.parseExpression(() => this.check("comma") || this.check("rbracket")));
			}
		}
		if (indexes.length <= 1) {
			return indexes[0] ?? ({ type: "NullLiteral", loc: this.currentLoc() } as NullLiteral);
		}
		return this.createTupleFromExpressions(indexes);
	}

	private parsePrimary(boundary: () => boolean): Expression {
		if (boundary()) {
			const token = this.current();
			throw new Error(`Unexpected token ${token.type} "${token.value}" at line ${token.line}`);
		}

		const start = this.currentLoc();
		const token = this.current();

		if (this.match("string")) {
			return { type: "StringLiteral", value: token.value, loc: start } as StringLiteral;
		}
		if (this.match("number")) {
			return {
				type: "NumberLiteral",
				value: Number.parseFloat(token.value),
				raw: token.value,
				loc: start,
			} as NumberLiteral;
		}
		if (this.match("keyword", "true")) {
			return { type: "BooleanLiteral", value: true, loc: start } as BooleanLiteral;
		}
		if (this.match("keyword", "false")) {
			return { type: "BooleanLiteral", value: false, loc: start } as BooleanLiteral;
		}
		if (this.match("keyword", "null")) {
			return { type: "NullLiteral", loc: start } as NullLiteral;
		}
		if (this.match("identifier")) {
			return { type: "Identifier", name: token.value, loc: start } as Identifier;
		}
		if (this.match("lparen")) {
			return this.parseTuple(start);
		}
		if (this.match("lbracket")) {
			const elements: Expression[] = [];
			if (!this.check("rbracket")) {
				do {
					elements.push(this.parseExpression(() => this.check("comma") || this.check("rbracket")));
				} while (this.match("comma"));
			}
			this.expect("rbracket");
			return {
				type: "ArrayLiteral",
				elements,
				loc: mergeLoc(start, this.prevLoc()),
			} as ArrayLiteral;
		}

		throw new Error(`Unexpected token ${token.type} "${token.value}" at line ${token.line}`);
	}

	private parseTuple(start: SourceLocation): TupleExpression {
		const elements: Expression[] = [];
		this.skipNewlines();
		if (!this.check("rparen")) {
			do {
				elements.push(this.parseExpression(() => this.check("comma") || this.check("rparen")));
				this.skipNewlines();
			} while (this.match("comma"));
		}
		this.expect("rparen");

		return {
			type: "TupleExpression",
			elements,
			loc: mergeLoc(start, this.prevLoc()),
		};
	}

	private parseIdentifier(): Identifier {
		const start = this.currentLoc();
		const token = this.expect("identifier");
		return { type: "Identifier", name: token.value, loc: start };
	}
}

function parse(source: string, filePath?: string): YayaProgram {
	const parser = new Parser();
	return parser.parse(source, filePath);
}

export { Parser, parse };
