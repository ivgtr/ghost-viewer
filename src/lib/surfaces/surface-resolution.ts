import {
	buildUnresolvedNotifications,
	deduplicateSurfaceNotifications,
} from "@/lib/surfaces/surface-notification-policy";
import { resolveSurfaceId } from "@/lib/surfaces/surface-resolver";
import { resolveSurfaceVisual } from "@/lib/surfaces/surface-visual-resolver";
import type {
	ShellSurfaceCatalog,
	SurfaceAliasMapByShell,
	SurfaceAnimationRuntimePlan,
	SurfaceDefinitionsByShell,
	SurfaceNotification,
	SurfaceVisualModel,
} from "@/types";

export interface ResolveCurrentSurfaceOptions {
	shellName: string | null;
	catalog: ShellSurfaceCatalog[];
	definitionsByShell: SurfaceDefinitionsByShell;
	aliasMapByShell: SurfaceAliasMapByShell;
	fileContents: Map<string, ArrayBuffer>;
	ghostDescriptProperties: Record<string, string>;
	shellDescriptProperties: Record<string, string>;
	previousSurfaceByScope: Map<number, number | null>;
	previousVisualByScope: Map<number, SurfaceVisualModel | null>;
	scopeIds: number[];
	rng: () => number;
}

export interface ResolveRequestedSurfaceOptions {
	scopeId: number;
	requestedSurfaceId: number;
	shellName: string;
	catalog: ShellSurfaceCatalog[];
	definitionsByShell: SurfaceDefinitionsByShell;
	aliasMapByShell: SurfaceAliasMapByShell;
	fileContents: Map<string, ArrayBuffer>;
	previousSurfaceByScope: Map<number, number | null>;
	previousVisualByScope: Map<number, SurfaceVisualModel | null>;
	rng: () => number;
}

export interface ResolvedSurfaceState {
	surfaceId: number | null;
	model: SurfaceVisualModel | null;
	runtimePlan: SurfaceAnimationRuntimePlan | null;
	notifications: SurfaceNotification[];
}

export function resolveSelectedShellName(
	catalog: ShellSurfaceCatalog[],
	preferredShellName: string | null,
): string | null {
	if (
		preferredShellName !== null &&
		catalog.some((shell) => shell.shellName === preferredShellName)
	) {
		return preferredShellName;
	}
	return catalog[0]?.shellName ?? null;
}

export function resolveAvailableSurfaceIds(
	shellName: string,
	catalog: ShellSurfaceCatalog[],
	definitionsByShell: SurfaceDefinitionsByShell,
): number[] {
	const definitions = definitionsByShell.get(shellName);
	if (definitions && definitions.size > 0) {
		return [...definitions.keys()].sort((a, b) => a - b);
	}
	const shellCatalog = catalog.find((entry) => entry.shellName === shellName);
	if (!shellCatalog) {
		return [];
	}
	return shellCatalog.assets.map((asset) => asset.id).sort((a, b) => a - b);
}

export function resolveRequestedSurfaceId(
	scopeId: number,
	availableSurfaceIds: number[],
	descriptProperties: Record<string, string>,
): number | null {
	const preferredDefaultId = parseSurfaceId(descriptProperties[toDefaultSurfaceKey(scopeId)]);
	if (preferredDefaultId !== null && availableSurfaceIds.includes(preferredDefaultId)) {
		return preferredDefaultId;
	}

	const fallbackId = scopeId === 0 ? 0 : scopeId === 1 ? 10 : null;
	if (fallbackId !== null && availableSurfaceIds.includes(fallbackId)) {
		return fallbackId;
	}

	return availableSurfaceIds[0] ?? null;
}

export function toDefaultSurfaceKey(scopeId: number): string {
	if (scopeId === 0) {
		return "sakura.seriko.defaultsurface";
	}
	if (scopeId === 1) {
		return "kero.seriko.defaultsurface";
	}
	return `char${scopeId}.seriko.defaultsurface`;
}

export function parseSurfaceId(value: string | undefined): number | null {
	if (value === undefined) {
		return null;
	}
	const parsed = Number(value.trim());
	if (!Number.isInteger(parsed)) {
		return null;
	}
	return parsed;
}

export function mergeDescriptProperties(
	ghostDescriptProperties: Record<string, string>,
	shellDescriptProperties: Record<string, string>,
): Record<string, string> {
	return {
		...ghostDescriptProperties,
		...shellDescriptProperties,
	};
}

export function isEquivalentVisualModel(
	left: SurfaceVisualModel | null,
	right: SurfaceVisualModel | null,
): boolean {
	if (left === right) {
		return true;
	}
	if (!left || !right) {
		return false;
	}
	if (
		left.surfaceId !== right.surfaceId ||
		left.fileName !== right.fileName ||
		left.mode !== right.mode ||
		left.width !== right.width ||
		left.height !== right.height ||
		left.layers.length !== right.layers.length
	) {
		return false;
	}

	for (let index = 0; index < left.layers.length; index += 1) {
		const leftLayer = left.layers[index];
		const rightLayer = right.layers[index];
		if (!leftLayer || !rightLayer) {
			return false;
		}
		if (
			leftLayer.path !== rightLayer.path ||
			leftLayer.alphaMaskPath !== rightLayer.alphaMaskPath ||
			leftLayer.x !== rightLayer.x ||
			leftLayer.y !== rightLayer.y ||
			leftLayer.width !== rightLayer.width ||
			leftLayer.height !== rightLayer.height
		) {
			return false;
		}
	}
	return true;
}

export function resolveCurrentSurfaces(options: ResolveCurrentSurfaceOptions): {
	currentSurfaceByScope: Map<number, number | null>;
	visualByScope: Map<number, SurfaceVisualModel | null>;
	runtimePlanByScope: Map<number, SurfaceAnimationRuntimePlan | null>;
	notifications: SurfaceNotification[];
} {
	if (options.shellName === null) {
		const emptySurfaceByScope = new Map<number, number | null>();
		const emptyVisualByScope = new Map<number, SurfaceVisualModel | null>();
		const emptyRuntimePlanByScope = new Map<number, SurfaceAnimationRuntimePlan | null>();
		for (const scopeId of options.scopeIds) {
			emptySurfaceByScope.set(scopeId, null);
			emptyVisualByScope.set(scopeId, null);
			emptyRuntimePlanByScope.set(scopeId, null);
		}
		return {
			currentSurfaceByScope: emptySurfaceByScope,
			visualByScope: emptyVisualByScope,
			runtimePlanByScope: emptyRuntimePlanByScope,
			notifications: [],
		};
	}

	const currentSurfaceByScope = new Map<number, number | null>();
	const visualByScope = new Map<number, SurfaceVisualModel | null>();
	const runtimePlanByScope = new Map<number, SurfaceAnimationRuntimePlan | null>();
	const notifications: SurfaceNotification[] = [];
	for (const scopeId of options.scopeIds) {
		const availableSurfaceIds = resolveAvailableSurfaceIds(
			options.shellName,
			options.catalog,
			options.definitionsByShell,
		);
		if (availableSurfaceIds.length === 0) {
			currentSurfaceByScope.set(scopeId, null);
			visualByScope.set(scopeId, null);
			runtimePlanByScope.set(scopeId, null);
			continue;
		}
		const requestedId = resolveRequestedSurfaceId(
			scopeId,
			availableSurfaceIds,
			mergeDescriptProperties(options.ghostDescriptProperties, options.shellDescriptProperties),
		);
		if (requestedId === null) {
			currentSurfaceByScope.set(scopeId, null);
			visualByScope.set(scopeId, null);
			runtimePlanByScope.set(scopeId, null);
			continue;
		}
		const result = resolveRequestedSurface({
			scopeId,
			requestedSurfaceId: requestedId,
			shellName: options.shellName,
			catalog: options.catalog,
			definitionsByShell: options.definitionsByShell,
			aliasMapByShell: options.aliasMapByShell,
			fileContents: options.fileContents,
			previousSurfaceByScope: options.previousSurfaceByScope,
			previousVisualByScope: options.previousVisualByScope,
			rng: options.rng,
		});
		currentSurfaceByScope.set(scopeId, result.surfaceId);
		visualByScope.set(scopeId, result.model);
		runtimePlanByScope.set(scopeId, result.runtimePlan);
		notifications.push(...result.notifications);
	}

	return {
		currentSurfaceByScope,
		visualByScope,
		runtimePlanByScope,
		notifications: deduplicateSurfaceNotifications(notifications),
	};
}

export function resolveRequestedSurface(
	options: ResolveRequestedSurfaceOptions,
): ResolvedSurfaceState {
	const shellAliasMap =
		options.aliasMapByShell.get(options.shellName) ??
		new Map<number, Map<number | string, number[]>>();
	const resolvedId = resolveSurfaceId(options.scopeId, options.requestedSurfaceId, {
		aliasMap: shellAliasMap,
		rng: options.rng,
	});

	const requestedVisual = resolveSurfaceVisual({
		shellName: options.shellName,
		surfaceId: options.requestedSurfaceId,
		catalog: options.catalog,
		definitionsByShell: options.definitionsByShell,
		fileContents: options.fileContents,
	});
	if (requestedVisual.ok && requestedVisual.model !== null) {
		return {
			surfaceId: options.requestedSurfaceId,
			model: requestedVisual.model,
			runtimePlan: requestedVisual.runtimePlan,
			notifications: collectResolutionNotifications(requestedVisual, options.scopeId),
		};
	}

	if (resolvedId === options.requestedSurfaceId) {
		const previousId = options.previousSurfaceByScope.get(options.scopeId) ?? null;
		const previousModel = options.previousVisualByScope.get(options.scopeId) ?? null;
		return {
			surfaceId: previousId,
			model: previousModel,
			runtimePlan: null,
			notifications: buildUnresolvedNotifications({
				shellName: options.shellName,
				scopeId: options.scopeId,
				surfaceId: resolvedId,
				keepPrevious: previousId !== null,
				rootCauses: deduplicateSurfaceNotifications(
					collectResolutionNotifications(requestedVisual, options.scopeId),
				),
			}),
		};
	}

	const resolvedVisual = resolveSurfaceVisual({
		shellName: options.shellName,
		surfaceId: resolvedId,
		catalog: options.catalog,
		definitionsByShell: options.definitionsByShell,
		fileContents: options.fileContents,
	});
	if (resolvedVisual.ok && resolvedVisual.model !== null) {
		return {
			surfaceId: resolvedId,
			model: resolvedVisual.model,
			runtimePlan: resolvedVisual.runtimePlan,
			notifications: collectResolutionNotifications(resolvedVisual, options.scopeId),
		};
	}

	const rootCauseNotifications = deduplicateSurfaceNotifications([
		...collectResolutionNotifications(requestedVisual, options.scopeId),
		...collectResolutionNotifications(resolvedVisual, options.scopeId),
	]);
	const previousId = options.previousSurfaceByScope.get(options.scopeId) ?? null;
	const previousModel = options.previousVisualByScope.get(options.scopeId) ?? null;
	return {
		surfaceId: previousId,
		model: previousModel,
		runtimePlan: null,
		notifications: buildUnresolvedNotifications({
			shellName: options.shellName,
			scopeId: options.scopeId,
			surfaceId: resolvedId,
			keepPrevious: previousId !== null,
			rootCauses: rootCauseNotifications,
		}),
	};
}

export function collectResolutionNotifications(
	result: ReturnType<typeof resolveSurfaceVisual>,
	scopeId: number,
): SurfaceNotification[] {
	const withScope = [...result.notifications, ...result.trace.notifications].map(
		(notification) => ({
			...notification,
			scopeId,
		}),
	);
	return deduplicateSurfaceNotifications(withScope);
}
