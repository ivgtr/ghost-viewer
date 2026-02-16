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

	const result = createStubResult(input.shioriType);

	onProgress(100);
	return result;
}

function createStubResult(shioriType: ShioriType): ParseResult {
	switch (shioriType) {
		case "yaya":
		case "satori":
		case "kawari":
		case "unknown":
			return { shioriType, functions: [], meta: null };
		default: {
			const _exhaustive: never = shioriType;
			throw new Error(`未対応の SHIORI タイプ: ${_exhaustive}`);
		}
	}
}
