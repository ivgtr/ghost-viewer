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
			fileName: "satori.dic",
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

	const stubTypes: ShioriType[] = ["yaya", "kawari", "unknown"];

	for (const shioriType of stubTypes) {
		it(`${shioriType} でスタブ結果を返す`, () => {
			const onProgress = vi.fn();
			const input = {
				fileContent: new ArrayBuffer(0),
				fileName: "test.dic",
				shioriType,
			};

			const result = dispatchParse(input, onProgress);

			expect(result).toEqual({
				shioriType,
				functions: [],
				meta: null,
			});
		});
	}

	it("satori の onProgress が 0→50→100 で呼ばれる", () => {
		const onProgress = vi.fn();
		const input = {
			fileContent: toArrayBuffer("＊OnBoot\n：hello"),
			fileName: "test.dic",
			shioriType: "satori" as const,
		};

		dispatchParse(input, onProgress);

		expect(onProgress).toHaveBeenCalledTimes(3);
		expect(onProgress).toHaveBeenNthCalledWith(1, 0);
		expect(onProgress).toHaveBeenNthCalledWith(2, 50);
		expect(onProgress).toHaveBeenNthCalledWith(3, 100);
	});

	it("スタブタイプの onProgress が 0→100 で呼ばれる", () => {
		const onProgress = vi.fn();
		const input = {
			fileContent: new ArrayBuffer(0),
			fileName: "test.dic",
			shioriType: "yaya" as const,
		};

		dispatchParse(input, onProgress);

		expect(onProgress).toHaveBeenCalledTimes(2);
		expect(onProgress).toHaveBeenNthCalledWith(1, 0);
		expect(onProgress).toHaveBeenNthCalledWith(2, 100);
	});
});
