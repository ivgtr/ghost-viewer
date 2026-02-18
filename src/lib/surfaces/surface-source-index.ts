import type { SurfacePathResolution } from "@/types";

export interface SurfaceSourceIndex {
	pathsByNormalized: Map<string, string>;
}

interface ResolveImagePathOptions {
	requestedPath: string;
	shellName: string;
	index: SurfaceSourceIndex;
	defaultExtension?: ".png" | ".pna";
}

const NUMERIC_STEM_PATTERN = /^(.*\/)?(surface|element)(-?\d+)(\.[^./\\]+)?$/i;

export function buildSurfaceSourceIndex(
	fileContents: Map<string, ArrayBuffer>,
): SurfaceSourceIndex {
	const pathsByNormalized = new Map<string, string>();
	for (const path of fileContents.keys()) {
		pathsByNormalized.set(normalizeSurfacePath(path), path);
	}
	return {
		pathsByNormalized,
	};
}

export function normalizeSurfacePath(path: string): string {
	return path
		.replace(/\\/g, "/")
		.replace(/^\.?\//, "")
		.toLowerCase();
}

export function resolveImagePath(options: ResolveImagePathOptions): SurfacePathResolution {
	const requestedPath = options.requestedPath.trim();
	if (requestedPath === "") {
		return {
			ok: false,
			resolvedPath: null,
			attemptedCandidates: [],
			reason: "empty-request",
		};
	}

	const attemptedCandidates = buildCandidatePaths(
		requestedPath,
		options.shellName,
		options.defaultExtension ?? ".png",
	);
	for (const candidate of attemptedCandidates) {
		const resolved = options.index.pathsByNormalized.get(normalizeSurfacePath(candidate));
		if (resolved) {
			return {
				ok: true,
				resolvedPath: resolved,
				attemptedCandidates,
				reason: null,
			};
		}
	}

	return {
		ok: false,
		resolvedPath: null,
		attemptedCandidates,
		reason: "not-found",
	};
}

function buildCandidatePaths(
	requestedPath: string,
	shellName: string,
	defaultExtension: ".png" | ".pna",
): string[] {
	const normalizedRequested = requestedPath.replace(/\\/g, "/").replace(/^\.?\//, "");
	const roots = new Set<string>();
	if (normalizedRequested.startsWith("shell/")) {
		roots.add(normalizedRequested);
	} else {
		roots.add(`shell/${shellName}/${normalizedRequested}`);
	}

	const candidates = new Set<string>();
	for (const root of roots) {
		addPathVariants(root, candidates, defaultExtension);
	}
	return [...candidates];
}

function addPathVariants(
	sourcePath: string,
	candidates: Set<string>,
	defaultExtension: ".png" | ".pna",
): void {
	const withExtension = /\.[^./\\]+$/.test(sourcePath)
		? sourcePath
		: `${sourcePath}${defaultExtension}`;
	candidates.add(withExtension);

	const numericMatch = NUMERIC_STEM_PATTERN.exec(withExtension);
	if (!numericMatch) {
		return;
	}

	const prefix = numericMatch[1] ?? "";
	const kind = numericMatch[2] ?? "";
	const numericToken = numericMatch[3] ?? "";
	const extension = numericMatch[4] ?? defaultExtension;
	const parsed = Number(numericToken);
	if (!Number.isInteger(parsed)) {
		return;
	}

	const sign = parsed < 0 ? "-" : "";
	const absValue = Math.abs(parsed);
	candidates.add(`${prefix}${kind}${sign}${absValue}${extension}`);
	if (absValue <= 9999) {
		candidates.add(`${prefix}${kind}${sign}${String(absValue).padStart(4, "0")}${extension}`);
	}
}
