import {
	dispatchParseKawariBatch,
	dispatchParseSatoriBatch,
	dispatchParseYayaBatch,
} from "@/lib/workers/parse-dispatcher";
import { describe, expect, it, vi } from "vitest";

function toArrayBuffer(text: string): ArrayBuffer {
	return new TextEncoder().encode(text).buffer as ArrayBuffer;
}

describe("dispatchParseYayaBatch", () => {
	it("辞書パス昇順 + globaldefine 共有 + diagnostics を返す", () => {
		const onProgress = vi.fn();
		const input = {
			files: [
				{
					filePath: "b.dic",
					fileContent: toArrayBuffer(
						'OnB1 { "TARGET" }\n#globaldefine TARGET beta\nOnB2 { "TARGET" }',
					),
				},
				{
					filePath: "a.dic",
					fileContent: toArrayBuffer('#globaldefine TARGET alpha\n#unknown foo\nOnA { "TARGET" }'),
				},
			],
		};

		const result = dispatchParseYayaBatch(input, onProgress);
		const onA = result.functions.find((fn) => fn.name === "OnA");
		const onB1 = result.functions.find((fn) => fn.name === "OnB1");
		const onB2 = result.functions.find((fn) => fn.name === "OnB2");

		expect(result.shioriType).toBe("yaya");
		expect(onA?.dialogues[0]?.rawText).toBe("alpha");
		expect(onB1?.dialogues[0]?.rawText).toBe("alpha");
		expect(onB2?.dialogues[0]?.rawText).toBe("beta");
		expect(
			result.diagnostics.some(
				(diagnostic) =>
					diagnostic.level === "warning" &&
					diagnostic.code === "YAYA_PREPROCESS_UNKNOWN_DIRECTIVE" &&
					diagnostic.filePath === "a.dic",
			),
		).toBe(true);
		expect(onProgress).toHaveBeenCalledTimes(3);
		expect(onProgress).toHaveBeenNthCalledWith(1, 0);
		expect(onProgress).toHaveBeenNthCalledWith(2, 50);
		expect(onProgress).toHaveBeenNthCalledWith(3, 100);
	});

	it("files が空なら空結果を返し progress は 0→100", () => {
		const onProgress = vi.fn();
		const result = dispatchParseYayaBatch({ files: [] }, onProgress);

		expect(result.shioriType).toBe("yaya");
		expect(result.functions).toEqual([]);
		expect(result.diagnostics).toEqual([]);
		expect(result.meta).toBeNull();
		expect(onProgress).toHaveBeenCalledTimes(2);
		expect(onProgress).toHaveBeenNthCalledWith(1, 0);
		expect(onProgress).toHaveBeenNthCalledWith(2, 100);
	});
});

describe("dispatchParseSatoriBatch", () => {
	it("複数ファイルを昇順で結合してパースし progress を通知する", () => {
		const onProgress = vi.fn();
		const input = {
			files: [
				{ filePath: "b.dic", fileContent: toArrayBuffer("＊OnB\n：\\0B\\e") },
				{ filePath: "a.dic", fileContent: toArrayBuffer("＊OnA\n：\\0A\\e") },
			],
		};

		const result = dispatchParseSatoriBatch(input, onProgress);

		expect(result.shioriType).toBe("satori");
		expect(result.functions.map((fn) => fn.name)).toEqual(["OnA", "OnB"]);
		expect(result.functions.map((fn) => fn.filePath)).toEqual(["a.dic", "b.dic"]);
		expect(result.meta).toBeNull();
		expect(result.diagnostics).toEqual([]);
		expect(onProgress).toHaveBeenCalledTimes(3);
		expect(onProgress).toHaveBeenNthCalledWith(1, 0);
		expect(onProgress).toHaveBeenNthCalledWith(2, 50);
		expect(onProgress).toHaveBeenNthCalledWith(3, 100);
	});

	it("files が空なら空結果を返し progress は 0→100", () => {
		const onProgress = vi.fn();
		const result = dispatchParseSatoriBatch({ files: [] }, onProgress);

		expect(result.shioriType).toBe("satori");
		expect(result.functions).toEqual([]);
		expect(result.diagnostics).toEqual([]);
		expect(result.meta).toBeNull();
		expect(onProgress).toHaveBeenCalledTimes(2);
		expect(onProgress).toHaveBeenNthCalledWith(1, 0);
		expect(onProgress).toHaveBeenNthCalledWith(2, 100);
	});
});

describe("dispatchParseKawariBatch", () => {
	it("複数ファイルを昇順で結合してパースし progress を通知する", () => {
		const onProgress = vi.fn();
		const input = {
			files: [
				{ filePath: "b.dic", fileContent: toArrayBuffer("sentenceB : \\0B\\e") },
				{ filePath: "a.dic", fileContent: toArrayBuffer("sentenceA : \\0A\\e") },
			],
		};

		const result = dispatchParseKawariBatch(input, onProgress);

		expect(result.shioriType).toBe("kawari");
		expect(result.functions.map((fn) => fn.name)).toEqual(["sentenceA", "sentenceB"]);
		expect(result.functions.map((fn) => fn.filePath)).toEqual(["a.dic", "b.dic"]);
		expect(result.meta).toBeNull();
		expect(result.diagnostics).toEqual([]);
		expect(onProgress).toHaveBeenCalledTimes(3);
		expect(onProgress).toHaveBeenNthCalledWith(1, 0);
		expect(onProgress).toHaveBeenNthCalledWith(2, 50);
		expect(onProgress).toHaveBeenNthCalledWith(3, 100);
	});

	it("files が空なら空結果を返し progress は 0→100", () => {
		const onProgress = vi.fn();
		const result = dispatchParseKawariBatch({ files: [] }, onProgress);

		expect(result.shioriType).toBe("kawari");
		expect(result.functions).toEqual([]);
		expect(result.diagnostics).toEqual([]);
		expect(result.meta).toBeNull();
		expect(onProgress).toHaveBeenCalledTimes(2);
		expect(onProgress).toHaveBeenNthCalledWith(1, 0);
		expect(onProgress).toHaveBeenNthCalledWith(2, 100);
	});
});
