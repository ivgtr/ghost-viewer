import {
	dispatchParseKawariBatch,
	dispatchParseSatoriBatch,
	dispatchParseYayaBatch,
} from "@/lib/workers/parse-dispatcher";
import type { ParseResult, WorkerRequest, WorkerResponse } from "@/types";

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
	try {
		let result: ParseResult;
		switch (event.data.type) {
			case "parse-yaya-batch":
				result = dispatchParseYayaBatch(event.data, (percent) => {
					self.postMessage({ type: "progress", percent } satisfies WorkerResponse);
				});
				break;
			case "parse-satori-batch":
				result = dispatchParseSatoriBatch(event.data, (percent) => {
					self.postMessage({ type: "progress", percent } satisfies WorkerResponse);
				});
				break;
			case "parse-kawari-batch":
				result = dispatchParseKawariBatch(event.data, (percent) => {
					self.postMessage({ type: "progress", percent } satisfies WorkerResponse);
				});
				break;
			default: {
				const _exhaustive: never = event.data;
				throw new Error(`未対応の WorkerRequest: ${_exhaustive}`);
			}
		}
		self.postMessage({ type: "parsed", result } satisfies WorkerResponse);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "解析中に不明なエラーが発生しました";
		self.postMessage({ type: "error", message } satisfies WorkerResponse);
	}
});
