import { dispatchParse } from "@/lib/workers/parse-dispatcher";
import type { ShioriType } from "@/types";
import { describe, expect, it, vi } from "vitest";

describe("dispatchParse", () => {
	const shioriTypes: ShioriType[] = ["yaya", "satori", "kawari", "unknown"];

	for (const shioriType of shioriTypes) {
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

	it("onProgress が 0 と 100 で呼ばれる", () => {
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
