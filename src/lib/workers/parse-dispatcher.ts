import { decodeWithAutoDetection } from "@/lib/encoding/detect";
import { parseSatoriDic } from "@/lib/parsers/satori";
import { parseYayaDicWithDiagnostics } from "@/lib/parsers/yaya";
import { createYayaPreprocessState } from "@/lib/parsers/yaya/internal/preprocessor";
import type { BatchParseWorkerFile, DicFunction, ParseDiagnostic, ParseResult } from "@/types";

interface BatchParseInput {
	files: BatchParseWorkerFile[];
}

function sortFilesByPath(files: BatchParseWorkerFile[]): BatchParseWorkerFile[] {
	return [...files].sort((a, b) => a.filePath.localeCompare(b.filePath));
}

export function dispatchParseYayaBatch(
	input: BatchParseInput,
	onProgress: (percent: number) => void,
): ParseResult {
	onProgress(0);

	const sortedFiles = sortFilesByPath(input.files);
	const preprocessState = createYayaPreprocessState();
	const functions: DicFunction[] = [];
	const diagnostics: ParseDiagnostic[] = [];

	if (sortedFiles.length === 0) {
		onProgress(100);
		return {
			shioriType: "yaya",
			functions,
			meta: null,
			diagnostics,
		};
	}

	for (const [index, file] of sortedFiles.entries()) {
		const { text } = decodeWithAutoDetection(file.fileContent);
		const parsed = parseYayaDicWithDiagnostics(text, file.filePath, {
			preprocessState,
		});
		functions.push(...parsed.functions);
		diagnostics.push(...parsed.diagnostics);

		const percent = Math.round(((index + 1) / sortedFiles.length) * 100);
		onProgress(percent);
	}

	return {
		shioriType: "yaya",
		functions,
		meta: null,
		diagnostics,
	};
}

export function dispatchParseSatoriBatch(
	input: BatchParseInput,
	onProgress: (percent: number) => void,
): ParseResult {
	onProgress(0);

	const sortedFiles = sortFilesByPath(input.files);
	const functions: DicFunction[] = [];

	if (sortedFiles.length === 0) {
		onProgress(100);
		return {
			shioriType: "satori",
			functions,
			meta: null,
			diagnostics: [],
		};
	}

	for (const [index, file] of sortedFiles.entries()) {
		const { text } = decodeWithAutoDetection(file.fileContent);
		functions.push(...parseSatoriDic(text, file.filePath));

		const percent = Math.round(((index + 1) / sortedFiles.length) * 100);
		onProgress(percent);
	}

	return {
		shioriType: "satori",
		functions,
		meta: null,
		diagnostics: [],
	};
}
