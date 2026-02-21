import { parseDescriptFromBuffer } from "@/lib/parsers/descript";
import { createSurfaceAnimationRuntime } from "@/lib/surfaces/surface-animation-runtime";
import {
	buildUnresolvedNotifications,
	createSurfaceNotification,
	deduplicateSurfaceNotifications,
	diagnosticsToSurfaceNotifications,
} from "@/lib/surfaces/surface-notification-policy";
import { resolveSurfaceId } from "@/lib/surfaces/surface-resolver";
import { buildVisualModelFromRenderLayers } from "@/lib/surfaces/surface-visual-model";
import { resolveSurfaceVisual } from "@/lib/surfaces/surface-visual-resolver";
import type {
	ShellSurfaceCatalog,
	SurfaceAliasMap,
	SurfaceAliasMapByShell,
	SurfaceAnimationRuntimePlan,
	SurfaceDefinition,
	SurfaceDefinitionsByShell,
	SurfaceDiagnostic,
	SurfaceInitializeInput,
	SurfaceNotification,
	SurfaceRenderLayer,
	SurfaceSyncReason,
	SurfaceVisualModel,
} from "@/types";
import { createStore } from "./create-store";
import { useFileContentStore } from "./file-content-store";

interface SurfaceState {
	selectedShellName: string | null;
	catalog: ShellSurfaceCatalog[];
	definitions: SurfaceDefinitionsByShell;
	aliasMap: SurfaceAliasMapByShell;
	diagnostics: SurfaceDiagnostic[];
	notifications: SurfaceNotification[];
	ghostDescriptProperties: Record<string, string>;
	shellDescriptCacheByName: Record<string, Record<string, string>>;
	currentSurfaceByScope: Map<number, number | null>;
	visualByScope: Map<number, SurfaceVisualModel | null>;
	focusedScope: number;
	secondaryScopeId: number;
	availableSecondaryScopeIds: number[];
	initialize: (input: SurfaceInitializeInput) => void;
	selectShell: (shellName: string | null) => void;
	ensureShellDescriptLoaded: (shellName: string | null) => void;
	setSurfaceForScope: (
		scopeId: number,
		requestedSurfaceId: number,
		reason: SurfaceSyncReason,
	) => void;
	syncFromConversation: (
		entries: Array<{ scopeId: number; requestedSurfaceId: number }>,
		reason: SurfaceSyncReason,
	) => void;
	restartRuntimeForScopes: (scopeIds: number[]) => void;
	setFocusedScope: (scopeId: number) => void;
	setSecondaryScopeId: (scopeId: number) => void;
	setAvailableSecondaryScopeIds: (scopeIds: number[]) => void;
	reset: () => void;
}

interface ResolveCurrentSurfaceOptions {
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

interface ResolveRequestedSurfaceOptions {
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

interface ResolvedSurfaceState {
	surfaceId: number | null;
	model: SurfaceVisualModel | null;
	runtimePlan: SurfaceAnimationRuntimePlan | null;
	notifications: SurfaceNotification[];
}

let resolverRng: () => number = Math.random;

const DEFAULT_CURRENT_SURFACE_BY_SCOPE = new Map<number, number | null>([
	[0, null],
	[1, null],
]);
const DEFAULT_VISUAL_BY_SCOPE = new Map<number, SurfaceVisualModel | null>([
	[0, null],
	[1, null],
]);

const runtimeByScope = new Map<number, ReturnType<typeof createSurfaceAnimationRuntime>>();
const runtimeTimerByScope = new Map<number, ReturnType<typeof setInterval>>();

const RUNTIME_TICK_MS = 50;

export const useSurfaceStore = createStore<SurfaceState>(
	{
		selectedShellName: null,
		catalog: [],
		definitions: new Map<string, Map<number, SurfaceDefinition>>(),
		aliasMap: new Map<string, SurfaceAliasMap>(),
		diagnostics: [],
		notifications: [],
		ghostDescriptProperties: {},
		shellDescriptCacheByName: {},
		currentSurfaceByScope: DEFAULT_CURRENT_SURFACE_BY_SCOPE,
		visualByScope: DEFAULT_VISUAL_BY_SCOPE,
		focusedScope: 0,
		secondaryScopeId: 1,
		availableSecondaryScopeIds: [],
	},
	(set, get) => ({
		initialize: (input) => {
			stopAllRuntimes();
			resolverRng = input.rng ?? Math.random;
			const selectedShellName = resolveSelectedShellName(input.catalog, input.initialShellName);
			const baseNotifications = diagnosticsToSurfaceNotifications(input.diagnostics);
			const fileContents = useFileContentStore.getState().fileContents;
			const state = get();
			const resolved = resolveCurrentSurfaces({
				shellName: selectedShellName,
				catalog: input.catalog,
				definitionsByShell: input.definitionsByShell,
				aliasMapByShell: input.aliasMapByShell,
				fileContents,
				ghostDescriptProperties: input.ghostDescriptProperties,
				shellDescriptProperties: {},
				previousSurfaceByScope: DEFAULT_CURRENT_SURFACE_BY_SCOPE,
				previousVisualByScope: DEFAULT_VISUAL_BY_SCOPE,
				scopeIds: [0, state.secondaryScopeId],
				rng: resolverRng,
			});

			set({
				selectedShellName,
				catalog: input.catalog,
				definitions: input.definitionsByShell,
				aliasMap: input.aliasMapByShell,
				diagnostics: input.diagnostics,
				notifications: deduplicateSurfaceNotifications([
					...baseNotifications,
					...resolved.notifications,
				]),
				ghostDescriptProperties: input.ghostDescriptProperties,
				shellDescriptCacheByName: {},
				currentSurfaceByScope: resolved.currentSurfaceByScope,
				visualByScope: resolved.visualByScope,
				focusedScope: 0,
			});
			for (const [scopeId, runtimePlan] of resolved.runtimePlanByScope.entries()) {
				replaceScopeRuntime(scopeId, runtimePlan);
			}
		},
		selectShell: (shellName) => {
			stopAllRuntimes();
			if (shellName === null) {
				set({
					selectedShellName: null,
					currentSurfaceByScope: new Map(DEFAULT_CURRENT_SURFACE_BY_SCOPE),
					visualByScope: new Map(DEFAULT_VISUAL_BY_SCOPE),
					notifications: diagnosticsToSurfaceNotifications(get().diagnostics),
				});
				return;
			}

			const state = get();
			const shellExists = state.catalog.some((entry) => entry.shellName === shellName);
			if (!shellExists) {
				return;
			}

			get().ensureShellDescriptLoaded(shellName);
			const refreshedState = get();
			const fileContents = useFileContentStore.getState().fileContents;
			const resolved = resolveCurrentSurfaces({
				shellName,
				catalog: refreshedState.catalog,
				definitionsByShell: refreshedState.definitions,
				aliasMapByShell: refreshedState.aliasMap,
				fileContents,
				ghostDescriptProperties: refreshedState.ghostDescriptProperties,
				shellDescriptProperties: refreshedState.shellDescriptCacheByName[shellName] ?? {},
				previousSurfaceByScope: refreshedState.currentSurfaceByScope,
				previousVisualByScope: refreshedState.visualByScope,
				scopeIds: [0, refreshedState.secondaryScopeId],
				rng: resolverRng,
			});
			set({
				selectedShellName: shellName,
				currentSurfaceByScope: resolved.currentSurfaceByScope,
				visualByScope: resolved.visualByScope,
				notifications: deduplicateSurfaceNotifications([
					...diagnosticsToSurfaceNotifications(refreshedState.diagnostics),
					...resolved.notifications,
				]),
			});
			for (const [scopeId, runtimePlan] of resolved.runtimePlanByScope.entries()) {
				replaceScopeRuntime(scopeId, runtimePlan);
			}
		},
		ensureShellDescriptLoaded: (shellName) => {
			if (shellName === null) {
				return;
			}
			const state = get();
			if (state.shellDescriptCacheByName[shellName] !== undefined) {
				return;
			}

			const path = `shell/${shellName}/descript.txt`;
			const buffer = useFileContentStore.getState().fileContents.get(path);
			let properties: Record<string, string> = {};
			let decodeNotification: SurfaceNotification | null = null;

			if (buffer) {
				try {
					properties = parseDescriptFromBuffer(buffer).properties;
				} catch {
					decodeNotification = createSurfaceNotification({
						level: "warning",
						code: "SHELL_DESCRIPT_DECODE_FAILED",
						message: `shell descript の解析に失敗しました: ${path}`,
						shellName,
						scopeId: null,
						surfaceId: null,
						stage: "store",
						fatal: false,
					});
				}
			}

			const nextCache = {
				...get().shellDescriptCacheByName,
				[shellName]: properties,
			};
			const nextNotifications = decodeNotification
				? deduplicateSurfaceNotifications([...get().notifications, decodeNotification])
				: get().notifications;
			set({
				shellDescriptCacheByName: nextCache,
				notifications: nextNotifications,
			});
		},
		setSurfaceForScope: (scopeId, requestedSurfaceId, reason) => {
			const state = get();
			const shellName = state.selectedShellName;
			const fileContents = useFileContentStore.getState().fileContents;
			if (
				shellName === null ||
				!Number.isInteger(scopeId) ||
				!Number.isInteger(requestedSurfaceId)
			) {
				return;
			}

			const result = resolveRequestedSurface({
				scopeId,
				requestedSurfaceId,
				shellName,
				catalog: state.catalog,
				definitionsByShell: state.definitions,
				aliasMapByShell: state.aliasMap,
				fileContents,
				previousSurfaceByScope: state.currentSurfaceByScope,
				previousVisualByScope: state.visualByScope,
				rng: resolverRng,
			});
			const nextCurrentSurfaceByScope = new Map(state.currentSurfaceByScope);
			nextCurrentSurfaceByScope.set(scopeId, result.surfaceId);
			const nextVisualByScope = new Map(state.visualByScope);
			nextVisualByScope.set(scopeId, result.model);
			set({
				currentSurfaceByScope: nextCurrentSurfaceByScope,
				visualByScope: nextVisualByScope,
				notifications: appendSyncNotifications({
					baseNotifications: state.notifications,
					nextNotifications: result.notifications,
					reason,
				}),
			});
			replaceScopeRuntime(scopeId, result.runtimePlan);
		},
		syncFromConversation: (entries, reason) => {
			const state = get();
			const shellName = state.selectedShellName;
			const fileContents = useFileContentStore.getState().fileContents;
			if (shellName === null) {
				return;
			}

			const nextCurrentSurfaceByScope = new Map(state.currentSurfaceByScope);
			const nextVisualByScope = new Map(state.visualByScope);
			const runtimePlansByScope = new Map<number, SurfaceAnimationRuntimePlan | null>();
			const syncNotifications: SurfaceNotification[] = [];
			for (const entry of entries) {
				if (!Number.isInteger(entry.scopeId) || !Number.isInteger(entry.requestedSurfaceId)) {
					continue;
				}
				const result = resolveRequestedSurface({
					scopeId: entry.scopeId,
					requestedSurfaceId: entry.requestedSurfaceId,
					shellName,
					catalog: state.catalog,
					definitionsByShell: state.definitions,
					aliasMapByShell: state.aliasMap,
					fileContents,
					previousSurfaceByScope: nextCurrentSurfaceByScope,
					previousVisualByScope: nextVisualByScope,
					rng: resolverRng,
				});
				nextCurrentSurfaceByScope.set(entry.scopeId, result.surfaceId);
				nextVisualByScope.set(entry.scopeId, result.model);
				runtimePlansByScope.set(entry.scopeId, result.runtimePlan);
				syncNotifications.push(...result.notifications);
			}

			set({
				currentSurfaceByScope: nextCurrentSurfaceByScope,
				visualByScope: nextVisualByScope,
				notifications: appendSyncNotifications({
					baseNotifications: state.notifications,
					nextNotifications: syncNotifications,
					reason,
				}),
			});
			for (const [scopeId, runtimePlan] of runtimePlansByScope.entries()) {
				replaceScopeRuntime(scopeId, runtimePlan);
			}
		},
		restartRuntimeForScopes: (scopeIds) => {
			const state = get();
			const fileContents = useFileContentStore.getState().fileContents;
			if (state.selectedShellName === null) {
				return;
			}
			const shellName = state.selectedShellName;
			const runtimePlansByScope = new Map<number, SurfaceAnimationRuntimePlan | null>();
			const nextVisualByScope = new Map(state.visualByScope);
			const notifications: SurfaceNotification[] = [];
			for (const scopeId of scopeIds) {
				const surfaceId = state.currentSurfaceByScope.get(scopeId);
				if (surfaceId === null || surfaceId === undefined) {
					continue;
				}
				const result = resolveSurfaceVisual({
					shellName,
					surfaceId,
					catalog: state.catalog,
					definitionsByShell: state.definitions,
					fileContents,
				});
				if (!result.ok || result.model === null) {
					continue;
				}
				nextVisualByScope.set(scopeId, result.model);
				runtimePlansByScope.set(scopeId, result.runtimePlan);
				notifications.push(...collectResolutionNotifications(result, scopeId));
			}

			if (runtimePlansByScope.size > 0 || notifications.length > 0) {
				set({
					visualByScope: nextVisualByScope,
					notifications: deduplicateSurfaceNotifications([
						...state.notifications,
						...notifications,
					]),
				});
			}
			for (const [scopeId, runtimePlan] of runtimePlansByScope.entries()) {
				replaceScopeRuntime(scopeId, runtimePlan);
			}
		},
		setFocusedScope: (scopeId) => {
			if (!Number.isInteger(scopeId) || scopeId < 0) {
				return;
			}
			set({ focusedScope: scopeId });
		},
		setSecondaryScopeId: (scopeId) => {
			const state = get();
			if (
				!Number.isInteger(scopeId) ||
				scopeId < 1 ||
				!state.availableSecondaryScopeIds.includes(scopeId)
			) {
				return;
			}
			set({ secondaryScopeId: scopeId });

			if (!state.currentSurfaceByScope.has(scopeId)) {
				const shellName = state.selectedShellName;
				const fileContents = useFileContentStore.getState().fileContents;
				if (shellName !== null) {
					const result = resolveRequestedSurface({
						scopeId,
						requestedSurfaceId:
							resolveRequestedSurfaceId(
								scopeId,
								resolveAvailableSurfaceIds(shellName, state.catalog, state.definitions),
								mergeDescriptProperties(
									state.ghostDescriptProperties,
									state.shellDescriptCacheByName[shellName] ?? {},
								),
							) ?? 0,
						shellName,
						catalog: state.catalog,
						definitionsByShell: state.definitions,
						aliasMapByShell: state.aliasMap,
						fileContents,
						previousSurfaceByScope: state.currentSurfaceByScope,
						previousVisualByScope: state.visualByScope,
						rng: resolverRng,
					});
					const nextCurrentSurfaceByScope = new Map(get().currentSurfaceByScope);
					nextCurrentSurfaceByScope.set(scopeId, result.surfaceId);
					const nextVisualByScope = new Map(get().visualByScope);
					nextVisualByScope.set(scopeId, result.model);
					set({
						currentSurfaceByScope: nextCurrentSurfaceByScope,
						visualByScope: nextVisualByScope,
					});
					replaceScopeRuntime(scopeId, result.runtimePlan);
					return;
				}
			}

			get().restartRuntimeForScopes([scopeId]);
		},
		setAvailableSecondaryScopeIds: (scopeIds) => {
			const unique = [...new Set(scopeIds)].sort((a, b) => a - b);
			set({ availableSecondaryScopeIds: unique });

			const state = get();
			if (!unique.includes(state.secondaryScopeId)) {
				const first = unique[0];
				if (first !== undefined) {
					get().setSecondaryScopeId(first);
				} else {
					set({ secondaryScopeId: 1 });
				}
			}
		},
	}),
);

const surfaceStoreReset = useSurfaceStore.getState().reset;
useSurfaceStore.setState({
	reset: () => {
		stopAllRuntimes();
		resolverRng = Math.random;
		surfaceStoreReset();
		useSurfaceStore.setState({
			secondaryScopeId: 1,
			availableSecondaryScopeIds: [],
		});
	},
});

function resolveCurrentSurfaces(options: ResolveCurrentSurfaceOptions): {
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

function resolveRequestedSurface(options: ResolveRequestedSurfaceOptions): ResolvedSurfaceState {
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

function resolveSelectedShellName(
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

function resolveRequestedSurfaceId(
	scopeId: number,
	availableSurfaceIds: number[],
	descriptProperties: Record<string, string>,
): number | null {
	const preferredDefaultId = parseSurfaceId(descriptProperties[toDefaultSurfaceKey(scopeId)]);
	if (preferredDefaultId !== null && availableSurfaceIds.includes(preferredDefaultId)) {
		return preferredDefaultId;
	}

	const fallbackId = scopeId === 0 ? 0 : 10;
	if (availableSurfaceIds.includes(fallbackId)) {
		return fallbackId;
	}

	return availableSurfaceIds[0] ?? null;
}

function toDefaultSurfaceKey(scopeId: number): string {
	if (scopeId === 0) {
		return "sakura.seriko.defaultsurface";
	}
	if (scopeId === 1) {
		return "kero.seriko.defaultsurface";
	}
	return `char${scopeId}.seriko.defaultsurface`;
}

function parseSurfaceId(value: string | undefined): number | null {
	if (value === undefined) {
		return null;
	}
	const parsed = Number(value.trim());
	if (!Number.isInteger(parsed)) {
		return null;
	}
	return parsed;
}

interface AppendSyncNotificationsOptions {
	baseNotifications: SurfaceNotification[];
	nextNotifications: SurfaceNotification[];
	reason: SurfaceSyncReason;
}

function appendSyncNotifications(options: AppendSyncNotificationsOptions): SurfaceNotification[] {
	if (options.nextNotifications.length === 0) {
		return options.baseNotifications;
	}
	if (options.reason === "manual") {
		return deduplicateSurfaceNotifications([
			...options.baseNotifications,
			...options.nextNotifications,
		]);
	}
	const syncKeys = new Set(
		options.nextNotifications.map(
			(notification) =>
				`${notification.code}:${notification.scopeId ?? "null"}:${notification.surfaceId ?? "null"}`,
		),
	);
	const preservedNotifications = options.baseNotifications.filter((notification) => {
		if (notification.scopeId === null) {
			return true;
		}
		return !syncKeys.has(
			`${notification.code}:${notification.scopeId ?? "null"}:${notification.surfaceId ?? "null"}`,
		);
	});
	return deduplicateSurfaceNotifications([...preservedNotifications, ...options.nextNotifications]);
}

function mergeDescriptProperties(
	ghostDescriptProperties: Record<string, string>,
	shellDescriptProperties: Record<string, string>,
): Record<string, string> {
	return {
		...ghostDescriptProperties,
		...shellDescriptProperties,
	};
}

function collectResolutionNotifications(
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

function replaceScopeRuntime(
	scopeId: number,
	runtimePlan: SurfaceAnimationRuntimePlan | null,
): void {
	stopScopeRuntime(scopeId);
	if (!runtimePlan || runtimePlan.tracks.length === 0) {
		return;
	}
	const runtime = createSurfaceAnimationRuntime(runtimePlan, {
		rng: resolverRng,
	});
	runtimeByScope.set(scopeId, runtime);
	runtime.start();
	applyRuntimeSnapshot(scopeId, runtime.getSnapshot().layers);
	const timer = setInterval(() => {
		const snapshot = runtime.tick();
		applyRuntimeSnapshot(scopeId, snapshot.layers);
		if (!runtime.isRunning()) {
			stopScopeRuntime(scopeId);
		}
	}, RUNTIME_TICK_MS);
	runtimeTimerByScope.set(scopeId, timer);
}

function applyRuntimeSnapshot(scopeId: number, layers: SurfaceRenderLayer[]): void {
	useSurfaceStore.setState((state) => {
		const baseSurfaceId = state.currentSurfaceByScope.get(scopeId) ?? null;
		if (baseSurfaceId === null) {
			return {};
		}
		const fileName =
			state.visualByScope.get(scopeId)?.fileName ??
			`surface${String(baseSurfaceId).padStart(4, "0")}.runtime`;
		const nextModel = buildVisualModelFromRenderLayers({
			surfaceId: baseSurfaceId,
			layers,
			fileName,
		});
		if (!nextModel) {
			return {};
		}
		const currentModel = state.visualByScope.get(scopeId) ?? null;
		if (isEquivalentVisualModel(currentModel, nextModel)) {
			return {};
		}
		const nextVisualByScope = new Map(state.visualByScope);
		nextVisualByScope.set(scopeId, nextModel);
		return {
			visualByScope: nextVisualByScope,
		};
	});
}

function isEquivalentVisualModel(
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

function stopScopeRuntime(scopeId: number): void {
	const timer = runtimeTimerByScope.get(scopeId);
	if (timer) {
		clearInterval(timer);
		runtimeTimerByScope.delete(scopeId);
	}
	const runtime = runtimeByScope.get(scopeId);
	if (runtime) {
		runtime.stop();
		runtimeByScope.delete(scopeId);
	}
}

function stopAllRuntimes(): void {
	for (const scopeId of runtimeTimerByScope.keys()) {
		stopScopeRuntime(scopeId);
	}
	for (const scopeId of runtimeByScope.keys()) {
		stopScopeRuntime(scopeId);
	}
}
