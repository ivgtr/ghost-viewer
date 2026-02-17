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
	| "newline";

interface Token {
	type: TokenType;
	value: string;
	line: number;
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
]);

export function lex(source: string): Token[] {
	const tokens: Token[] = [];
	let pos = 0;
	let line = 0;
	let atLineStart = true;

	while (pos < source.length) {
		const ch = source.charAt(pos);

		// Newline
		if (ch === "\n" || ch === "\r") {
			if (ch === "\r" && source.charAt(pos + 1) === "\n") pos++;
			pos++;
			line++;
			atLineStart = true;

			// Line continuation: consume trailing "/" and suppress newline
			const last = tokens[tokens.length - 1];
			if (last?.type === "operator" && last.value === "/") {
				tokens.pop();
				continue;
			}

			// Emit newline (collapse consecutive)
			if (last && last.type !== "newline") {
				tokens.push({ type: "newline", value: "\n", line: line - 1 });
			}
			continue;
		}

		// Whitespace
		if (ch === " " || ch === "\t") {
			pos++;
			continue;
		}

		// Preprocessor directive (# at line start)
		if (ch === "#" && atLineStart) {
			while (pos < source.length && source.charAt(pos) !== "\n" && source.charAt(pos) !== "\r")
				pos++;
			continue;
		}

		atLineStart = false;

		// Line comment
		if (ch === "/" && source.charAt(pos + 1) === "/") {
			while (pos < source.length && source.charAt(pos) !== "\n" && source.charAt(pos) !== "\r")
				pos++;
			continue;
		}

		// Block comment
		if (ch === "/" && source.charAt(pos + 1) === "*") {
			pos += 2;
			while (pos < source.length) {
				if (source.charAt(pos) === "*" && source.charAt(pos + 1) === "/") {
					pos += 2;
					break;
				}
				if (source.charAt(pos) === "\n") {
					line++;
				} else if (source.charAt(pos) === "\r") {
					line++;
					if (source.charAt(pos + 1) === "\n") pos++;
				}
				pos++;
			}
			continue;
		}

		// String literal
		if (ch === '"' || ch === "'") {
			const quote = ch;
			let value = "";
			pos++;
			while (
				pos < source.length &&
				source.charAt(pos) !== quote &&
				source.charAt(pos) !== "\n" &&
				source.charAt(pos) !== "\r"
			) {
				if (source.charAt(pos) === "\\") {
					pos++;
					if (pos >= source.length) break;
					const esc = source.charAt(pos);
					if (esc === quote) {
						value += quote;
					} else {
						value += `\\${esc}`;
					}
				} else {
					value += source.charAt(pos);
				}
				pos++;
			}
			if (pos < source.length && source.charAt(pos) === quote) pos++;
			tokens.push({ type: "string", value, line });
			continue;
		}

		// Braces, brackets, parens
		if (ch === "{") {
			tokens.push({ type: "lbrace", value: "{", line });
			pos++;
			continue;
		}
		if (ch === "}") {
			tokens.push({ type: "rbrace", value: "}", line });
			pos++;
			continue;
		}
		if (ch === "(") {
			tokens.push({ type: "lparen", value: "(", line });
			pos++;
			continue;
		}
		if (ch === ")") {
			tokens.push({ type: "rparen", value: ")", line });
			pos++;
			continue;
		}
		if (ch === "[") {
			tokens.push({ type: "lbracket", value: "[", line });
			pos++;
			continue;
		}
		if (ch === "]") {
			tokens.push({ type: "rbracket", value: "]", line });
			pos++;
			continue;
		}

		// Comma, semicolon, colon
		if (ch === ",") {
			tokens.push({ type: "comma", value: ",", line });
			pos++;
			continue;
		}
		if (ch === ";") {
			tokens.push({ type: "semicolon", value: ";", line });
			pos++;
			continue;
		}
		if (ch === ":") {
			tokens.push({ type: "colon", value: ":", line });
			pos++;
			continue;
		}

		// Separator: --
		if (ch === "-" && source.charAt(pos + 1) === "-") {
			tokens.push({ type: "separator", value: "--", line });
			pos += 2;
			continue;
		}

		// Two-character operators
		const next = source.charAt(pos + 1);
		if (ch === "=" && next === "=") {
			tokens.push({ type: "operator", value: "==", line });
			pos += 2;
			continue;
		}
		if (ch === "!" && next === "=") {
			tokens.push({ type: "operator", value: "!=", line });
			pos += 2;
			continue;
		}
		if (ch === "+" && next === "=") {
			tokens.push({ type: "operator", value: "+=", line });
			pos += 2;
			continue;
		}
		if (ch === "-" && next === "=") {
			tokens.push({ type: "operator", value: "-=", line });
			pos += 2;
			continue;
		}
		if (ch === "*" && next === "=") {
			tokens.push({ type: "operator", value: "*=", line });
			pos += 2;
			continue;
		}
		if (ch === "/" && next === "=") {
			tokens.push({ type: "operator", value: "/=", line });
			pos += 2;
			continue;
		}
		if (ch === "%" && next === "=") {
			tokens.push({ type: "operator", value: "%=", line });
			pos += 2;
			continue;
		}
		if (ch === "&" && next === "&") {
			tokens.push({ type: "operator", value: "&&", line });
			pos += 2;
			continue;
		}
		if (ch === "|" && next === "|") {
			tokens.push({ type: "operator", value: "||", line });
			pos += 2;
			continue;
		}
		if (ch === "<" && next === "=") {
			tokens.push({ type: "operator", value: "<=", line });
			pos += 2;
			continue;
		}
		if (ch === ">" && next === "=") {
			tokens.push({ type: "operator", value: ">=", line });
			pos += 2;
			continue;
		}

		// Single-character operators
		if ("=!+-*/%<>".includes(ch)) {
			tokens.push({ type: "operator", value: ch, line });
			pos++;
			continue;
		}

		// Number
		if (ch >= "0" && ch <= "9") {
			let num = "";
			let c = source.charAt(pos);
			while (pos < source.length && ((c >= "0" && c <= "9") || c === ".")) {
				num += c;
				pos++;
				c = source.charAt(pos);
			}
			tokens.push({ type: "number", value: num, line });
			continue;
		}

		// Identifier or keyword
		if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_" || ch === ".") {
			let ident = "";
			let c = source.charAt(pos);
			while (pos < source.length && isIdentChar(c)) {
				ident += c;
				pos++;
				c = source.charAt(pos);
			}
			if (ident === "_in_") {
				tokens.push({ type: "operator", value: "_in_", line });
			} else if (KEYWORDS.has(ident)) {
				tokens.push({ type: "keyword", value: ident, line });
			} else {
				tokens.push({ type: "identifier", value: ident, line });
			}
			continue;
		}

		// Unknown character: skip
		pos++;
	}

	return tokens;
}

function isIdentChar(ch: string): boolean {
	return (
		(ch >= "a" && ch <= "z") ||
		(ch >= "A" && ch <= "Z") ||
		(ch >= "0" && ch <= "9") ||
		ch === "_" ||
		ch === "."
	);
}

export type { Token, TokenType };
