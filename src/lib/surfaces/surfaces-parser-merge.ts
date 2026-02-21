import type {
	SurfaceAnimation,
	SurfaceAnimationPattern,
	SurfaceDefinition,
	SurfaceElement,
	SurfaceRegion,
} from "@/types";
import type { ParsedAnimationPatch } from "./surfaces-parser-animations";

export interface ParsedSurfacePatch {
	elements: SurfaceElement[];
	animations: ParsedAnimationPatch[];
	regions: SurfaceRegion[];
}

export function buildDefinition(
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
