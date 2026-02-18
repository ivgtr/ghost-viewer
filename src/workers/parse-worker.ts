import { parseWorkerRequest } from "@/lib/validation/worker-message";
import { dispatchParseSatoriBatch, dispatchParseYayaBatch } from "@/lib/workers/parse-dispatcher";
import type { ParseResult, WorkerResponse } from "@/types";

self.addEventListener("message", (event: MessageEvent<unknown>) => {
	try {
		const request = parseWorkerRequest(event.data);
		let result: ParseResult;
		switch (request.type) {
			case "parse-yaya-batch":
				result = dispatchParseYayaBatch(request, (percent) => {
					self.postMessage({ type: "progress", percent } satisfies WorkerResponse);
				});
				break;
			case "parse-satori-batch":
				result = dispatchParseSatoriBatch(request, (percent) => {
					self.postMessage({ type: "progress", percent } satisfies WorkerResponse);
				});
				break;
			default: {
				const _exhaustive: never = request;
				throw new Error(`未対応の WorkerRequest: ${_exhaustive}`);
			}
		}
		self.postMessage({ type: "parsed", result } satisfies WorkerResponse);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "解析中に不明なエラーが発生しました";
		self.postMessage({ type: "error", message } satisfies WorkerResponse);
	}
});
