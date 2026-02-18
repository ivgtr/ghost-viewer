interface PixelDataLike {
	data: Uint8ClampedArray;
}

export function applyAlphaMask(layer: PixelDataLike, mask: PixelDataLike): void {
	const dataLength = Math.min(layer.data.length, mask.data.length);
	for (let index = 0; index < dataLength; index += 4) {
		layer.data[index + 3] = mask.data[index] ?? 0;
	}
}

export function applyColorKeyTransparency(layer: PixelDataLike): boolean {
	if (layer.data.length < 4) {
		return false;
	}

	for (let index = 3; index < layer.data.length; index += 4) {
		if ((layer.data[index] ?? 255) < 255) {
			return false;
		}
	}

	const keyR = layer.data[0] ?? 0;
	const keyG = layer.data[1] ?? 0;
	const keyB = layer.data[2] ?? 0;
	let changed = false;
	for (let index = 0; index < layer.data.length; index += 4) {
		if (
			layer.data[index] === keyR &&
			layer.data[index + 1] === keyG &&
			layer.data[index + 2] === keyB
		) {
			layer.data[index + 3] = 0;
			changed = true;
		}
	}
	return changed;
}
