import type { ParseResult, ShioriType, WorkerRequest, WorkerResponse } from "@/types";

const PARSE_TIMEOUT_MS = 30_000;

interface ParseOptions {
	fileContent: ArrayBuffer;
	filePath: string;
	shioriType: ShioriType;
	onProgress?: (percent: number) => void;
}

export function requestParse(options: ParseOptions): Promise<ParseResult> {
	return new Promise<ParseResult>((resolve, reject) => {
		const worker = new Worker(new URL("../../workers/parse-worker.ts", import.meta.url), {
			type: "module",
		});

		const cleanup = () => {
			clearTimeout(timeoutId);
			worker.terminate();
		};

		const timeoutId = setTimeout(() => {
			cleanup();
			reject(new Error("解析がタイムアウトしました"));
		}, PARSE_TIMEOUT_MS);

		worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
			const data = event.data;
			switch (data.type) {
				case "parsed":
					cleanup();
					resolve(data.result);
					break;
				case "error":
					cleanup();
					reject(new Error(data.message));
					break;
				case "progress":
					options.onProgress?.(data.percent);
					break;
			}
		};

		worker.onerror = (event) => {
			cleanup();
			reject(new Error(event.message || "Worker でエラーが発生しました"));
		};

		const request: WorkerRequest = {
			type: "parse",
			fileContent: options.fileContent,
			filePath: options.filePath,
			shioriType: options.shioriType,
		};
		worker.postMessage(request, [options.fileContent]);
	});
}
