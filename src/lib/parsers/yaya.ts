import { buildDicFunction, hasVisibleText } from "@/lib/parsers/shared";
import type { Block } from "@/lib/parsers/shared";
import { lex } from "@/lib/parsers/yaya-lexer";
import type { Token } from "@/lib/parsers/yaya-lexer";
import { tokenize } from "@/lib/sakura-script/tokenize";
import type { Dialogue, DicFunction } from "@/types";

// 条件式を持つキーワード: keyword から次の lbrace までの文字列をダイアログとして扱わない
const CONDITION_KEYWORDS = new Set([
	"if",
	"elseif",
	"while",
	"for",
	"foreach",
	"switch",
	"case",
	"when",
]);

/**
 * identifier [colon identifier] [newline...] lbrace のパターンを検出する。
 * Style A (同一行) と Style B (別行) の両方に対応。
 */
function tryParseFuncDef(
	tokens: Token[],
	i: number,
): { name: string; startLine: number; braceIndex: number } | null {
	const token = tokens[i];
	if (!token || token.type !== "identifier") return null;

	let j = i + 1;

	// Optional type annotation: colon identifier
	if (tokens[j]?.type === "colon") {
		j++;
		if (tokens[j]?.type === "identifier" || tokens[j]?.type === "keyword") {
			j++;
		} else {
			return null;
		}
	}

	// Skip newlines (Style B: 関数名と { が別行)
	while (tokens[j]?.type === "newline") j++;

	if (tokens[j]?.type === "lbrace") {
		return { name: token.value, startLine: token.line, braceIndex: j };
	}

	return null;
}

function mergeControlOnlyDialogues(dialogues: Dialogue[]): Dialogue[] {
	if (dialogues.length <= 1) return dialogues;
	const result: Dialogue[] = [];
	let pendingRaw = "";
	let pendingStartLine = -1;

	for (const d of dialogues) {
		if (hasVisibleText(d)) {
			if (pendingRaw) {
				const mergedRaw = pendingRaw + d.rawText;
				result.push({
					tokens: tokenize(mergedRaw),
					startLine: pendingStartLine,
					endLine: d.endLine,
					rawText: mergedRaw,
				});
				pendingRaw = "";
				pendingStartLine = -1;
			} else {
				result.push(d);
			}
		} else {
			if (pendingStartLine === -1) pendingStartLine = d.startLine;
			pendingRaw += d.rawText;
		}
	}

	const lastDialogue = dialogues[dialogues.length - 1];
	if (pendingRaw && lastDialogue) {
		result.push({
			tokens: tokenize(pendingRaw),
			startLine: pendingStartLine,
			endLine: lastDialogue.endLine,
			rawText: pendingRaw,
		});
	}

	return result;
}

export function parseYayaDic(text: string, filePath: string): DicFunction[] {
	const tokens = lex(text);
	const results: DicFunction[] = [];
	let current: Block | null = null;
	let braceDepth = 0;
	let parenDepth = 0;
	let inCondition = false;
	let i = 0;

	while (i < tokens.length) {
		const token = tokens[i] as Token;

		if (braceDepth === 0) {
			// 関数定義の検出
			const funcDef = tryParseFuncDef(tokens, i);
			if (funcDef) {
				current = {
					name: funcDef.name,
					startLine: funcDef.startLine,
					endLine: funcDef.startLine,
					dialogues: [],
				};
				braceDepth = 1;
				parenDepth = 0;
				inCondition = false;
				i = funcDef.braceIndex + 1;
				continue;
			}

			// キーワードブロック・匿名ブロックの波括弧追跡
			if (token.type === "lbrace") braceDepth++;
			if (token.type === "rbrace" && braceDepth > 0) braceDepth--;
			i++;
			continue;
		}

		// --- ブロック内部 (braceDepth > 0) ---

		// 括弧の深度追跡
		if (token.type === "lparen") parenDepth++;
		if (token.type === "rparen" && parenDepth > 0) parenDepth--;

		// 条件式フラグの管理
		if (token.type === "keyword" && CONDITION_KEYWORDS.has(token.value)) {
			inCondition = true;
		}
		if (token.type === "newline") inCondition = false;

		// 波括弧の処理
		if (token.type === "lbrace") {
			inCondition = false;
			braceDepth++;
		} else if (token.type === "rbrace") {
			braceDepth--;
			if (braceDepth === 0 && current) {
				current.endLine = token.line;
				current.dialogues = mergeControlOnlyDialogues(current.dialogues);
				results.push(buildDicFunction(current, filePath));
				current = null;
				parenDepth = 0;
				inCondition = false;
			}
			i++;
			continue;
		}

		// ダイアログ抽出
		if (
			current &&
			token.type === "string" &&
			token.value !== "" &&
			parenDepth === 0 &&
			!inCondition
		) {
			const prev = tokens[i - 1] as Token | undefined;
			const isAtStatementStart =
				!prev || prev.type === "newline" || prev.type === "lbrace" || prev.type === "separator";
			const isAfterReturn = prev?.type === "keyword" && prev.value === "return";

			if (isAtStatementStart || isAfterReturn) {
				const sakuraTokens = tokenize(token.value);
				current.dialogues.push({
					tokens: sakuraTokens,
					startLine: token.line,
					endLine: token.line,
					rawText: token.value,
				});
			}
		}

		i++;
	}

	return results;
}
