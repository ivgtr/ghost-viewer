export interface PngMetadata {
	width: number;
	height: number;
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;

export function readPngMetadata(buffer: ArrayBuffer): PngMetadata | null {
	if (buffer.byteLength < 24) {
		return null;
	}

	const bytes = new Uint8Array(buffer);
	for (const [index, signatureByte] of PNG_SIGNATURE.entries()) {
		if (bytes[index] !== signatureByte) {
			return null;
		}
	}

	const chunkType = String.fromCharCode(
		bytes[12] ?? 0,
		bytes[13] ?? 0,
		bytes[14] ?? 0,
		bytes[15] ?? 0,
	);
	if (chunkType !== "IHDR") {
		return null;
	}

	const view = new DataView(buffer);
	const width = view.getUint32(16);
	const height = view.getUint32(20);
	if (width <= 0 || height <= 0) {
		return null;
	}

	return {
		width,
		height,
	};
}
