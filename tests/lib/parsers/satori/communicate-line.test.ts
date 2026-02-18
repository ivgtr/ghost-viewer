import {
	normalizeSatoriBodyLine,
	stripCommunicatePrefix,
} from "@/lib/parsers/satori/communicate-line";
import { describe, expect, it } from "vitest";

describe("stripCommunicatePrefix", () => {
	it("行頭が → の場合に1文字除去する", () => {
		expect(stripCommunicatePrefix("→：hello")).toBe("：hello");
	});

	it("行頭が → でない場合はそのまま返す", () => {
		expect(stripCommunicatePrefix("：hello")).toBe("：hello");
	});
});

describe("normalizeSatoriBodyLine", () => {
	it("現時点では COMMUNICATE 接頭辞除去を適用する", () => {
		expect(normalizeSatoriBodyLine("→text")).toBe("text");
	});
});
