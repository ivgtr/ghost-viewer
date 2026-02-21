import type {
	SurfaceAliasKey,
	SurfaceAliasMap,
	SurfaceDefinitionFile,
	SurfaceDiagnostic,
} from "@/types";
import { stripLineComment, unquote } from "./surfaces-parser-utils";

export interface ParsedAliasBlockHeader {
	defaultScopeId: number | null;
}

export function parseAliasBlockHeader(header: string): ParsedAliasBlockHeader | null {
	const normalized = header.trim().toLowerCase();
	if (normalized === "surface.alias") {
		return { defaultScopeId: null };
	}
	if (normalized === "sakura.surface.alias") {
		return { defaultScopeId: 0 };
	}
	if (normalized === "kero.surface.alias") {
		return { defaultScopeId: 1 };
	}
	const charMatch = normalized.match(/^char(\d+)\.surface\.alias$/);
	if (!charMatch) {
		return null;
	}
	return { defaultScopeId: Number(charMatch[1]) };
}

export function isIgnoredBlockHeader(header: string): boolean {
	const normalized = header.trim().toLowerCase();
	return normalized === "descript";
}

export function parseAliasBlock(
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
