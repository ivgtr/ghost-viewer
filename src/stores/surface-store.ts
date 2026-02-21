import { parseDescriptFromBuffer } from "@/lib/parsers/descript";
import { createSurfaceAnimationRuntime } from "@/lib/surfaces/surface-animation-runtime";
import {
	appendSyncNotifications,
	createSurfaceNotification,
	deduplicateSurfaceNotifications,
	diagnosticsToSurfaceNotifications,
} from "@/lib/surfaces/surface-notification-policy";
import {
	collectResolutionNotifications,
	isEquivalentVisualModel,
	mergeDescriptProperties,
	resolveAvailableSurfaceIds as resolveAvailableSurfaceIdsImpl,
	resolveCurrentSurfaces,
	resolveRequestedSurface,
	resolveRequestedSurfaceId,
	resolveSelectedShellName,
} from "@/lib/surfaces/surface-resolution";
import { resolveSurfaceVisual } from "@/lib/surfaces/surface-visual-resolver";
import { buildVisualModelFromRenderLayers } from "@/lib/surfaces/surface-visual-model";
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
	setSecondaryScopeId: (scopeId: number, scopeSurfaceIds?: number[]) => void;
	setAvailableSecondaryScopeIds: (scopeIds: number[]) => void;
	reset: () => void;
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

export function resolveAvailableSurfaceIds(
	shellName: string,
	catalog: ShellSurfaceCatalog[],
	definitionsByShell: SurfaceDefinitionsByShell,
): number[] {
	return resolveAvailableSurfaceIdsImpl(shellName, catalog, definitionsByShell);
}

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
		setSecondaryScopeId: (scopeId, scopeSurfaceIds) => {
			const state = get();
			if (
				!Number.isInteger(scopeId) ||
				scopeId < 1 ||
				!state.availableSecondaryScopeIds.includes(scopeId)
			) {
				return;
			}

			const shellName = state.selectedShellName;
			if (shellName === null) {
				set({ secondaryScopeId: scopeId });
				return;
			}

			const fileContents = useFileContentStore.getState().fileContents;
			const allSurfaceIds = resolveAvailableSurfaceIdsImpl(
				shellName,
				state.catalog,
				state.definitions,
			);
			const effectiveSurfaceIds =
				scopeSurfaceIds && scopeSurfaceIds.length > 0
					? scopeSurfaceIds.filter((id) => id >= 0 && allSurfaceIds.includes(id))
					: allSurfaceIds;
			const requestedSurfaceId =
				state.currentSurfaceByScope.get(scopeId) ??
				resolveRequestedSurfaceId(
					scopeId,
					effectiveSurfaceIds.length > 0 ? effectiveSurfaceIds : allSurfaceIds,
					mergeDescriptProperties(
						state.ghostDescriptProperties,
						state.shellDescriptCacheByName[shellName] ?? {},
					),
				) ??
				0;
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
				secondaryScopeId: scopeId,
				currentSurfaceByScope: nextCurrentSurfaceByScope,
				visualByScope: nextVisualByScope,
				notifications: deduplicateSurfaceNotifications([
					...state.notifications,
					...result.notifications,
				]),
			});
			const previousSecondaryScopeId = state.secondaryScopeId;
			if (previousSecondaryScopeId !== scopeId) {
				stopScopeRuntime(previousSecondaryScopeId);
			}
			replaceScopeRuntime(scopeId, result.runtimePlan);
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
