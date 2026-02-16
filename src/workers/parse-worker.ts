import { dispatchParse } from "@/lib/workers/parse-dispatcher";
import type { WorkerRequest, WorkerResponse } from "@/types";

self.addEventListener("message", (event: MessageEvent<WorkerRequest>) => {
	try {
		const result = dispatchParse(event.data, (percent) => {
			self.postMessage({ type: "progress", percent } satisfies WorkerResponse);
		});
		self.postMessage({ type: "parsed", result } satisfies WorkerResponse);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : "解析中に不明なエラーが発生しました";
		self.postMessage({ type: "error", message } satisfies WorkerResponse);
	}
});
