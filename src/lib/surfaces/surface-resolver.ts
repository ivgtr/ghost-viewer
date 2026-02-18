import type { SurfaceResolverContext } from "@/types";

export function resolveSurfaceId(
	scopeId: number,
	requestedId: number,
	context: SurfaceResolverContext,
): number {
	const scopeAliases = context.aliasMap.get(scopeId);
	if (!scopeAliases) {
		return requestedId;
	}

	const candidates = scopeAliases.get(requestedId);
	if (!candidates || candidates.length === 0) {
		return requestedId;
	}

	const rng = context.rng ?? Math.random;
	const normalized = normalizeRandom(rng());
	const index = Math.floor(normalized * candidates.length);
	return candidates[index] ?? requestedId;
}

function normalizeRandom(value: number): number {
	if (!Number.isFinite(value)) {
		return 0;
	}
	if (value < 0) {
		return 0;
	}
	if (value >= 1) {
		return 0.9999999999999999;
	}
	return value;
}
