import type { SurfaceCharacterPlacement, SurfaceScene, SurfaceSetLayout } from "@/types";

interface BuildSurfaceSetLayoutOptions {
	viewportWidth: number;
	viewportHeight: number;
	scene: SurfaceScene;
	padding?: number;
}

const DEFAULT_VIEWPORT_WIDTH = 640;
const DEFAULT_VIEWPORT_HEIGHT = 360;
const DEFAULT_PADDING = 16;

export function buildSurfaceSetLayout(options: BuildSurfaceSetLayoutOptions): SurfaceSetLayout {
	const viewportWidth = normalizeViewportSize(options.viewportWidth, DEFAULT_VIEWPORT_WIDTH);
	const viewportHeight = normalizeViewportSize(options.viewportHeight, DEFAULT_VIEWPORT_HEIGHT);
	const padding = normalizeNonNegative(options.padding, DEFAULT_PADDING);
	const nodes = options.scene.nodes;

	if (nodes.length === 0) {
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

	const worldBounds = resolveWorldBounds(nodes);
	const scale = resolveScale({
		viewportWidth,
		viewportHeight,
		padding,
		worldWidth: worldBounds.worldWidth,
		worldHeight: worldBounds.worldHeight,
	});
	const scaledWidth = worldBounds.worldWidth * scale;
	const scaledHeight = worldBounds.worldHeight * scale;
	const baseOffsetX = (viewportWidth - scaledWidth) / 2;
	const baseOffsetY = (viewportHeight - scaledHeight) / 2;
	const freeOffsetX = options.scene.alignmentMode === "free" ? options.scene.defaultLeft : 0;
	const freeOffsetY = options.scene.alignmentMode === "free" ? options.scene.defaultTop : 0;

	const placements: SurfaceCharacterPlacement[] = nodes.map((node) => {
		const worldTop = node.worldBottom + node.height;
		return {
			scopeId: node.scopeId,
			surfaceId: node.surfaceId,
			fileName: node.fileName,
			worldLeft: node.worldLeft,
			worldBottom: node.worldBottom,
			width: node.width,
			height: node.height,
			screenX: (node.worldLeft - worldBounds.worldMinX) * scale + baseOffsetX + freeOffsetX,
			screenY: (worldBounds.worldMaxY - worldTop) * scale + baseOffsetY + freeOffsetY,
			screenWidth: node.width * scale,
			screenHeight: node.height * scale,
			position: node.position,
		};
	});

	return {
		viewportWidth,
		viewportHeight,
		scale,
		offsetX: baseOffsetX + freeOffsetX,
		offsetY: baseOffsetY + freeOffsetY,
		worldMinX: worldBounds.worldMinX,
		worldMinY: worldBounds.worldMinY,
		worldMaxX: worldBounds.worldMaxX,
		worldMaxY: worldBounds.worldMaxY,
		worldWidth: worldBounds.worldWidth,
		worldHeight: worldBounds.worldHeight,
		placements,
	};
}

function resolveWorldBounds(nodes: SurfaceScene["nodes"]): {
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

	for (const node of nodes) {
		worldMinX = Math.min(worldMinX, node.worldLeft);
		worldMinY = Math.min(worldMinY, node.worldBottom);
		worldMaxX = Math.max(worldMaxX, node.worldLeft + node.width);
		worldMaxY = Math.max(worldMaxY, node.worldBottom + node.height);
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
