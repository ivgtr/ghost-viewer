import { dispatchParse } from "@/lib/workers/parse-dispatcher";
import type { ShioriType } from "@/types";
import { describe, expect, it, vi } from "vitest";

function toArrayBuffer(text: string): ArrayBuffer {
	return new TextEncoder().encode(text).buffer as ArrayBuffer;
}

describe("dispatchParse", () => {
	it("satori で辞書を正しくパースする", () => {
		const onProgress = vi.fn();
		const text = "＊OnBoot\n：\\0こんにちは\\e";
		const input = {
			fileContent: toArrayBuffer(text),
			filePath: "satori.dic",
			shioriType: "satori" as const,
		};

		const result = dispatchParse(input, onProgress);

		expect(result.shioriType).toBe("satori");
		expect(result.functions).toHaveLength(1);
		expect(result.functions[0].name).toBe("OnBoot");
		expect(result.functions[0].filePath).toBe("satori.dic");
		expect(result.functions[0].dialogues).toHaveLength(1);
		expect(result.meta).toBeNull();
	});

	it("yaya で辞書を正しくパースする", () => {
		const onProgress = vi.fn();
		const text = 'OnBoot {\n\t"\\0こんにちは\\e"\n}';
		const input = {
			fileContent: toArrayBuffer(text),
			filePath: "yaya.dic",
			shioriType: "yaya" as const,
		};

		const result = dispatchParse(input, onProgress);

		expect(result.shioriType).toBe("yaya");
		expect(result.functions).toHaveLength(1);
		expect(result.functions[0].name).toBe("OnBoot");
		expect(result.functions[0].filePath).toBe("yaya.dic");
		expect(result.functions[0].dialogues).toHaveLength(1);
		expect(result.meta).toBeNull();
	});

	it("kawari で辞書を正しくパースする", () => {
		const onProgress = vi.fn();
		const text = "sentence : \\0こんにちは\\e , \\0やあ\\e";
		const input = {
			fileContent: toArrayBuffer(text),
			filePath: "kawari.dic",
			shioriType: "kawari" as const,
		};

		const result = dispatchParse(input, onProgress);

		expect(result.shioriType).toBe("kawari");
		expect(result.functions).toHaveLength(1);
		expect(result.functions[0].name).toBe("sentence");
		expect(result.functions[0].filePath).toBe("kawari.dic");
		expect(result.functions[0].dialogues).toHaveLength(2);
		expect(result.meta).toBeNull();
	});

	it("unknown でスタブ結果を返す", () => {
		const onProgress = vi.fn();
		const input = {
			fileContent: new ArrayBuffer(0),
			filePath: "test.dic",
			shioriType: "unknown" as const,
		};

		const result = dispatchParse(input, onProgress);

		expect(result).toEqual({
			shioriType: "unknown",
			functions: [],
			meta: null,
		});
	});

	it("satori の onProgress が 0→50→100 で呼ばれる", () => {
		const onProgress = vi.fn();
		const input = {
			fileContent: toArrayBuffer("＊OnBoot\n：hello"),
			filePath: "test.dic",
			shioriType: "satori" as const,
		};

		dispatchParse(input, onProgress);

		expect(onProgress).toHaveBeenCalledTimes(3);
		expect(onProgress).toHaveBeenNthCalledWith(1, 0);
		expect(onProgress).toHaveBeenNthCalledWith(2, 50);
		expect(onProgress).toHaveBeenNthCalledWith(3, 100);
	});

	it("yaya の onProgress が 0→50→100 で呼ばれる", () => {
		const onProgress = vi.fn();
		const input = {
			fileContent: toArrayBuffer('OnBoot {\n\t"hello"\n}'),
			filePath: "test.dic",
			shioriType: "yaya" as const,
		};

		dispatchParse(input, onProgress);

		expect(onProgress).toHaveBeenCalledTimes(3);
		expect(onProgress).toHaveBeenNthCalledWith(1, 0);
		expect(onProgress).toHaveBeenNthCalledWith(2, 50);
		expect(onProgress).toHaveBeenNthCalledWith(3, 100);
	});

	it("kawari の onProgress が 0→50→100 で呼ばれる", () => {
		const onProgress = vi.fn();
		const input = {
			fileContent: toArrayBuffer("sentence : hello"),
			filePath: "test.dic",
			shioriType: "kawari" as const,
		};

		dispatchParse(input, onProgress);

		expect(onProgress).toHaveBeenCalledTimes(3);
		expect(onProgress).toHaveBeenNthCalledWith(1, 0);
		expect(onProgress).toHaveBeenNthCalledWith(2, 50);
		expect(onProgress).toHaveBeenNthCalledWith(3, 100);
	});

	it("unknown の onProgress が 0→100 で呼ばれる", () => {
		const onProgress = vi.fn();
		const input = {
			fileContent: new ArrayBuffer(0),
			filePath: "test.dic",
			shioriType: "unknown" as const,
		};

		dispatchParse(input, onProgress);

		expect(onProgress).toHaveBeenCalledTimes(2);
		expect(onProgress).toHaveBeenNthCalledWith(1, 0);
		expect(onProgress).toHaveBeenNthCalledWith(2, 100);
	});
});
