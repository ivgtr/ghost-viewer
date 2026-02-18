import type { BatchParseWorkerFile, ParseResult, WorkerRequest, WorkerResponse } from "@/types";

const PARSE_TIMEOUT_MS = 30_000;

interface ParseBatchOptions {
	files: BatchParseWorkerFile[];
	onProgress?: (percent: number) => void;
}

export function requestParseYayaBatch(options: ParseBatchOptions): Promise<ParseResult> {
	const transferList = options.files.map((file) => file.fileContent);
	return requestBatchWithWorker(
		{
			type: "parse-yaya-batch",
			files: options.files,
		},
		options.onProgress,
		transferList,
	);
}

export function requestParseSatoriBatch(options: ParseBatchOptions): Promise<ParseResult> {
	const transferList = options.files.map((file) => file.fileContent);
	return requestBatchWithWorker(
		{
			type: "parse-satori-batch",
			files: options.files,
		},
		options.onProgress,
		transferList,
	);
}

export function requestParseKawariBatch(options: ParseBatchOptions): Promise<ParseResult> {
	const transferList = options.files.map((file) => file.fileContent);
	return requestBatchWithWorker(
		{
			type: "parse-kawari-batch",
			files: options.files,
		},
		options.onProgress,
		transferList,
	);
}

function requestBatchWithWorker(
	request: WorkerRequest,
	onProgress?: (percent: number) => void,
	transferList: Transferable[] = [],
): Promise<ParseResult> {
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
					onProgress?.(data.percent);
					break;
			}
		};

		worker.onerror = (event) => {
			cleanup();
			reject(new Error(event.message || "Worker でエラーが発生しました"));
		};

		worker.postMessage(request, transferList);
	});
}
