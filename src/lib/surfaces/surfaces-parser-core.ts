import type {
	SurfaceAliasMap,
	SurfaceAliasMapByShell,
	SurfaceDefinition,
	SurfaceDefinitionFile,
	SurfaceDefinitionFilesByShell,
	SurfaceDefinitionsByShell,
	SurfaceDiagnostic,
	SurfaceElement,
	SurfaceParseResult,
} from "@/types";

interface ParsedBlock {
	header: string;
	body: string;
}

interface ParsedSurfaceBlockHeader {
	kind: "surface" | "surface.append";
	targets: number[];
}

const UNSUPPORTED_CORE_KEYWORDS = ["animation", "interval", "pattern"];

export function parseSurfacesCore(filesByShell: SurfaceDefinitionFilesByShell): SurfaceParseResult {
	const diagnostics: SurfaceDiagnostic[] = [];
	const definitionsByShell: SurfaceDefinitionsByShell = new Map();
	const aliasMapByShell: SurfaceAliasMapByShell = new Map();

	for (const [shellName, definitionFiles] of filesByShell.entries()) {
		const definitions = new Map<number, SurfaceDefinition>();
		const aliasMap: SurfaceAliasMap = new Map();

		for (const definitionFile of definitionFiles) {
			parseDefinitionFile(definitionFile, definitions, aliasMap, diagnostics);
		}

		definitionsByShell.set(shellName, definitions);
		aliasMapByShell.set(shellName, aliasMap);
	}

	return {
		definitionsByShell,
		aliasMapByShell,
		diagnostics,
	};
}

function parseDefinitionFile(
	definitionFile: SurfaceDefinitionFile,
	definitions: Map<number, SurfaceDefinition>,
	aliasMap: SurfaceAliasMap,
	diagnostics: SurfaceDiagnostic[],
): void {
	const blocks = extractBlocks(definitionFile.text, definitionFile, diagnostics);
	for (const block of blocks) {
		if (isAliasBlockHeader(block.header)) {
			parseAliasBlock(block.body, definitionFile, aliasMap, diagnostics);
			continue;
		}

		const parsedHeader = parseSurfaceBlockHeader(block.header, definitionFile, diagnostics);
		if (!parsedHeader) {
			continue;
		}

		const elements = parseSurfaceBlockElements(block.body, definitionFile, diagnostics);
		for (const surfaceId of parsedHeader.targets) {
			const definition = buildDefinition(definitions, surfaceId, parsedHeader.kind, elements);
			definitions.set(surfaceId, definition);
		}
	}
}

function extractBlocks(
	text: string,
	definitionFile: SurfaceDefinitionFile,
	diagnostics: SurfaceDiagnostic[],
): ParsedBlock[] {
	const blocks: ParsedBlock[] = [];
	let cursor = 0;

	while (cursor < text.length) {
		const openIndex = text.indexOf("{", cursor);
		if (openIndex === -1) {
			break;
		}
		const closeIndex = text.indexOf("}", openIndex + 1);
		if (closeIndex === -1) {
			diagnostics.push({
				level: "warning",
				code: "SURFACE_BLOCK_UNCLOSED",
				message: "ブロックの閉じ括弧が不足しています",
				shellName: definitionFile.shellName,
				path: definitionFile.path,
			});
			break;
		}

		const headerSource = text.slice(cursor, openIndex);
		const header = pickBlockHeader(headerSource);
		if (header !== null) {
			blocks.push({
				header,
				body: text.slice(openIndex + 1, closeIndex),
			});
		}
		cursor = closeIndex + 1;
	}

	return blocks;
}

function pickBlockHeader(headerSource: string): string | null {
	const lines = headerSource
		.split(/\r?\n/)
		.map((line) => stripLineComment(line).trim())
		.filter((line) => line.length > 0);
	if (lines.length === 0) {
		return null;
	}
	return lines[lines.length - 1] ?? null;
}

function isAliasBlockHeader(header: string): boolean {
	return header.toLowerCase().startsWith("surface.alias");
}

function parseSurfaceBlockHeader(
	header: string,
	definitionFile: SurfaceDefinitionFile,
	diagnostics: SurfaceDiagnostic[],
): ParsedSurfaceBlockHeader | null {
	const normalizedHeader = header.trim();
	const lowerHeader = normalizedHeader.toLowerCase();

	if (lowerHeader.startsWith("surface.append")) {
		const selectorText = normalizedHeader.slice("surface.append".length);
		return buildSurfaceBlockHeader("surface.append", selectorText, definitionFile, diagnostics);
	}
	if (lowerHeader.startsWith("surface")) {
		const selectorText = normalizedHeader.slice("surface".length);
		return buildSurfaceBlockHeader("surface", selectorText, definitionFile, diagnostics);
	}

	diagnostics.push({
		level: "warning",
		code: "SURFACE_BLOCK_UNSUPPORTED",
		message: `未対応のブロックヘッダーです: ${normalizedHeader}`,
		shellName: definitionFile.shellName,
		path: definitionFile.path,
	});
	return null;
}

function buildSurfaceBlockHeader(
	kind: "surface" | "surface.append",
	selectorText: string,
	definitionFile: SurfaceDefinitionFile,
	diagnostics: SurfaceDiagnostic[],
): ParsedSurfaceBlockHeader | null {
	const targets = parseSurfaceTargets(selectorText);
	if (targets.length === 0) {
		diagnostics.push({
			level: "warning",
			code: "SURFACE_TARGET_EMPTY",
			message: `${kind} の対象 surface ID を解決できませんでした`,
			shellName: definitionFile.shellName,
			path: definitionFile.path,
		});
		return null;
	}
	return { kind, targets };
}

function parseSurfaceTargets(selectorText: string): number[] {
	const normalized = selectorText.replace(/\s+/g, "");
	if (normalized === "") {
		return [];
	}

	const include = new Set<number>();
	const exclude = new Set<number>();
	for (const rawToken of normalized.split(",")) {
		if (rawToken === "") {
			continue;
		}
		const isExclude = rawToken.startsWith("!");
		const token = isExclude ? rawToken.slice(1) : rawToken;
		const values = parseTargetToken(token);
		if (values.length === 0) {
			continue;
		}
		for (const value of values) {
			if (isExclude) {
				exclude.add(value);
			} else {
				include.add(value);
			}
		}
	}

	for (const excludedId of exclude) {
		include.delete(excludedId);
	}

	return [...include].sort((a, b) => a - b);
}

function parseTargetToken(token: string): number[] {
	if (/^-?\d+$/.test(token)) {
		return [Number(token)];
	}
	const rangeMatch = token.match(/^(-?\d+)-(-?\d+)$/);
	if (!rangeMatch) {
		return [];
	}
	const start = Number(rangeMatch[1]);
	const end = Number(rangeMatch[2]);
	if (!Number.isInteger(start) || !Number.isInteger(end)) {
		return [];
	}
	if (start <= end) {
		const values: number[] = [];
		for (let value = start; value <= end; value++) {
			values.push(value);
		}
		return values;
	}
	const values: number[] = [];
	for (let value = start; value >= end; value--) {
		values.push(value);
	}
	return values;
}

function parseSurfaceBlockElements(
	body: string,
	definitionFile: SurfaceDefinitionFile,
	diagnostics: SurfaceDiagnostic[],
): SurfaceElement[] {
	const elementsById = new Map<number, SurfaceElement>();

	for (const rawLine of body.split(/\r?\n/)) {
		const line = stripLineComment(rawLine).trim();
		if (line === "") {
			continue;
		}
		if (isUnsupportedCoreLine(line)) {
			diagnostics.push({
				level: "warning",
				code: "SURFACE_CORE_UNSUPPORTED_SYNTAX",
				message: `コア未対応構文を検出しました: ${line}`,
				shellName: definitionFile.shellName,
				path: definitionFile.path,
			});
			continue;
		}
		const element = parseElementLine(line);
		if (element) {
			elementsById.set(element.id, element);
			continue;
		}
		diagnostics.push({
			level: "warning",
			code: "SURFACE_CORE_UNKNOWN_SYNTAX",
			message: `未対応構文を検出しました: ${line}`,
			shellName: definitionFile.shellName,
			path: definitionFile.path,
		});
	}

	return [...elementsById.values()].sort((a, b) => a.id - b.id);
}

function parseElementLine(line: string): SurfaceElement | null {
	if (!line.toLowerCase().startsWith("element")) {
		return null;
	}

	const fields = line.split(",").map((field) => field.trim());
	if (fields.length < 5) {
		return null;
	}

	const idMatch = fields[0]?.match(/^element(\d+)$/i);
	if (!idMatch) {
		return null;
	}
	const id = Number(idMatch[1]);
	const kind = fields[1] ?? "";
	const path = unquote(fields[2] ?? "");
	const x = Number(fields[3]);
	const y = Number(fields[4]);
	if (
		!Number.isInteger(id) ||
		kind === "" ||
		path === "" ||
		!Number.isFinite(x) ||
		!Number.isFinite(y)
	) {
		return null;
	}

	return {
		id,
		kind,
		path,
		x,
		y,
	};
}

function unquote(value: string): string {
	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		return value.slice(1, -1);
	}
	return value;
}

function parseAliasBlock(
	body: string,
	definitionFile: SurfaceDefinitionFile,
	aliasMap: SurfaceAliasMap,
	diagnostics: SurfaceDiagnostic[],
): void {
	for (const rawLine of body.split(/\r?\n/)) {
		const line = stripLineComment(rawLine).trim();
		if (line === "") {
			continue;
		}
		const parsedLine = parseAliasLine(line);
		if (!parsedLine) {
			diagnostics.push({
				level: "warning",
				code: "SURFACE_ALIAS_PARSE_FAILED",
				message: `surface.alias を解決できませんでした: ${line}`,
				shellName: definitionFile.shellName,
				path: definitionFile.path,
			});
			continue;
		}

		const scopeAliases = aliasMap.get(parsedLine.scopeId) ?? new Map<number, number[]>();
		scopeAliases.set(parsedLine.aliasId, parsedLine.candidateIds);
		aliasMap.set(parsedLine.scopeId, scopeAliases);
	}
}

function parseAliasLine(
	line: string,
): { scopeId: number; aliasId: number; candidateIds: number[] } | null {
	const segments = line.split(",");
	if (segments.length < 3) {
		return null;
	}

	const scopeToken = segments[0]?.trim() ?? "";
	const aliasToken = segments[1]?.trim() ?? "";
	const candidateSource = segments.slice(2).join(",").trim();
	const scopeId = resolveScopeId(scopeToken);
	const aliasId = Number(aliasToken);
	const candidateMatches = candidateSource.match(/-?\d+/g) ?? [];
	const candidateIds = candidateMatches.map((match) => Number(match));
	if (
		scopeId === null ||
		!Number.isInteger(aliasId) ||
		candidateIds.length === 0 ||
		candidateIds.some((candidateId) => !Number.isInteger(candidateId))
	) {
		return null;
	}

	return {
		scopeId,
		aliasId,
		candidateIds,
	};
}

function resolveScopeId(scopeToken: string): number | null {
	const normalized = scopeToken.toLowerCase();
	if (normalized.includes("sakura")) {
		return 0;
	}
	if (normalized.includes("kero")) {
		return 1;
	}
	const charMatch = normalized.match(/char(\d+)/);
	if (charMatch) {
		return Number(charMatch[1]);
	}
	if (/^-?\d+$/.test(normalized)) {
		return Number(normalized);
	}
	return null;
}

function buildDefinition(
	definitions: Map<number, SurfaceDefinition>,
	surfaceId: number,
	kind: "surface" | "surface.append",
	elements: SurfaceElement[],
): SurfaceDefinition {
	if (kind === "surface") {
		return {
			id: surfaceId,
			elements: mergeElements([], elements),
		};
	}

	const base = definitions.get(surfaceId);
	const baseElements = base ? [...base.elements] : [];
	return {
		id: surfaceId,
		elements: mergeElements(baseElements, elements),
	};
}

function mergeElements(
	baseElements: SurfaceElement[],
	updates: SurfaceElement[],
): SurfaceElement[] {
	const merged = new Map<number, SurfaceElement>();
	for (const element of baseElements) {
		merged.set(element.id, { ...element });
	}
	for (const update of updates) {
		merged.set(update.id, { ...update });
	}
	return [...merged.values()].sort((a, b) => a.id - b.id);
}

function isUnsupportedCoreLine(line: string): boolean {
	const normalized = line.toLowerCase();
	return UNSUPPORTED_CORE_KEYWORDS.some((keyword) => normalized.startsWith(keyword));
}

function stripLineComment(line: string): string {
	const commentIndex = line.indexOf("//");
	if (commentIndex === -1) {
		return line;
	}
	return line.slice(0, commentIndex);
}
