import type { SurfaceRenderLayer, SurfaceVisualLayer, SurfaceVisualModel } from "@/types";

export function buildVisualModelFromRenderLayers(options: {
	surfaceId: number;
	layers: SurfaceRenderLayer[];
	fileName: string;
}): SurfaceVisualModel | null {
	if (options.layers.length === 0) {
		return null;
	}

	const bounds = resolveLayerBounds(options.layers);
	const normalizedLayers: SurfaceVisualLayer[] = options.layers.map((layer) => ({
		path: layer.sourcePath,
		alphaMaskPath: layer.alphaMaskPath,
		x: layer.x - bounds.minX,
		y: layer.y - bounds.minY,
		width: layer.width,
		height: layer.height,
		imageUrl: layer.sourcePath,
		alphaMaskUrl: null,
	}));

	return {
		surfaceId: options.surfaceId,
		fileName: options.fileName,
		mode: "composite",
		width: bounds.maxX - bounds.minX,
		height: bounds.maxY - bounds.minY,
		layers: normalizedLayers,
	};
}

function resolveLayerBounds(layers: SurfaceRenderLayer[]): {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
} {
	let minX = Number.POSITIVE_INFINITY;
	let minY = Number.POSITIVE_INFINITY;
	let maxX = Number.NEGATIVE_INFINITY;
	let maxY = Number.NEGATIVE_INFINITY;

	for (const layer of layers) {
		minX = Math.min(minX, layer.x);
		minY = Math.min(minY, layer.y);
		maxX = Math.max(maxX, layer.x + layer.width);
		maxY = Math.max(maxY, layer.y + layer.height);
	}

	return {
		minX,
		minY,
		maxX,
		maxY,
	};
}
