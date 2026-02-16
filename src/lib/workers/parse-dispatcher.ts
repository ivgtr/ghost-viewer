import { decodeWithAutoDetection } from "@/lib/encoding/detect";
import { parseSatoriDic } from "@/lib/parsers/satori";
import type { ParseResult, ShioriType } from "@/types";

interface ParseInput {
	fileContent: ArrayBuffer;
	fileName: string;
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
			const functions = parseSatoriDic(text, input.fileName);
			onProgress(100);
			return { shioriType: "satori", functions, meta: null };
		}
		case "yaya":
		case "kawari":
		case "unknown":
			onProgress(100);
			return { shioriType: input.shioriType, functions: [], meta: null };
		default: {
			const _exhaustive: never = input.shioriType;
			throw new Error(`未対応の SHIORI タイプ: ${_exhaustive}`);
		}
	}
}
