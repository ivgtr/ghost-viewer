import {
	requestParseKawariBatch,
	requestParseSatoriBatch,
	requestParseYayaBatch,
} from "@/lib/workers/worker-client";
import type { ParseResult, WorkerResponse } from "@/types";
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

interface ParseBatchOptions {
	files: { filePath: string; fileContent: ArrayBuffer }[];
	onProgress?: (percent: number) => void;
}

type ParseBatchRequest = (options: ParseBatchOptions) => Promise<ParseResult>;

interface RequestTestCase {
	label: string;
	requestType: "parse-yaya-batch" | "parse-satori-batch" | "parse-kawari-batch";
	shioriType: "yaya" | "satori" | "kawari";
	request: ParseBatchRequest;
}

const REQUEST_TEST_CASES: RequestTestCase[] = [
	{
		label: "YAYA",
		requestType: "parse-yaya-batch",
		shioriType: "yaya",
		request: requestParseYayaBatch,
	},
	{
		label: "Satori",
		requestType: "parse-satori-batch",
		shioriType: "satori",
		request: requestParseSatoriBatch,
	},
	{
		label: "Kawari",
		requestType: "parse-kawari-batch",
		shioriType: "kawari",
		request: requestParseKawariBatch,
	},
];

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

describe("worker-client batch requests", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe.each(REQUEST_TEST_CASES)("$label", (testCase) => {
		it("parsed レスポンスで resolve する", async () => {
			const result: ParseResult = {
				shioriType: testCase.shioriType,
				functions: [],
				meta: null,
				diagnostics: [],
			};
			const promise = testCase.request({
				files: [{ filePath: "test.dic", fileContent: new ArrayBuffer(8) }],
			});

			mockWorkerInstance.simulateMessage({ type: "parsed", result });

			await expect(promise).resolves.toEqual(result);
		});

		it("error レスポンスで reject する", async () => {
			const promise = testCase.request({
				files: [{ filePath: "test.dic", fileContent: new ArrayBuffer(8) }],
			});

			mockWorkerInstance.simulateMessage({
				type: "error",
				message: "解析に失敗",
			});

			await expect(promise).rejects.toThrow("解析に失敗");
		});

		it("onerror で reject する", async () => {
			const promise = testCase.request({
				files: [{ filePath: "test.dic", fileContent: new ArrayBuffer(8) }],
			});

			mockWorkerInstance.simulateError("Worker crashed");

			await expect(promise).rejects.toThrow("Worker crashed");
		});

		it("タイムアウトで reject する", async () => {
			const promise = testCase.request({
				files: [{ filePath: "test.dic", fileContent: new ArrayBuffer(8) }],
			});

			vi.advanceTimersByTime(30_000);

			await expect(promise).rejects.toThrow("解析がタイムアウトしました");
		});

		it("onProgress コールバックが呼ばれる", async () => {
			const onProgress = vi.fn();
			const result: ParseResult = {
				shioriType: testCase.shioriType,
				functions: [],
				meta: null,
				diagnostics: [],
			};
			const promise = testCase.request({
				files: [{ filePath: "test.dic", fileContent: new ArrayBuffer(8) }],
				onProgress,
			});

			mockWorkerInstance.simulateMessage({ type: "progress", percent: 25 });
			mockWorkerInstance.simulateMessage({ type: "parsed", result });
			await promise;

			expect(onProgress).toHaveBeenCalledWith(25);
		});

		it("postMessage が request type と transfer リストを送る", () => {
			const files = [
				{ filePath: "a.dic", fileContent: new ArrayBuffer(4) },
				{ filePath: "b.dic", fileContent: new ArrayBuffer(8) },
			];

			testCase.request({ files });

			expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith(
				{
					type: testCase.requestType,
					files,
				},
				[files[0]?.fileContent, files[1]?.fileContent],
			);
		});

		it("完了後に terminate が呼ばれる", async () => {
			const result: ParseResult = {
				shioriType: testCase.shioriType,
				functions: [],
				meta: null,
				diagnostics: [],
			};
			const promise = testCase.request({
				files: [{ filePath: "test.dic", fileContent: new ArrayBuffer(8) }],
			});

			mockWorkerInstance.simulateMessage({ type: "parsed", result });
			await promise;

			expect(mockWorkerInstance.terminate).toHaveBeenCalled();
		});

		it("エラー時にも terminate が呼ばれる", async () => {
			const promise = testCase.request({
				files: [{ filePath: "test.dic", fileContent: new ArrayBuffer(8) }],
			});

			mockWorkerInstance.simulateMessage({ type: "error", message: "fail" });
			await promise.catch(() => {});

			expect(mockWorkerInstance.terminate).toHaveBeenCalled();
		});

		it("タイムアウト時にも terminate が呼ばれる", async () => {
			const promise = testCase.request({
				files: [{ filePath: "test.dic", fileContent: new ArrayBuffer(8) }],
			});

			vi.advanceTimersByTime(30_000);
			await promise.catch(() => {});

			expect(mockWorkerInstance.terminate).toHaveBeenCalled();
		});
	});
});
