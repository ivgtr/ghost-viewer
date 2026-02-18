import type { SurfaceCharacterPlacement, SurfacePositionSource, SurfaceSetLayout } from "@/types";

interface SurfaceLayoutCharacterInput {
	scopeId: number;
	surfaceId: number | null;
	fileName: string | null;
	width: number;
	height: number;
}

interface BuildSurfaceSetLayoutOptions {
	viewportWidth: number;
	viewportHeight: number;
	descriptProperties: Record<string, string>;
	characters: SurfaceLayoutCharacterInput[];
	padding?: number;
	gap?: number;
}

const DEFAULT_VIEWPORT_WIDTH = 640;
const DEFAULT_VIEWPORT_HEIGHT = 360;
const DEFAULT_PADDING = 16;
const DEFAULT_GAP = 24;

export function buildSurfaceSetLayout(options: BuildSurfaceSetLayoutOptions): SurfaceSetLayout {
	const viewportWidth = normalizeViewportSize(options.viewportWidth, DEFAULT_VIEWPORT_WIDTH);
	const viewportHeight = normalizeViewportSize(options.viewportHeight, DEFAULT_VIEWPORT_HEIGHT);
	const padding = normalizeNonNegative(options.padding, DEFAULT_PADDING);
	const gap = normalizeNonNegative(options.gap, DEFAULT_GAP);
	const characters = options.characters.filter(
		(character) => character.width > 0 && character.height > 0,
	);

	if (characters.length === 0) {
		return {
			viewportWidth,
			viewportHeight,
			scale: 1,
			offsetX: 0,
			offsetY: 0,
			worldMinX: 0,
			worldMinY: 0,
			worldMaxX: 0,
			worldMaxY: 0,
			worldWidth: 0,
			worldHeight: 0,
			placements: [],
		};
	}

	const characterByScope = new Map<number, SurfaceLayoutCharacterInput>();
	for (const character of characters) {
		characterByScope.set(character.scopeId, character);
	}

	const scope0Character = characterByScope.get(0);
	const scope0Source = resolvePositionSource({
		scopeId: 0,
		descriptProperties: options.descriptProperties,
		fallbackX: 0,
		fallbackY: 0,
	});
	const scope1Source = resolvePositionSource({
		scopeId: 1,
		descriptProperties: options.descriptProperties,
		fallbackX: scope0Source.x + (scope0Character?.width ?? 0) + gap,
		fallbackY: scope0Source.y,
	});

	const positionSourceByScope = new Map<number, SurfacePositionSource>([
		[0, scope0Source],
		[1, scope1Source],
	]);

	const worldPlacements = characters.map((character) => {
		const positionSource =
			positionSourceByScope.get(character.scopeId) ??
			createFallbackPositionSource(character.scopeId, 0, 0);
		return {
			scopeId: character.scopeId,
			surfaceId: character.surfaceId,
			fileName: character.fileName,
			worldX: positionSource.x,
			worldY: positionSource.y,
			width: character.width,
			height: character.height,
			screenX: 0,
			screenY: 0,
			screenWidth: 0,
			screenHeight: 0,
			positionSource,
		} satisfies SurfaceCharacterPlacement;
	});

	const worldBounds = resolveWorldBounds(worldPlacements);
	const scale = resolveScale({
		viewportWidth,
		viewportHeight,
		padding,
		worldWidth: worldBounds.worldWidth,
		worldHeight: worldBounds.worldHeight,
	});
	const scaledWidth = worldBounds.worldWidth * scale;
	const scaledHeight = worldBounds.worldHeight * scale;
	const offsetX = (viewportWidth - scaledWidth) / 2;
	const offsetY = (viewportHeight - scaledHeight) / 2;

	const placements = worldPlacements.map((placement) => ({
		...placement,
		screenX: (placement.worldX - worldBounds.worldMinX) * scale + offsetX,
		screenY: (worldBounds.worldMaxY - (placement.worldY + placement.height)) * scale + offsetY,
		screenWidth: placement.width * scale,
		screenHeight: placement.height * scale,
	}));

	return {
		viewportWidth,
		viewportHeight,
		scale,
		offsetX,
		offsetY,
		worldMinX: worldBounds.worldMinX,
		worldMinY: worldBounds.worldMinY,
		worldMaxX: worldBounds.worldMaxX,
		worldMaxY: worldBounds.worldMaxY,
		worldWidth: worldBounds.worldWidth,
		worldHeight: worldBounds.worldHeight,
		placements,
	};
}

interface ResolvePositionSourceOptions {
	scopeId: number;
	descriptProperties: Record<string, string>;
	fallbackX: number;
	fallbackY: number;
}

function resolvePositionSource(options: ResolvePositionSourceOptions): SurfacePositionSource {
	const xResolved = resolvePositionValue(
		resolveCoordinateKeys(options.scopeId, "x"),
		options.descriptProperties,
	);
	const yResolved = resolvePositionValue(
		resolveCoordinateKeys(options.scopeId, "y"),
		options.descriptProperties,
	);

	return {
		scopeId: options.scopeId,
		x: xResolved.value ?? options.fallbackX,
		y: yResolved.value ?? options.fallbackY,
		xKey: xResolved.key,
		yKey: yResolved.key,
		isFallback: xResolved.value === null || yResolved.value === null,
	};
}

function createFallbackPositionSource(
	scopeId: number,
	x: number,
	y: number,
): SurfacePositionSource {
	return {
		scopeId,
		x,
		y,
		xKey: null,
		yKey: null,
		isFallback: true,
	};
}

function resolveCoordinateKeys(scopeId: number, axis: "x" | "y"): string[] {
	if (scopeId === 0) {
		return [`sakura.default${axis}`, `char0.default${axis}`];
	}
	if (scopeId === 1) {
		return [`kero.default${axis}`, `char1.default${axis}`];
	}
	return [`char${scopeId}.default${axis}`];
}

function resolvePositionValue(
	keys: string[],
	descriptProperties: Record<string, string>,
): { value: number | null; key: string | null } {
	for (const key of keys) {
		const rawValue = descriptProperties[key];
		if (rawValue === undefined) {
			continue;
		}
		const parsed = Number(rawValue.trim());
		if (!Number.isFinite(parsed)) {
			continue;
		}
		return {
			value: parsed,
			key,
		};
	}
	return {
		value: null,
		key: null,
	};
}

function resolveWorldBounds(placements: SurfaceCharacterPlacement[]): {
	worldMinX: number;
	worldMinY: number;
	worldMaxX: number;
	worldMaxY: number;
	worldWidth: number;
	worldHeight: number;
} {
	let worldMinX = Number.POSITIVE_INFINITY;
	let worldMinY = Number.POSITIVE_INFINITY;
	let worldMaxX = Number.NEGATIVE_INFINITY;
	let worldMaxY = Number.NEGATIVE_INFINITY;

	for (const placement of placements) {
		worldMinX = Math.min(worldMinX, placement.worldX);
		worldMinY = Math.min(worldMinY, placement.worldY);
		worldMaxX = Math.max(worldMaxX, placement.worldX + placement.width);
		worldMaxY = Math.max(worldMaxY, placement.worldY + placement.height);
	}

	if (!Number.isFinite(worldMinX) || !Number.isFinite(worldMinY)) {
		return {
			worldMinX: 0,
			worldMinY: 0,
			worldMaxX: 0,
			worldMaxY: 0,
			worldWidth: 0,
			worldHeight: 0,
		};
	}

	return {
		worldMinX,
		worldMinY,
		worldMaxX,
		worldMaxY,
		worldWidth: worldMaxX - worldMinX,
		worldHeight: worldMaxY - worldMinY,
	};
}

function resolveScale(options: {
	viewportWidth: number;
	viewportHeight: number;
	padding: number;
	worldWidth: number;
	worldHeight: number;
}): number {
	if (options.worldWidth <= 0 || options.worldHeight <= 0) {
		return 1;
	}
	const availableWidth = Math.max(1, options.viewportWidth - options.padding * 2);
	const availableHeight = Math.max(1, options.viewportHeight - options.padding * 2);
	const scale = Math.min(
		availableWidth / options.worldWidth,
		availableHeight / options.worldHeight,
	);
	if (!Number.isFinite(scale) || scale <= 0) {
		return 1;
	}
	return scale;
}

function normalizeViewportSize(value: number, fallback: number): number {
	if (!Number.isFinite(value) || value <= 0) {
		return fallback;
	}
	return value;
}

function normalizeNonNegative(value: number | undefined, fallback: number): number {
	if (value === undefined || !Number.isFinite(value) || value < 0) {
		return fallback;
	}
	return value;
}
