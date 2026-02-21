import { applyAlphaMask, applyColorKeyTransparency } from "@/lib/surfaces/canvas-alpha";

interface DrawCanvasLayerOptions {
	context: CanvasRenderingContext2D;
	layerContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	maskContext: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
	layerCanvas: OffscreenCanvas | HTMLCanvasElement;
	maskCanvas: OffscreenCanvas | HTMLCanvasElement;
	source: ImageBitmap;
	mask: ImageBitmap | null;
	drawX: number;
	drawY: number;
	drawWidth: number;
	drawHeight: number;
}

export function drawCanvasLayer(options: DrawCanvasLayerOptions): void {
	const sourceWidth = Math.max(1, options.source.width);
	const sourceHeight = Math.max(1, options.source.height);
	const drawWidth = Math.max(1, Math.floor(options.drawWidth));
	const drawHeight = Math.max(1, Math.floor(options.drawHeight));
	options.layerCanvas.width = sourceWidth;
	options.layerCanvas.height = sourceHeight;
	options.layerContext.imageSmoothingEnabled = false;
	options.maskContext.imageSmoothingEnabled = false;
	options.layerContext.clearRect(0, 0, sourceWidth, sourceHeight);
	options.layerContext.drawImage(options.source, 0, 0, sourceWidth, sourceHeight);
	const layerImageData = options.layerContext.getImageData(0, 0, sourceWidth, sourceHeight);

	if (options.mask) {
		options.maskCanvas.width = sourceWidth;
		options.maskCanvas.height = sourceHeight;
		options.maskContext.clearRect(0, 0, sourceWidth, sourceHeight);
		options.maskContext.drawImage(options.mask, 0, 0, sourceWidth, sourceHeight);
		const maskImageData = options.maskContext.getImageData(0, 0, sourceWidth, sourceHeight);
		applyAlphaMask(layerImageData, maskImageData);
	} else {
		applyColorKeyTransparency(layerImageData, sourceWidth, sourceHeight);
	}
	options.layerContext.putImageData(layerImageData, 0, 0);

	options.context.drawImage(
		options.layerCanvas,
		options.drawX,
		options.drawY,
		drawWidth,
		drawHeight,
	);
}

export function createScratchCanvas(
	width: number,
	height: number,
): OffscreenCanvas | HTMLCanvasElement {
	if (typeof OffscreenCanvas !== "undefined") {
		return new OffscreenCanvas(width, height);
	}
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	return canvas;
}
