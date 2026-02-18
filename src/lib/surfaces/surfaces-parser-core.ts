import type {
	SurfaceAliasKey,
	SurfaceAliasMap,
	SurfaceAliasMapByShell,
	SurfaceAnimation,
	SurfaceAnimationIntervalMode,
	SurfaceAnimationPattern,
	SurfaceAnimationPatternMethod,
	SurfaceDefinition,
	SurfaceDefinitionFile,
	SurfaceDefinitionFilesByShell,
	SurfaceDefinitionsByShell,
	SurfaceDiagnostic,
	SurfaceElement,
	SurfaceIntervalSpec,
	SurfaceParseResult,
	SurfaceRegion,
} from "@/types";

interface ParsedBlock {
	header: string;
	body: string;
}

interface ParsedSurfaceBlockHeader {
	kind: "surface" | "surface.append";
	targets: number[];
}

interface ParsedAliasBlockHeader {
	defaultScopeId: number | null;
}

interface ParsedAnimationPatch {
	id: number;
	interval: SurfaceIntervalSpec | null;
	hasInterval: boolean;
	patterns: SurfaceAnimationPattern[];
}

interface ParsedSurfacePatch {
	elements: SurfaceElement[];
	animations: ParsedAnimationPatch[];
	regions: SurfaceRegion[];
}

interface MutableAnimationPatch {
	id: number;
	interval: SurfaceIntervalSpec | null;
	hasInterval: boolean;
	patternsByIndex: Map<number, SurfaceAnimationPattern>;
}

interface MutableSurfacePatch {
	elementsById: Map<number, SurfaceElement>;
	animationsById: Map<number, MutableAnimationPatch>;
	regionsByKey: Map<string, SurfaceRegion>;
}

interface ParsedAnimationIntervalLine {
	animationId: number;
	interval: SurfaceIntervalSpec;
}

interface ParsedAnimationPatternLine {
	animationId: number;
	pattern: SurfaceAnimationPattern;
}

interface ParsedRegionLine {
	region: SurfaceRegion;
}

const ANIMATION_INTERVAL_MODES: SurfaceAnimationIntervalMode[] = [
	"bind",
	"runonce",
	"random",
	"periodic",
	"always",
	"never",
	"talk",
	"yen-e",
];

const DIALECT_INTERVAL_TOKENS = new Set(["sometimes"]);

const ANIMATION_PATTERN_METHODS: SurfaceAnimationPatternMethod[] = [
	"base",
	"overlay",
	"add",
	"replace",
	"interpolate",
	"asis",
	"move",
	"reduce",
	"stop",
	"start",
	"alternativestart",
	"alternativestop",
	"insert",
];

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

function parseAliasBlockHeader(header: string): ParsedAliasBlockHeader | null {
	const normalized = header.trim().toLowerCase();
	if (normalized === "surface.alias") {
		return {
			defaultScopeId: null,
		};
	}
	if (normalized === "sakura.surface.alias") {
		return {
			defaultScopeId: 0,
		};
	}
	if (normalized === "kero.surface.alias") {
		return {
			defaultScopeId: 1,
		};
	}
	const charMatch = normalized.match(/^char(\d+)\.surface\.alias$/);
	if (!charMatch) {
		return null;
	}
	return {
		defaultScopeId: Number(charMatch[1]),
	};
}

function isIgnoredBlockHeader(header: string): boolean {
	const normalized = header.trim().toLowerCase();
	return normalized === "descript";
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
	const patch: MutableSurfacePatch = {
		elementsById: new Map(),
		animationsById: new Map(),
		regionsByKey: new Map(),
	};

	for (const rawLine of body.split(/\r?\n/)) {
		const line = stripLineComment(rawLine).trim();
		if (line === "") {
			continue;
		}
		const element = parseElementLine(line);
		if (element) {
			patch.elementsById.set(element.id, element);
			continue;
		}

		const animationInterval = parseAnimationIntervalLine(line);
		if (animationInterval) {
			const animation = ensureAnimationPatch(patch.animationsById, animationInterval.animationId);
			animation.interval = animationInterval.interval;
			animation.hasInterval = true;
			continue;
		}

		const animationPattern = parseAnimationPatternLine(line);
		if (animationPattern) {
			const animation = ensureAnimationPatch(patch.animationsById, animationPattern.animationId);
			animation.patternsByIndex.set(animationPattern.pattern.index, animationPattern.pattern);
			continue;
		}

		const region = parseRegionLine(line);
		if (region) {
			const key = `${region.region.kind}:${region.region.id}`;
			patch.regionsByKey.set(key, region.region);
			continue;
		}

		const pointRegion = parsePointPropertyLine(line);
		if (pointRegion) {
			const key = `${pointRegion.region.kind}:${pointRegion.region.id}`;
			patch.regionsByKey.set(key, pointRegion.region);
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
		elements: [...patch.elementsById.values()].sort((a, b) => a.id - b.id),
		animations: [...patch.animationsById.values()]
			.map(toAnimationPatch)
			.sort((a, b) => a.id - b.id),
		regions: [...patch.regionsByKey.values()].sort((a, b) => {
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

function parseAnimationIntervalLine(line: string): ParsedAnimationIntervalLine | null {
	const match = line.match(/^animation(\d+)\.interval\s*,\s*(.+)$/i);
	if (!match) {
		return null;
	}

	const animationId = Number(match[1]);
	const intervalRaw = match[2]?.trim();
	if (!Number.isInteger(animationId) || !intervalRaw) {
		return null;
	}

	return {
		animationId,
		interval: parseIntervalSpec(intervalRaw),
	};
}

function parseIntervalSpec(raw: string): SurfaceIntervalSpec {
	const tokens = raw
		.split(",")
		.map((token) => token.trim())
		.filter((token) => token.length > 0);
	const first = tokens[0]?.toLowerCase() ?? "";
	const candidates = first.split("+");
	const mode =
		ANIMATION_INTERVAL_MODES.find((candidate) => candidates.includes(candidate)) ?? "unknown";
	const isDialect =
		mode === "unknown" && candidates.some((candidate) => DIALECT_INTERVAL_TOKENS.has(candidate));
	const args = tokens
		.slice(1)
		.map((token) => Number(token))
		.filter((value) => Number.isFinite(value));

	return {
		raw,
		mode,
		args,
		runtimeMeta: {
			raw,
			normalizedMode: mode,
			isDialect,
			args: [...args],
		},
	};
}

function parseAnimationPatternLine(line: string): ParsedAnimationPatternLine | null {
	const match = line.match(/^animation(\d+)\.pattern(\d+)\s*,\s*(.+)$/i);
	if (!match) {
		return null;
	}

	const animationId = Number(match[1]);
	const patternIndex = Number(match[2]);
	const payload = match[3]?.trim() ?? "";
	if (!Number.isInteger(animationId) || !Number.isInteger(patternIndex) || payload === "") {
		return null;
	}

	const fields = payload.split(",").map((field) => field.trim());
	const patternFields = normalizePatternFields(fields);
	const rawMethod = patternFields.rawMethod;
	const method = normalizePatternMethod(rawMethod);
	const surfaceRef = parseNullableInteger(patternFields.surfaceRef);
	const wait = parseNullableNumber(patternFields.wait);
	const x = parseNullableNumber(patternFields.x) ?? 0;
	const y = parseNullableNumber(patternFields.y) ?? 0;
	const optionals = patternFields.optionals
		.map((field) => Number(field))
		.filter((value) => Number.isFinite(value));

	return {
		animationId,
		pattern: {
			index: patternIndex,
			method,
			rawMethod,
			surfaceRef,
			wait,
			x,
			y,
			optionals,
		},
	};
}

function normalizePatternFields(fields: string[]): {
	rawMethod: string;
	surfaceRef: string | undefined;
	wait: string | undefined;
	x: string | undefined;
	y: string | undefined;
	optionals: string[];
} {
	const first = fields[0] ?? "";
	const normalizedMethod = normalizePatternMethod(first);
	if (normalizedMethod !== "unknown" || first.toLowerCase() === "bind") {
		return {
			rawMethod: first,
			surfaceRef: fields[1],
			wait: fields[2],
			x: fields[3],
			y: fields[4],
			optionals: fields.slice(5),
		};
	}

	if (/^-?\d+$/.test(first)) {
		return {
			rawMethod: "overlay",
			surfaceRef: first,
			wait: fields[1],
			x: fields[2],
			y: fields[3],
			optionals: fields.slice(4),
		};
	}

	return {
		rawMethod: first,
		surfaceRef: fields[1],
		wait: fields[2],
		x: fields[3],
		y: fields[4],
		optionals: fields.slice(5),
	};
}

function normalizePatternMethod(value: string): SurfaceAnimationPatternMethod {
	const normalized = value.toLowerCase();
	if (normalized === "bind") {
		return "overlay";
	}
	return ANIMATION_PATTERN_METHODS.includes(normalized as SurfaceAnimationPatternMethod)
		? (normalized as SurfaceAnimationPatternMethod)
		: "unknown";
}

function parseRegionLine(line: string): ParsedRegionLine | null {
	const match = line.match(/^(collisionex|collision|point)(\d+)\s*,\s*(.+)$/i);
	if (!match) {
		return null;
	}

	const kindToken = match[1]?.toLowerCase();
	const idText = match[2];
	const payload = match[3]?.trim() ?? "";
	if (!kindToken || !idText || payload === "") {
		return null;
	}

	const id = Number(idText);
	if (!Number.isInteger(id)) {
		return null;
	}

	const kind = kindToken as "collision" | "collisionex" | "point";
	const fields = payload.split(",").map((field) => field.trim());
	let name: string | null = null;
	let shape: string | null = null;
	let values: number[] = [];

	if (kind === "point") {
		name = fields[0] && fields[0].length > 0 ? unquote(fields[0]) : null;
		shape = fields[1] && fields[1].length > 0 ? unquote(fields[1]) : null;
		values = fields
			.slice(2)
			.map((field) => Number(field))
			.filter((value) => Number.isFinite(value));
	} else {
		const numericPrefix = fields.slice(0, 4).map((field) => Number(field));
		if (numericPrefix.every((value) => Number.isFinite(value))) {
			values = numericPrefix;
			name = fields[4] && fields[4].length > 0 ? unquote(fields[4]) : null;
		} else {
			name = fields[0] && fields[0].length > 0 ? unquote(fields[0]) : null;
			shape = fields[1] && fields[1].length > 0 ? unquote(fields[1]) : null;
			values = fields
				.slice(2)
				.map((field) => Number(field))
				.filter((value) => Number.isFinite(value));
		}
	}

	return {
		region: {
			id,
			kind,
			name,
			shape,
			values,
			raw: line,
		},
	};
}

function parsePointPropertyLine(line: string): ParsedRegionLine | null {
	const match = line.match(/^point\.([^,\s]+)\s*,\s*(.+)$/i);
	if (!match) {
		return null;
	}

	const key = unquote(match[1] ?? "")
		.trim()
		.toLowerCase();
	const payload = match[2]?.trim() ?? "";
	if (key === "" || payload === "") {
		return null;
	}

	const values = payload
		.split(",")
		.map((value) => Number(value.trim()))
		.filter((value) => Number.isFinite(value));
	if (values.length === 0) {
		return null;
	}

	return {
		region: {
			id: hashPointKey(key),
			kind: "point",
			name: key,
			shape: null,
			values,
			raw: line,
		},
	};
}

function shouldIgnoreSurfaceDirective(line: string): boolean {
	const normalized = line.toLowerCase();
	return normalized.startsWith("satolist.") || /^animation\d+\.option\b/i.test(line);
}

function ensureAnimationPatch(
	animationsById: Map<number, MutableAnimationPatch>,
	animationId: number,
): MutableAnimationPatch {
	const existing = animationsById.get(animationId);
	if (existing) {
		return existing;
	}
	const created: MutableAnimationPatch = {
		id: animationId,
		interval: null,
		hasInterval: false,
		patternsByIndex: new Map(),
	};
	animationsById.set(animationId, created);
	return created;
}

function toAnimationPatch(animation: MutableAnimationPatch): ParsedAnimationPatch {
	return {
		id: animation.id,
		interval: animation.interval,
		hasInterval: animation.hasInterval,
		patterns: [...animation.patternsByIndex.values()].sort((a, b) => a.index - b.index),
	};
}

function parseAliasBlock(
	body: string,
	definitionFile: SurfaceDefinitionFile,
	aliasMap: SurfaceAliasMap,
	diagnostics: SurfaceDiagnostic[],
	header: ParsedAliasBlockHeader,
): void {
	for (const rawLine of body.split(/\r?\n/)) {
		const line = stripLineComment(rawLine).trim();
		if (line === "") {
			continue;
		}
		const parsedLine = parseAliasLine(line, header.defaultScopeId);
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

		const scopeAliases = aliasMap.get(parsedLine.scopeId) ?? new Map<SurfaceAliasKey, number[]>();
		scopeAliases.set(parsedLine.aliasKey, parsedLine.candidateIds);
		aliasMap.set(parsedLine.scopeId, scopeAliases);
	}
}

function parseAliasLine(
	line: string,
	defaultScopeId: number | null,
): { scopeId: number; aliasKey: SurfaceAliasKey; candidateIds: number[] } | null {
	const segments = line.split(",").map((segment) => segment.trim());
	const parsed = parseAliasColumns(segments, defaultScopeId);
	if (!parsed) {
		return null;
	}

	const aliasKey = parseAliasKey(parsed.aliasToken);
	const candidateMatches = parsed.candidateSource.match(/-?\d+/g) ?? [];
	const candidateIds = candidateMatches.map((match) => Number(match));
	if (
		!Number.isInteger(parsed.scopeId) ||
		aliasKey === null ||
		candidateIds.length === 0 ||
		candidateIds.some((candidateId) => !Number.isInteger(candidateId))
	) {
		return null;
	}

	return {
		scopeId: parsed.scopeId,
		aliasKey,
		candidateIds,
	};
}

function parseAliasColumns(
	segments: string[],
	defaultScopeId: number | null,
): { scopeId: number; aliasToken: string; candidateSource: string } | null {
	if (defaultScopeId !== null) {
		if (segments.length < 2) {
			return null;
		}
		return {
			scopeId: defaultScopeId,
			aliasToken: segments[0] ?? "",
			candidateSource: segments.slice(1).join(","),
		};
	}

	if (segments.length < 3) {
		return null;
	}
	const scopeId = resolveScopeId(segments[0] ?? "");
	if (scopeId === null) {
		return null;
	}
	return {
		scopeId,
		aliasToken: segments[1] ?? "",
		candidateSource: segments.slice(2).join(","),
	};
}

function parseAliasKey(token: string): SurfaceAliasKey | null {
	const unquoted = unquote(token);
	if (unquoted === "") {
		return null;
	}
	if (/^-?\d+$/.test(unquoted)) {
		return Number(unquoted);
	}
	return unquoted;
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
	patch: ParsedSurfacePatch,
): SurfaceDefinition {
	const base = definitions.get(surfaceId);
	if (kind === "surface.append" && base && isEmptyPatch(patch)) {
		return cloneDefinition(base);
	}
	return {
		id: surfaceId,
		elements: mergeElements(base?.elements ?? [], patch.elements),
		animations: mergeAnimations(base?.animations ?? [], patch.animations),
		regions: mergeRegions(base?.regions ?? [], patch.regions),
	};
}

function isEmptyPatch(patch: ParsedSurfacePatch): boolean {
	return patch.elements.length === 0 && patch.animations.length === 0 && patch.regions.length === 0;
}

function cloneDefinition(definition: SurfaceDefinition): SurfaceDefinition {
	return {
		id: definition.id,
		elements: definition.elements.map((element) => ({ ...element })),
		animations: definition.animations.map((animation) => ({
			id: animation.id,
			interval: animation.interval ? { ...animation.interval } : null,
			patterns: animation.patterns.map((pattern) => ({
				...pattern,
				optionals: [...pattern.optionals],
			})),
		})),
		regions: definition.regions.map((region) => ({
			...region,
			values: [...region.values],
		})),
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

function mergeAnimations(
	baseAnimations: SurfaceAnimation[],
	updates: ParsedAnimationPatch[],
): SurfaceAnimation[] {
	const merged = new Map<number, SurfaceAnimation>();
	for (const animation of baseAnimations) {
		merged.set(animation.id, {
			id: animation.id,
			interval: animation.interval ? { ...animation.interval } : null,
			patterns: animation.patterns.map((pattern) => ({
				...pattern,
				optionals: [...pattern.optionals],
			})),
		});
	}

	for (const update of updates) {
		const base = merged.get(update.id);
		const patternsByIndex = new Map<number, SurfaceAnimationPattern>();
		for (const pattern of base?.patterns ?? []) {
			patternsByIndex.set(pattern.index, {
				...pattern,
				optionals: [...pattern.optionals],
			});
		}
		for (const pattern of update.patterns) {
			patternsByIndex.set(pattern.index, {
				...pattern,
				optionals: [...pattern.optionals],
			});
		}
		const interval = update.hasInterval
			? update.interval
				? { ...update.interval }
				: null
			: base?.interval
				? { ...base.interval }
				: null;
		merged.set(update.id, {
			id: update.id,
			interval,
			patterns: [...patternsByIndex.values()].sort((a, b) => a.index - b.index),
		});
	}

	return [...merged.values()].sort((a, b) => a.id - b.id);
}

function mergeRegions(baseRegions: SurfaceRegion[], updates: SurfaceRegion[]): SurfaceRegion[] {
	const merged = new Map<string, SurfaceRegion>();
	for (const region of baseRegions) {
		merged.set(`${region.kind}:${region.id}`, {
			...region,
			values: [...region.values],
		});
	}
	for (const update of updates) {
		merged.set(`${update.kind}:${update.id}`, {
			...update,
			values: [...update.values],
		});
	}
	return [...merged.values()].sort((a, b) => {
		if (a.kind === b.kind) {
			return a.id - b.id;
		}
		return a.kind.localeCompare(b.kind);
	});
}

function hashPointKey(key: string): number {
	let hash = 0;
	for (const char of key) {
		hash = (hash * 31 + char.charCodeAt(0)) | 0;
	}
	return Math.abs(hash);
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

function parseNullableInteger(value: string | undefined): number | null {
	if (value === undefined) {
		return null;
	}
	const normalized = value.trim();
	if (!/^-?\d+$/.test(normalized)) {
		return null;
	}
	return Number(normalized);
}

function parseNullableNumber(value: string | undefined): number | null {
	if (value === undefined) {
		return null;
	}
	const parsed = Number(value.trim());
	if (!Number.isFinite(parsed)) {
		return null;
	}
	return parsed;
}

function stripLineComment(line: string): string {
	const commentIndex = line.indexOf("//");
	if (commentIndex === -1) {
		return line;
	}
	return line.slice(0, commentIndex);
}
