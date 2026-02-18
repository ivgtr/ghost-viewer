type TokenType =
	| "string"
	| "identifier"
	| "keyword"
	| "number"
	| "lbrace"
	| "rbrace"
	| "lparen"
	| "rparen"
	| "lbracket"
	| "rbracket"
	| "operator"
	| "separator"
	| "comma"
	| "semicolon"
	| "colon"
	| "newline"
	| "eof";

interface Token {
	type: TokenType;
	value: string;
	line: number;
	column: number;
}

const KEYWORDS = new Set([
	"if",
	"else",
	"elseif",
	"while",
	"for",
	"foreach",
	"switch",
	"case",
	"when",
	"return",
	"break",
	"continue",
	"do",
	"in",
	"function",
	"var",
	"const",
	"null",
	"true",
	"false",
]);

const THREE_CHAR_OPERATORS = new Set(["+:=", "-:=", "*:=", "/:=", "%:="]);
const TWO_CHAR_OPERATORS: Record<string, string> = {
	"==": "==",
	"!=": "!=",
	"+=": "+=",
	"-=": "-=",
	"*=": "*=",
	"/=": "/=",
	"%=": "%=",
	":=": ":=",
	"&&": "&&",
	"||": "||",
	"<=": "<=",
	">=": ">=",
	"++": "++",
	"--": "--",
	"::": "::",
};

const SINGLE_CHAR_OPERATORS = new Set(["=", "!", "+", "-", "*", "/", "%", "<", ">", "?", "&"]);

function lex(source: string): Token[] {
	const tokens: Token[] = [];
	let pos = 0;
	let line = 0;
	let column = 0;
	let atLineStart = true;

	function addToken(type: TokenType, value: string, tokenLine = line, tokenColumn = column): void {
		tokens.push({ type, value, line: tokenLine, column: tokenColumn });
	}

	function advance(): void {
		pos++;
		column++;
	}

	function advanceLine(): void {
		line++;
		column = 0;
	}

	function consumeLineEnding(): boolean {
		const ch = source.charAt(pos);
		if (ch !== "\n" && ch !== "\r") {
			return false;
		}
		if (ch === "\r" && source.charAt(pos + 1) === "\n") {
			pos++;
		}
		pos++;
		advanceLine();
		atLineStart = true;
		return true;
	}

	function parseHeredoc(quote: '"' | "'"): string {
		let delimiter = "";
		let hasInlineClosingQuote = false;
		advance();

		while (pos < source.length) {
			const c = source.charAt(pos);
			if (c === quote) {
				hasInlineClosingQuote = true;
				advance();
				break;
			}
			if (c === "\n" || c === "\r") {
				break;
			}
			delimiter += c;
			advance();
		}

		const terminator = `${quote}>>`;
		const lines: string[] = [];

		while (pos < source.length) {
			let lineContent = "";
			while (pos < source.length) {
				const c = source.charAt(pos);
				if (c === "\n" || c === "\r") {
					break;
				}
				lineContent += c;
				advance();
			}

			const trimmed = lineContent.trim();
			const hasDelimiterTerminator =
				hasInlineClosingQuote && (trimmed === delimiter || trimmed === `${delimiter}>>`);
			if (trimmed === terminator || hasDelimiterTerminator) {
				consumeLineEnding();
				return lines.join("\n");
			}

			lines.push(lineContent);
			if (!consumeLineEnding()) {
				break;
			}
		}

		return lines.join("\n");
	}

	while (pos < source.length) {
		const ch = source.charAt(pos);
		const tokenLine = line;
		const tokenColumn = column;

		if (ch === "\n" || ch === "\r") {
			if (ch === "\r" && source.charAt(pos + 1) === "\n") {
				pos++;
			}
			pos++;
			const prevLine = line;
			advanceLine();
			atLineStart = true;

			const last = tokens[tokens.length - 1];
			if (last?.type === "operator" && last.value === "/") {
				tokens.pop();
				continue;
			}
			if (last && last.type !== "newline") {
				addToken("newline", "\n", prevLine, 0);
			}
			continue;
		}

		if (ch === " " || ch === "\t") {
			advance();
			continue;
		}

		if (ch === "#" && atLineStart) {
			while (pos < source.length && source.charAt(pos) !== "\n" && source.charAt(pos) !== "\r") {
				advance();
			}
			continue;
		}
		atLineStart = false;

		if (ch === "/" && source.charAt(pos + 1) === "/") {
			while (pos < source.length && source.charAt(pos) !== "\n" && source.charAt(pos) !== "\r") {
				advance();
			}
			continue;
		}

		if (ch === "/" && source.charAt(pos + 1) === "*") {
			advance();
			advance();
			while (pos < source.length) {
				if (source.charAt(pos) === "*" && source.charAt(pos + 1) === "/") {
					advance();
					advance();
					break;
				}
				if (source.charAt(pos) === "\n" || source.charAt(pos) === "\r") {
					consumeLineEnding();
				} else {
					advance();
				}
			}
			continue;
		}

		if (ch === '"' || ch === "'") {
			const quote = ch;
			let value = "";
			advance();
			while (
				pos < source.length &&
				source.charAt(pos) !== quote &&
				source.charAt(pos) !== "\n" &&
				source.charAt(pos) !== "\r"
			) {
				const current = source.charAt(pos);
				const next = source.charAt(pos + 1);
				if (
					quote === '"' &&
					current === "\\" &&
					next === quote &&
					hasRemainingQuote(source, pos + 2, quote)
				) {
					value += quote;
					advance();
					advance();
					continue;
				}
				value += current;
				advance();
			}
			if (pos < source.length && source.charAt(pos) === quote) {
				advance();
			}
			addToken("string", value, tokenLine, tokenColumn);
			continue;
		}

		if (ch === "<" && source.charAt(pos + 1) === "<") {
			advance();
			advance();
			const delimiterQuote = source.charAt(pos);
			if (delimiterQuote === '"' || delimiterQuote === "'") {
				const heredoc = parseHeredoc(delimiterQuote);
				addToken("string", heredoc, tokenLine, tokenColumn);
				continue;
			}
			addToken("operator", "<<", tokenLine, tokenColumn);
			continue;
		}

		if (ch === "{") {
			addToken("lbrace", "{", tokenLine, tokenColumn);
			advance();
			continue;
		}
		if (ch === "}") {
			addToken("rbrace", "}", tokenLine, tokenColumn);
			advance();
			continue;
		}
		if (ch === "(") {
			addToken("lparen", "(", tokenLine, tokenColumn);
			advance();
			continue;
		}
		if (ch === ")") {
			addToken("rparen", ")", tokenLine, tokenColumn);
			advance();
			continue;
		}
		if (ch === "[") {
			addToken("lbracket", "[", tokenLine, tokenColumn);
			advance();
			continue;
		}
		if (ch === "]") {
			addToken("rbracket", "]", tokenLine, tokenColumn);
			advance();
			continue;
		}

		if (ch === ",") {
			if (source.charAt(pos + 1) === "=") {
				addToken("operator", ",=", tokenLine, tokenColumn);
				advance();
				advance();
				continue;
			}
			addToken("comma", ",", tokenLine, tokenColumn);
			advance();
			continue;
		}

		if (ch === ";") {
			addToken("semicolon", ";", tokenLine, tokenColumn);
			advance();
			continue;
		}

		if (source.startsWith("!_in_", pos)) {
			addToken("operator", "!_in_", tokenLine, tokenColumn);
			for (let i = 0; i < 5; i++) {
				advance();
			}
			continue;
		}

		if (ch === "-" && source.charAt(pos + 1) === "-") {
			addToken("separator", "--", tokenLine, tokenColumn);
			advance();
			advance();
			continue;
		}

		const threeChar = `${ch}${source.charAt(pos + 1)}${source.charAt(pos + 2)}`;
		if (THREE_CHAR_OPERATORS.has(threeChar)) {
			addToken("operator", threeChar, tokenLine, tokenColumn);
			advance();
			advance();
			advance();
			continue;
		}

		const twoChar = `${ch}${source.charAt(pos + 1)}`;
		const twoCharOp = TWO_CHAR_OPERATORS[twoChar];
		if (twoCharOp) {
			addToken("operator", twoCharOp, tokenLine, tokenColumn);
			advance();
			advance();
			continue;
		}

		if (ch === ":") {
			addToken("colon", ":", tokenLine, tokenColumn);
			advance();
			continue;
		}

		if (SINGLE_CHAR_OPERATORS.has(ch)) {
			addToken("operator", ch, tokenLine, tokenColumn);
			advance();
			continue;
		}

		if (isDigit(ch)) {
			const num = readNumber(
				source,
				() => ({ pos, line, column }),
				(nextPos, nextColumn) => {
					pos = nextPos;
					column = nextColumn;
				},
			);
			addToken("number", num.value, tokenLine, tokenColumn);
			continue;
		}

		if (isIdentifierStart(ch)) {
			let ident = "";
			while (pos < source.length && isIdentifierPart(source.charAt(pos))) {
				ident += source.charAt(pos);
				advance();
			}
			if (ident === "_in_") {
				addToken("operator", "_in_", tokenLine, tokenColumn);
			} else if (KEYWORDS.has(ident)) {
				addToken("keyword", ident, tokenLine, tokenColumn);
			} else {
				addToken("identifier", ident, tokenLine, tokenColumn);
			}
			continue;
		}

		advance();
	}

	tokens.push({ type: "eof", value: "", line, column });
	return tokens;
}

function isDigit(ch: string): boolean {
	return ch >= "0" && ch <= "9";
}

function readNumber(
	source: string,
	getPos: () => { pos: number; line: number; column: number },
	setPos: (nextPos: number, nextColumn: number) => void,
): { value: string } {
	let { pos, column } = getPos();
	let value = "";

	if (
		source.charAt(pos) === "0" &&
		(source.charAt(pos + 1) === "x" || source.charAt(pos + 1) === "X")
	) {
		value += source.charAt(pos);
		value += source.charAt(pos + 1);
		pos += 2;
		column += 2;
		while (pos < source.length && /[0-9a-fA-F]/u.test(source.charAt(pos))) {
			value += source.charAt(pos);
			pos++;
			column++;
		}
		setPos(pos, column);
		return { value };
	}

	if (
		source.charAt(pos) === "0" &&
		(source.charAt(pos + 1) === "b" || source.charAt(pos + 1) === "B")
	) {
		value += source.charAt(pos);
		value += source.charAt(pos + 1);
		pos += 2;
		column += 2;
		while (pos < source.length && /[01]/u.test(source.charAt(pos))) {
			value += source.charAt(pos);
			pos++;
			column++;
		}
		setPos(pos, column);
		return { value };
	}

	let dotSeen = false;
	while (pos < source.length) {
		const ch = source.charAt(pos);
		if (isDigit(ch)) {
			value += ch;
			pos++;
			column++;
			continue;
		}
		if (ch === "." && !dotSeen) {
			dotSeen = true;
			value += ch;
			pos++;
			column++;
			continue;
		}
		break;
	}

	setPos(pos, column);
	return { value };
}

function isIdentifierStart(ch: string): boolean {
	if (ch.length === 0) {
		return false;
	}
	if (/\s/u.test(ch)) {
		return false;
	}
	if ("{}()[],:;\"'".includes(ch)) {
		return false;
	}
	if (SINGLE_CHAR_OPERATORS.has(ch)) {
		return false;
	}
	return true;
}

function isIdentifierPart(ch: string): boolean {
	if (ch.length === 0) {
		return false;
	}
	if (/\s/u.test(ch)) {
		return false;
	}
	if ("{}()[],:;\"'".includes(ch)) {
		return false;
	}
	if (SINGLE_CHAR_OPERATORS.has(ch)) {
		return false;
	}
	return true;
}

function hasRemainingQuote(source: string, from: number, quote: string): boolean {
	for (let i = from; i < source.length; i++) {
		const ch = source.charAt(i);
		if (ch === "\n" || ch === "\r") {
			return false;
		}
		if (ch === quote) {
			return true;
		}
	}
	return false;
}

export type { Token, TokenType };

export { KEYWORDS, lex };
