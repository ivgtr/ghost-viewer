interface PixelDataLike {
	data: Uint8ClampedArray;
}

const COLOR_KEY_TOLERANCE = 20;

export function applyAlphaMask(layer: PixelDataLike, mask: PixelDataLike): void {
	const dataLength = Math.min(layer.data.length, mask.data.length);
	for (let index = 0; index < dataLength; index += 4) {
		layer.data[index + 3] = mask.data[index] ?? 0;
	}
}

export function applyColorKeyTransparency(
	layer: PixelDataLike,
	width: number,
	height: number,
): boolean {
	if (layer.data.length < 4 || width <= 0 || height <= 0) {
		return false;
	}

	if (hasNonOpaqueAlpha(layer.data)) {
		return false;
	}

	const keyColor = resolveColorKeyFromTopLeft(layer, width);
	let changed = false;
	for (let pixelIndex = 0; pixelIndex < width * height; pixelIndex += 1) {
		const offset = pixelIndex * 4;
		const alpha = layer.data[offset + 3] ?? 0;
		if (alpha === 0) {
			continue;
		}
		const r = layer.data[offset] ?? 0;
		const g = layer.data[offset + 1] ?? 0;
		const b = layer.data[offset + 2] ?? 0;
		if (isNearColor(r, g, b, keyColor.r, keyColor.g, keyColor.b, COLOR_KEY_TOLERANCE)) {
			layer.data[offset + 3] = 0;
			changed = true;
		}
	}
	return changed;
}

function resolveColorKeyFromTopLeft(
	layer: PixelDataLike,
	width: number,
): { r: number; g: number; b: number } {
	const offset = indexOfPixel(0, 0, width) * 4;
	return {
		r: layer.data[offset] ?? 0,
		g: layer.data[offset + 1] ?? 0,
		b: layer.data[offset + 2] ?? 0,
	};
}

function hasNonOpaqueAlpha(data: Uint8ClampedArray): boolean {
	for (let offset = 3; offset < data.length; offset += 4) {
		if ((data[offset] ?? 255) < 255) {
			return true;
		}
	}
	return false;
}

function isNearColor(
	r: number,
	g: number,
	b: number,
	keyR: number,
	keyG: number,
	keyB: number,
	tolerance: number,
): boolean {
	return (
		Math.abs(r - keyR) <= tolerance &&
		Math.abs(g - keyG) <= tolerance &&
		Math.abs(b - keyB) <= tolerance
	);
}

function indexOfPixel(x: number, y: number, width: number): number {
	return y * width + x;
}
