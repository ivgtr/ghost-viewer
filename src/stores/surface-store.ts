import { parseDescriptFromBuffer } from "@/lib/parsers/descript";
import { resolveSurfaceId } from "@/lib/surfaces/surface-resolver";
import type {
	ShellSurfaceCatalog,
	SurfaceAliasMap,
	SurfaceAliasMapByShell,
	SurfaceDefinition,
	SurfaceDefinitionsByShell,
	SurfaceDiagnostic,
	SurfaceInitializeInput,
	SurfaceNotification,
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
	focusedScope: number;
	initialize: (input: SurfaceInitializeInput) => void;
	selectShell: (shellName: string | null) => void;
	ensureShellDescriptLoaded: (shellName: string | null) => void;
	setFocusedScope: (scopeId: number) => void;
	reset: () => void;
}

let resolverRng: () => number = Math.random;

const DEFAULT_CURRENT_SURFACE_BY_SCOPE = new Map<number, number | null>([
	[0, null],
	[1, null],
]);

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
		focusedScope: 0,
	},
	(set, get) => ({
		initialize: (input) => {
			resolverRng = input.rng ?? Math.random;
			const selectedShellName = resolveSelectedShellName(input.catalog, input.initialShellName);
			const baseNotifications = toNotifications(input.diagnostics);
			const resolved = resolveCurrentSurfaces({
				shellName: selectedShellName,
				catalog: input.catalog,
				definitionsByShell: input.definitionsByShell,
				aliasMapByShell: input.aliasMapByShell,
				ghostDescriptProperties: input.ghostDescriptProperties,
				shellDescriptProperties: {},
				previousSurfaceByScope: DEFAULT_CURRENT_SURFACE_BY_SCOPE,
				rng: resolverRng,
			});

			set({
				selectedShellName,
				catalog: input.catalog,
				definitions: input.definitionsByShell,
				aliasMap: input.aliasMapByShell,
				diagnostics: input.diagnostics,
				notifications: [...baseNotifications, ...resolved.notifications],
				ghostDescriptProperties: input.ghostDescriptProperties,
				shellDescriptCacheByName: {},
				currentSurfaceByScope: resolved.currentSurfaceByScope,
				focusedScope: 0,
			});
		},
		selectShell: (shellName) => {
			if (shellName === null) {
				set({
					selectedShellName: null,
					currentSurfaceByScope: new Map(DEFAULT_CURRENT_SURFACE_BY_SCOPE),
					notifications: toNotifications(get().diagnostics),
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
			const resolved = resolveCurrentSurfaces({
				shellName,
				catalog: refreshedState.catalog,
				definitionsByShell: refreshedState.definitions,
				aliasMapByShell: refreshedState.aliasMap,
				ghostDescriptProperties: refreshedState.ghostDescriptProperties,
				shellDescriptProperties: refreshedState.shellDescriptCacheByName[shellName] ?? {},
				previousSurfaceByScope: refreshedState.currentSurfaceByScope,
				rng: resolverRng,
			});
			set({
				selectedShellName: shellName,
				currentSurfaceByScope: resolved.currentSurfaceByScope,
				notifications: [...toNotifications(refreshedState.diagnostics), ...resolved.notifications],
			});
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
					decodeNotification = {
						level: "warning",
						code: "SHELL_DESCRIPT_DECODE_FAILED",
						message: `shell descript の解析に失敗しました: ${path}`,
						shellName,
						scopeId: null,
						surfaceId: null,
					};
				}
			}

			const nextCache = {
				...get().shellDescriptCacheByName,
				[shellName]: properties,
			};
			const nextNotifications = decodeNotification
				? [...get().notifications, decodeNotification]
				: get().notifications;
			set({
				shellDescriptCacheByName: nextCache,
				notifications: nextNotifications,
			});
		},
		setFocusedScope: (scopeId) => {
			if (!Number.isInteger(scopeId) || scopeId < 0) {
				return;
			}
			set({ focusedScope: scopeId });
		},
	}),
);

const surfaceStoreReset = useSurfaceStore.getState().reset;
useSurfaceStore.setState({
	reset: () => {
		resolverRng = Math.random;
		surfaceStoreReset();
	},
});

interface ResolveCurrentSurfaceOptions {
	shellName: string | null;
	catalog: ShellSurfaceCatalog[];
	definitionsByShell: SurfaceDefinitionsByShell;
	aliasMapByShell: SurfaceAliasMapByShell;
	ghostDescriptProperties: Record<string, string>;
	shellDescriptProperties: Record<string, string>;
	previousSurfaceByScope: Map<number, number | null>;
	rng: () => number;
}

function resolveCurrentSurfaces(options: ResolveCurrentSurfaceOptions): {
	currentSurfaceByScope: Map<number, number | null>;
	notifications: SurfaceNotification[];
} {
	if (options.shellName === null) {
		return {
			currentSurfaceByScope: new Map(DEFAULT_CURRENT_SURFACE_BY_SCOPE),
			notifications: [],
		};
	}

	const currentSurfaceByScope = new Map<number, number | null>();
	const notifications: SurfaceNotification[] = [];
	for (const scopeId of [0, 1]) {
		const nextSurfaceId = resolveSurfaceForScope(scopeId, options, notifications);
		currentSurfaceByScope.set(scopeId, nextSurfaceId);
	}

	return {
		currentSurfaceByScope,
		notifications,
	};
}

function resolveSurfaceForScope(
	scopeId: number,
	options: ResolveCurrentSurfaceOptions,
	notifications: SurfaceNotification[],
): number | null {
	const shellName = options.shellName;
	if (shellName === null) {
		return null;
	}

	const availableSurfaceIds = resolveAvailableSurfaceIds(
		shellName,
		options.catalog,
		options.definitionsByShell,
	);
	if (availableSurfaceIds.length === 0) {
		return null;
	}

	const requestedId = resolveRequestedSurfaceId(
		scopeId,
		availableSurfaceIds,
		mergeDescriptProperties(options.ghostDescriptProperties, options.shellDescriptProperties),
	);
	if (requestedId === null) {
		return null;
	}

	const shellAliasMap =
		options.aliasMapByShell.get(shellName) ?? new Map<number, Map<number, number[]>>();
	const resolvedId = resolveSurfaceId(scopeId, requestedId, {
		aliasMap: shellAliasMap,
		rng: options.rng,
	});
	if (isSurfaceRenderable(shellName, resolvedId, options.catalog)) {
		return resolvedId;
	}
	if (isSurfaceRenderable(shellName, requestedId, options.catalog)) {
		return requestedId;
	}

	const previousId = options.previousSurfaceByScope.get(scopeId) ?? null;
	if (previousId !== null) {
		notifications.push({
			level: "warning",
			code: "SURFACE_IMAGE_UNRESOLVED",
			message: `s[${resolvedId}] の画像を解決できないため直前の表示を維持しました`,
			shellName,
			scopeId,
			surfaceId: resolvedId,
		});
		return previousId;
	}

	notifications.push({
		level: "warning",
		code: "SURFACE_IMAGE_UNRESOLVED",
		message: `s[${resolvedId}] の画像を解決できませんでした`,
		shellName,
		scopeId,
		surfaceId: resolvedId,
	});
	return null;
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

function resolveAvailableSurfaceIds(
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

function isSurfaceRenderable(
	shellName: string,
	surfaceId: number,
	catalog: ShellSurfaceCatalog[],
): boolean {
	const shellCatalog = catalog.find((entry) => entry.shellName === shellName);
	if (!shellCatalog) {
		return false;
	}
	return shellCatalog.assets.some((asset) => asset.id === surfaceId);
}

function toNotifications(diagnostics: SurfaceDiagnostic[]): SurfaceNotification[] {
	return diagnostics.map((diagnostic) => ({
		level: diagnostic.level,
		code: diagnostic.code,
		message: diagnostic.message,
		shellName: diagnostic.shellName,
		scopeId: null,
		surfaceId: null,
	}));
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
