import { decodeWithAutoDetection } from "@/lib/encoding/detect";
import { parseKawariDic } from "@/lib/parsers/kawari";
import { parseSatoriDic } from "@/lib/parsers/satori";
import { parseYayaDic } from "@/lib/parsers/yaya";
import type { ParseResult, ShioriType } from "@/types";

interface ParseInput {
	fileContent: ArrayBuffer;
	filePath: string;
	shioriType: ShioriType;
}

export function dispatchParse(
	input: ParseInput,
	onProgress: (percent: number) => void,
): ParseResult {
	onProgress(0);

	switch (input.shioriType) {
		case "satori": {
			const { text } = decodeWithAutoDetection(input.fileContent);
			onProgress(50);
			const functions = parseSatoriDic(text, input.filePath);
			onProgress(100);
			return { shioriType: "satori", functions, meta: null };
		}
		case "yaya": {
			const { text: yayaText } = decodeWithAutoDetection(input.fileContent);
			onProgress(50);
			const yayaFunctions = parseYayaDic(yayaText, input.filePath);
			onProgress(100);
			return { shioriType: "yaya", functions: yayaFunctions, meta: null };
		}
		case "kawari": {
			const { text: kawariText } = decodeWithAutoDetection(input.fileContent);
			onProgress(50);
			const kawariFunctions = parseKawariDic(kawariText, input.filePath);
			onProgress(100);
			return { shioriType: "kawari", functions: kawariFunctions, meta: null };
		}
		case "unknown":
			onProgress(100);
			return { shioriType: "unknown", functions: [], meta: null };
		default: {
			const _exhaustive: never = input.shioriType;
			throw new Error(`未対応の SHIORI タイプ: ${_exhaustive}`);
		}
	}
}
