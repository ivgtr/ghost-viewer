import type { ParseDiagnostic } from "@/types";

interface YayaPreprocessorDefine {
	key: string;
	value: string;
	filePath: string;
	line: number;
}

interface YayaPreprocessState {
	globalDefines: YayaPreprocessorDefine[];
}

interface YayaPreprocessOptions {
	filePath: string;
	state?: YayaPreprocessState;
}

interface YayaPreprocessResult {
	source: string;
	diagnostics: ParseDiagnostic[];
	state: YayaPreprocessState;
}

const INTERNAL_FILE_MACRO = "__AYA_SYSTEM_FILE__";
const INTERNAL_LINE_MACRO = "__AYA_SYSTEM_LINE__";

function createYayaPreprocessState(): YayaPreprocessState {
	return {
		globalDefines: [],
	};
}

function preprocessYayaSource(
	source: string,
	options: YayaPreprocessOptions,
): YayaPreprocessResult {
	const diagnostics: ParseDiagnostic[] = [];
	const state = options.state ?? createYayaPreprocessState();
	const localDefines: YayaPreprocessorDefine[] = [];
	const normalizedFilePath = normalizeFilePath(options.filePath);
	const lines = source.split("\n");
	const output: string[] = [];

	for (const [line, rawLine] of lines.entries()) {
		const directive = parseDirective(rawLine);
		if (directive) {
			handleDirective(
				directive,
				localDefines,
				state.globalDefines,
				diagnostics,
				options.filePath,
				line,
			);
			output.push("");
			continue;
		}

		let expanded = rawLine;
		expanded = applyDefines(expanded, localDefines);
		expanded = applyDefines(expanded, state.globalDefines);
		expanded = applyInternalMacros(expanded, normalizedFilePath, line);
		output.push(expanded);
	}

	return {
		source: output.join("\n"),
		diagnostics,
		state,
	};
}

function normalizeFilePath(filePath: string): string {
	return filePath.replace(/\\/gu, "/");
}

interface ParsedDirective {
	name: string;
	body: string;
}

function parseDirective(line: string): ParsedDirective | null {
	const trimmedStart = line.trimStart();
	if (!trimmedStart.startsWith("#")) {
		return null;
	}

	const firstSpace = trimmedStart.search(/\s/u);
	if (firstSpace < 0) {
		return {
			name: trimmedStart,
			body: "",
		};
	}

	return {
		name: trimmedStart.slice(0, firstSpace),
		body: trimmedStart.slice(firstSpace + 1).trim(),
	};
}

function handleDirective(
	directive: ParsedDirective,
	localDefines: YayaPreprocessorDefine[],
	globalDefines: YayaPreprocessorDefine[],
	diagnostics: ParseDiagnostic[],
	filePath: string,
	line: number,
): void {
	switch (directive.name) {
		case "#define": {
			const definition = parseDefineBody(directive.body);
			if (!definition) {
				diagnostics.push({
					level: "warning",
					code: "YAYA_PREPROCESS_INVALID_DEFINE",
					message: "#define の形式が不正です",
					filePath,
					line,
				});
				return;
			}
			upsertDefine(localDefines, {
				key: definition.key,
				value: definition.value,
				filePath,
				line,
			});
			return;
		}

		case "#globaldefine": {
			const definition = parseDefineBody(directive.body);
			if (!definition) {
				diagnostics.push({
					level: "warning",
					code: "YAYA_PREPROCESS_INVALID_GLOBALDEFINE",
					message: "#globaldefine の形式が不正です",
					filePath,
					line,
				});
				return;
			}
			upsertDefine(globalDefines, {
				key: definition.key,
				value: definition.value,
				filePath,
				line,
			});
			return;
		}

		default:
			diagnostics.push({
				level: "warning",
				code: "YAYA_PREPROCESS_UNKNOWN_DIRECTIVE",
				message: `未対応のプリプロセッサ指令です: ${directive.name}`,
				filePath,
				line,
			});
	}
}

function parseDefineBody(body: string): { key: string; value: string } | null {
	if (body.length === 0) {
		return null;
	}

	const firstSpace = body.search(/\s/u);
	if (firstSpace < 0) {
		return null;
	}

	const key = body.slice(0, firstSpace).trim();
	const value = body.slice(firstSpace + 1).trim();
	if (key.length === 0) {
		return null;
	}

	return { key, value };
}

function upsertDefine(defines: YayaPreprocessorDefine[], next: YayaPreprocessorDefine): void {
	const existingIndex = defines.findIndex((entry) => entry.key === next.key);
	if (existingIndex >= 0) {
		defines.splice(existingIndex, 1);
	}
	defines.push(next);
}

function applyDefines(line: string, defines: YayaPreprocessorDefine[]): string {
	let expanded = line;
	for (const define of defines) {
		expanded = replaceAllLiteral(expanded, define.key, define.value);
	}
	return expanded;
}

function applyInternalMacros(line: string, filePath: string, lineNumber: number): string {
	let expanded = line;
	expanded = replaceAllLiteral(expanded, INTERNAL_FILE_MACRO, filePath);
	expanded = replaceAllLiteral(expanded, INTERNAL_LINE_MACRO, String(lineNumber));
	return expanded;
}

function replaceAllLiteral(input: string, find: string, replacement: string): string {
	if (find.length === 0 || !input.includes(find)) {
		return input;
	}
	return input.split(find).join(replacement);
}

export { createYayaPreprocessState, preprocessYayaSource };
export type { YayaPreprocessResult, YayaPreprocessState };
