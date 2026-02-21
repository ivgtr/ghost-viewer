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
	SurfaceRegion,
} from "@/types";
import {
	ensureAnimationPatch,
	parseAnimationIntervalLine,
	parseAnimationPatternLine,
	toAnimationPatch,
} from "./surfaces-parser-animations";
import {
	isIgnoredBlockHeader,
	parseAliasBlock,
	parseAliasBlockHeader,
} from "./surfaces-parser-aliases";
import { buildDefinition } from "./surfaces-parser-merge";
import type { ParsedSurfacePatch } from "./surfaces-parser-merge";
import { parsePointPropertyLine, parseRegionLine } from "./surfaces-parser-regions";
import { stripLineComment, unquote } from "./surfaces-parser-utils";

interface ParsedBlock {
	header: string;
	body: string;
}

interface ParsedSurfaceBlockHeader {
	kind: "surface" | "surface.append";
	targets: number[];
}

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
		const aliasHeader = parseAliasBlockHeader(block.header);
		if (aliasHeader) {
			parseAliasBlock(block.body, definitionFile, aliasMap, diagnostics, aliasHeader);
			continue;
		}

		if (isIgnoredBlockHeader(block.header)) {
			continue;
		}

		const parsedHeader = parseSurfaceBlockHeader(block.header, definitionFile, diagnostics);
		if (!parsedHeader) {
			continue;
		}

		const patch = parseSurfaceBlockBody(block.body, definitionFile, diagnostics);
		for (const surfaceId of parsedHeader.targets) {
			const definition = buildDefinition(definitions, surfaceId, parsedHeader.kind, patch);
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
	const headerCandidates: string[] = [];
	let activeHeader: string | null = null;
	let activeBodyLines: string[] = [];

	for (const rawLine of text.split(/\r?\n/)) {
		const line = stripLineComment(rawLine);
		const openIndex = line.indexOf("{");
		const closeIndex = line.indexOf("}");

		if (activeHeader === null) {
			if (openIndex === -1) {
				const candidate = line.trim();
				if (candidate !== "") {
					headerCandidates.push(candidate);
				}
				continue;
			}

			const beforeOpen = line.slice(0, openIndex).trim();
			if (beforeOpen !== "") {
				headerCandidates.push(beforeOpen);
			}
			const header = headerCandidates[headerCandidates.length - 1] ?? null;
			headerCandidates.length = 0;
			if (header === null) {
				continue;
			}

			activeHeader = header;
			activeBodyLines = [];
			const afterOpen = line.slice(openIndex + 1);
			const inlineCloseIndex = afterOpen.indexOf("}");
			if (inlineCloseIndex !== -1) {
				const inlineBody = afterOpen.slice(0, inlineCloseIndex).trim();
				if (inlineBody !== "") {
					activeBodyLines.push(inlineBody);
				}
				blocks.push({
					header: activeHeader,
					body: activeBodyLines.join("\n"),
				});
				activeHeader = null;
				activeBodyLines = [];
				const trailing = afterOpen.slice(inlineCloseIndex + 1).trim();
				if (trailing !== "") {
					headerCandidates.push(trailing);
				}
			}
			continue;
		}

		if (closeIndex === -1) {
			const bodyLine = line.trim();
			if (bodyLine !== "") {
				activeBodyLines.push(bodyLine);
			}
			continue;
		}

		const beforeClose = line.slice(0, closeIndex).trim();
		if (beforeClose !== "") {
			activeBodyLines.push(beforeClose);
		}
		blocks.push({
			header: activeHeader,
			body: activeBodyLines.join("\n"),
		});
		activeHeader = null;
		activeBodyLines = [];

		const trailing = line.slice(closeIndex + 1).trim();
		if (trailing !== "") {
			headerCandidates.push(trailing);
		}
	}

	if (activeHeader !== null) {
		diagnostics.push({
			level: "warning",
			code: "SURFACE_BLOCK_UNCLOSED",
			message: "ブロックの閉じ括弧が不足しています",
			shellName: definitionFile.shellName,
			path: definitionFile.path,
		});
	}

	return blocks;
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

function parseSurfaceBlockBody(
	body: string,
	definitionFile: SurfaceDefinitionFile,
	diagnostics: SurfaceDiagnostic[],
): ParsedSurfacePatch {
	const elementsById = new Map<number, SurfaceElement>();
	const animationsById = new Map<number, ReturnType<typeof ensureAnimationPatch>>();
	const regionsByKey = new Map<string, SurfaceRegion>();

	for (const rawLine of body.split(/\r?\n/)) {
		const line = stripLineComment(rawLine).trim();
		if (line === "") {
			continue;
		}
		const element = parseElementLine(line);
		if (element) {
			elementsById.set(element.id, element);
			continue;
		}

		const animationInterval = parseAnimationIntervalLine(line);
		if (animationInterval) {
			const animation = ensureAnimationPatch(animationsById, animationInterval.animationId);
			animation.interval = animationInterval.interval;
			animation.hasInterval = true;
			continue;
		}

		const animationPattern = parseAnimationPatternLine(line);
		if (animationPattern) {
			const animation = ensureAnimationPatch(animationsById, animationPattern.animationId);
			animation.patternsByIndex.set(animationPattern.pattern.index, animationPattern.pattern);
			continue;
		}

		const region = parseRegionLine(line);
		if (region) {
			const key = `${region.region.kind}:${region.region.id}`;
			regionsByKey.set(key, region.region);
			continue;
		}

		const pointRegion = parsePointPropertyLine(line);
		if (pointRegion) {
			const key = `${pointRegion.region.kind}:${pointRegion.region.id}`;
			regionsByKey.set(key, pointRegion.region);
			continue;
		}

		if (shouldIgnoreSurfaceDirective(line)) {
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

	return {
		elements: [...elementsById.values()].sort((a, b) => a.id - b.id),
		animations: [...animationsById.values()].map(toAnimationPatch).sort((a, b) => a.id - b.id),
		regions: [...regionsByKey.values()].sort((a, b) => {
			if (a.kind === b.kind) {
				return a.id - b.id;
			}
			return a.kind.localeCompare(b.kind);
		}),
	};
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

function shouldIgnoreSurfaceDirective(line: string): boolean {
	const normalized = line.toLowerCase();
	return normalized.startsWith("satolist.") || /^animation\d+\.option\b/i.test(line);
}
