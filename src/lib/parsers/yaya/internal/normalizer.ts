import type { BodyToken, ClassifiedProgram, NormalizedFunction, NormalizedProgram } from "./types";

function normalizeProgram(program: ClassifiedProgram): NormalizedProgram {
	const functions = program.functions.map((fn) => normalizeFunction(fn));
	return {
		functions,
		separators: program.separators,
	};
}

function normalizeFunction(fn: ClassifiedProgram["functions"][number]): NormalizedFunction {
	const mergedLoopHeaders = mergeLoopHeaders(fn.bodyTokens, fn.line);
	const switchNormalized = normalizeImplicitSwitchClauses(mergedLoopHeaders);
	validateControlHeaders(switchNormalized, fn.line);
	return {
		name: fn.name,
		returnType: fn.returnType,
		bodyTokens: switchNormalized,
		line: fn.line,
		endLine: fn.endLine,
	};
}

function createBodyToken(text: string, line: number): BodyToken {
	return { text, line };
}

function mergeLoopHeaders(tokens: BodyToken[], baseLine: number): BodyToken[] {
	const out: BodyToken[] = [];

	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (!token) {
			continue;
		}

		const head = firstWord(token.text);

		if (head === "for") {
			const part1 = token.text.slice(head.length).trim();
			const inlineClauses = splitForClauses(part1);
			if (inlineClauses) {
				out.push(
					createBodyToken(
						`for ${inlineClauses[0]} ; ${inlineClauses[1]} ; ${inlineClauses[2]}`,
						token.line,
					),
				);
				continue;
			}

			const part2 = tokens[i + 1];
			const part3 = tokens[i + 2];
			if (
				!part2 ||
				!part3 ||
				part2.text === "{" ||
				part3.text === "{" ||
				part2.text === "}" ||
				part3.text === "}"
			) {
				throw new Error(`Invalid for header near line ${baseLine}`);
			}
			out.push(
				createBodyToken(
					`for ${part1} ; ${part2.text.trim()} ; ${part3.text.trim()}`.trim(),
					token.line,
				),
			);
			i += 2;
			continue;
		}

		if (head === "foreach") {
			const body = token.text.slice(head.length).trim();
			const inline = splitForeachClauses(body);
			if (inline) {
				out.push(createBodyToken(`foreach ${inline[0]} ; ${inline[1]}`, token.line));
				continue;
			}

			if (hasForeachOperator(body)) {
				out.push(token);
				continue;
			}

			const next = tokens[i + 1];
			if (!next || next.text === "{" || next.text === "}") {
				throw new Error(`Invalid foreach header near line ${baseLine}`);
			}
			out.push(createBodyToken(`foreach ${body} ; ${next.text.trim()}`.trim(), token.line));
			i += 1;
			continue;
		}

		out.push(token);
	}

	return out;
}

function splitForClauses(rawBody: string): [string, string, string] | null {
	const body = stripOuterParentheses(rawBody);
	const clauses = splitUnquotedClauses(body);
	if (clauses.length !== 3) {
		return null;
	}

	const first = clauses[0];
	const second = clauses[1];
	const third = clauses[2];
	if (first === undefined || second === undefined || third === undefined) {
		return null;
	}
	return [first, second, third];
}

function splitForeachClauses(rawBody: string): [string, string] | null {
	if (hasForeachOperator(rawBody)) {
		return null;
	}
	const clauses = splitUnquotedClauses(rawBody);
	if (clauses.length !== 2) {
		return null;
	}

	const first = clauses[0];
	const second = clauses[1];
	if (first === undefined || second === undefined) {
		return null;
	}
	return [first, second];
}

function stripOuterParentheses(text: string): string {
	const trimmed = text.trim();
	if (!trimmed.startsWith("(") || !trimmed.endsWith(")")) {
		return trimmed;
	}

	let depth = 0;
	let inSingle = false;
	let inDouble = false;
	for (let i = 0; i < trimmed.length; i++) {
		const ch = trimmed[i];
		if (ch === "'" && !inDouble) {
			inSingle = !inSingle;
			continue;
		}
		if (ch === '"' && !inSingle) {
			inDouble = !inDouble;
			continue;
		}
		if (inSingle || inDouble) {
			continue;
		}
		if (ch === "(") {
			depth++;
		} else if (ch === ")") {
			depth--;
			if (depth === 0 && i !== trimmed.length - 1) {
				return trimmed;
			}
		}
	}

	return depth === 0 ? trimmed.slice(1, -1).trim() : trimmed;
}

function splitUnquotedClauses(text: string): string[] {
	const clauses: string[] = [];
	let buffer = "";
	let inSingle = false;
	let inDouble = false;
	let parenDepth = 0;
	let bracketDepth = 0;

	const flush = () => {
		const clause = buffer.trim();
		if (clause.length > 0) {
			clauses.push(clause);
		}
		buffer = "";
	};

	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		const next = text[i + 1] ?? "";

		if ((inSingle || inDouble) && ch === "\\") {
			buffer += ch;
			if (next.length > 0) {
				buffer += next;
				i++;
			}
			continue;
		}

		if (ch === "'" && !inDouble) {
			inSingle = !inSingle;
			buffer += ch;
			continue;
		}
		if (ch === '"' && !inSingle) {
			inDouble = !inDouble;
			buffer += ch;
			continue;
		}

		if (!inSingle && !inDouble) {
			if (ch === "(") {
				parenDepth++;
			} else if (ch === ")") {
				parenDepth = Math.max(0, parenDepth - 1);
			} else if (ch === "[") {
				bracketDepth++;
			} else if (ch === "]") {
				bracketDepth = Math.max(0, bracketDepth - 1);
			}

			if ((ch === ";" || ch === "\n" || ch === "\r") && parenDepth === 0 && bracketDepth === 0) {
				flush();
				continue;
			}
		}

		buffer += ch;
	}

	flush();
	return clauses;
}

interface SwitchContext {
	type: string;
	pendingImplicit: BodyToken[];
}

function normalizeImplicitSwitchClauses(tokens: BodyToken[]): BodyToken[] {
	const out: BodyToken[] = [];
	const stack: SwitchContext[] = [{ type: "root", pendingImplicit: [] }];

	for (const token of tokens) {
		const current = stack[stack.length - 1];
		if (!current) {
			continue;
		}

		if (token.text === "{") {
			if (current.type === "switch" && current.pendingImplicit.length > 0) {
				const firstPending = current.pendingImplicit[0];
				out.push(
					createBodyToken(
						`when ${current.pendingImplicit.map((pending) => pending.text).join(",")}`,
						firstPending?.line ?? token.line,
					),
				);
				current.pendingImplicit = [];
			}
			out.push(token);
			stack.push({ type: detectBlockOwner(out), pendingImplicit: [] });
			continue;
		}

		if (token.text === "}") {
			if (current.type === "switch" && current.pendingImplicit.length > 0) {
				for (const pending of current.pendingImplicit) {
					out.push(pending);
				}
				current.pendingImplicit = [];
			}
			if (stack.length > 1) {
				stack.pop();
			}
			out.push(token);
			continue;
		}

		if (current.type === "switch") {
			if (isSwitchClauseKeyword(token.text)) {
				for (const pending of current.pendingImplicit) {
					out.push(pending);
				}
				current.pendingImplicit = [];
				out.push(token);
			} else {
				current.pendingImplicit.push(token);
			}
			continue;
		}

		out.push(token);
	}

	return out;
}

function detectBlockOwner(tokens: BodyToken[]): string {
	for (let i = tokens.length - 2; i >= 0; i--) {
		const token = tokens[i];
		if (!token || token.text === "{" || token.text === "}") {
			continue;
		}
		const head = firstWord(token.text);
		if (head.length > 0) {
			return head;
		}
	}
	return "block";
}

function isSwitchClauseKeyword(token: string): boolean {
	const head = firstWord(token);
	return head === "case" || head === "when" || head === "default" || head === "others";
}

function hasForeachOperator(body: string): boolean {
	return /\s(?:in|_in_|!_in_)\s/u.test(body);
}

function validateControlHeaders(tokens: BodyToken[], line: number): void {
	for (const token of tokens) {
		const head = firstWord(token.text);
		if (head === "for") {
			const semicolons = (token.text.match(/;/g) ?? []).length;
			if (semicolons !== 2) {
				throw new Error(`Invalid for header near line ${line}`);
			}
		}
		if (head === "foreach") {
			const body = token.text.slice(head.length).trim();
			if (!hasForeachOperator(body) && !body.includes(";")) {
				throw new Error(`Invalid foreach header near line ${line}`);
			}
		}
	}
}

function firstWord(text: string): string {
	const trimmed = text.trimStart();
	const match = /^[^\s]+/u.exec(trimmed);
	return match ? match[0] : "";
}

export { normalizeProgram };
