import { readFileSync } from "node:fs";
import { decodeWithAutoDetection } from "@/lib/encoding/detect";
import { extractNar } from "@/lib/nar/extract";
import { parseYayaDic } from "@/lib/parsers/yaya";
import { describe, expect, it, vi } from "vitest";

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
	const copy = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	return copy.buffer;
}

describe("YAYA Parser - Emily4 Regression", () => {
	it("emily4.nar の全 dic を parseYayaDic でエラーなく処理する", async () => {
		if (typeof window !== "undefined") {
			return;
		}

		let narBytes: Buffer;
		try {
			narBytes = readFileSync(".tmp/emily4.nar");
		} catch {
			return;
		}

		const extracted = await extractNar(toArrayBuffer(narBytes));
		const dicPaths = [...extracted.fileContents.keys()]
			.filter((path) => path.startsWith("ghost/master/") && path.endsWith(".dic"))
			.sort();

		const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		try {
			for (const dicPath of dicPaths) {
				const content = extracted.fileContents.get(dicPath);
				expect(content).toBeDefined();

				const decoded = decodeWithAutoDetection(content as ArrayBuffer);
				parseYayaDic(decoded.text, dicPath);
			}

			const parseErrors = errorSpy.mock.calls.filter((call) =>
				String(call[0]).startsWith("[parseYayaDic] Error parsing "),
			);
			if (parseErrors.length > 0) {
				const details = parseErrors
					.map((call) => {
						const message = call[1] instanceof Error ? call[1].message : String(call[1]);
						return `${String(call[0])} ${message}`;
					})
					.join("\n");
				throw new Error(details);
			}
		} finally {
			errorSpy.mockRestore();
		}
	});
});
