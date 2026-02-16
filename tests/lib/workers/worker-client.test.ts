import { requestParse } from "@/lib/workers/worker-client";
import type { WorkerResponse } from "@/types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class MockWorker {
	onmessage: ((event: MessageEvent) => void) | null = null;
	onerror: ((event: ErrorEvent) => void) | null = null;
	postMessage = vi.fn();
	terminate = vi.fn();

	simulateMessage(data: WorkerResponse) {
		this.onmessage?.(new MessageEvent("message", { data }));
	}

	simulateError(message: string) {
		this.onerror?.({ message } as ErrorEvent);
	}
}

let mockWorkerInstance: MockWorker;

vi.stubGlobal(
	"Worker",
	class {
		onmessage: ((event: MessageEvent) => void) | null = null;
		onerror: ((event: ErrorEvent) => void) | null = null;
		postMessage: ReturnType<typeof vi.fn>;
		terminate: ReturnType<typeof vi.fn>;

		constructor() {
			mockWorkerInstance = new MockWorker();
			this.postMessage = mockWorkerInstance.postMessage;
			this.terminate = mockWorkerInstance.terminate;

			Object.defineProperty(mockWorkerInstance, "onmessage", {
				get: () => this.onmessage,
				set: (v) => {
					this.onmessage = v;
				},
			});
			Object.defineProperty(mockWorkerInstance, "onerror", {
				get: () => this.onerror,
				set: (v) => {
					this.onerror = v;
				},
			});
		}
	},
);

const defaultOptions = {
	fileContent: new ArrayBuffer(8),
	fileName: "test.dic",
	shioriType: "yaya" as const,
};

describe("requestParse", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("parsed レスポンスで resolve する", async () => {
		const result = { shioriType: "yaya" as const, functions: [], meta: null };
		const promise = requestParse({ ...defaultOptions });

		mockWorkerInstance.simulateMessage({ type: "parsed", result });

		await expect(promise).resolves.toEqual(result);
	});

	it("error レスポンスで reject する", async () => {
		const promise = requestParse({ ...defaultOptions });

		mockWorkerInstance.simulateMessage({
			type: "error",
			message: "解析に失敗",
		});

		await expect(promise).rejects.toThrow("解析に失敗");
	});

	it("onerror で reject する", async () => {
		const promise = requestParse({ ...defaultOptions });

		mockWorkerInstance.simulateError("Worker crashed");

		await expect(promise).rejects.toThrow("Worker crashed");
	});

	it("タイムアウトで reject する", async () => {
		const promise = requestParse({ ...defaultOptions });

		vi.advanceTimersByTime(30_000);

		await expect(promise).rejects.toThrow("解析がタイムアウトしました");
	});

	it("onProgress コールバックが呼ばれる", async () => {
		const onProgress = vi.fn();
		const result = { shioriType: "yaya" as const, functions: [], meta: null };
		const promise = requestParse({ ...defaultOptions, onProgress });

		mockWorkerInstance.simulateMessage({ type: "progress", percent: 50 });
		mockWorkerInstance.simulateMessage({ type: "parsed", result });

		await promise;

		expect(onProgress).toHaveBeenCalledWith(50);
	});

	it("postMessage が fileContent を transfer リストに含む", () => {
		const fileContent = new ArrayBuffer(16);
		requestParse({ ...defaultOptions, fileContent });

		expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "parse",
				fileName: "test.dic",
				shioriType: "yaya",
			}),
			[fileContent],
		);
	});

	it("完了後に terminate が呼ばれる", async () => {
		const result = { shioriType: "yaya" as const, functions: [], meta: null };
		const promise = requestParse({ ...defaultOptions });

		mockWorkerInstance.simulateMessage({ type: "parsed", result });
		await promise;

		expect(mockWorkerInstance.terminate).toHaveBeenCalled();
	});

	it("エラー時にも terminate が呼ばれる", async () => {
		const promise = requestParse({ ...defaultOptions });

		mockWorkerInstance.simulateMessage({
			type: "error",
			message: "fail",
		});

		await promise.catch(() => {});

		expect(mockWorkerInstance.terminate).toHaveBeenCalled();
	});

	it("タイムアウト時にも terminate が呼ばれる", async () => {
		const promise = requestParse({ ...defaultOptions });

		vi.advanceTimersByTime(30_000);

		await promise.catch(() => {});

		expect(mockWorkerInstance.terminate).toHaveBeenCalled();
	});
});
