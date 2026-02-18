import { NAR_LIMITS } from "@/lib/nar/constants";
import { isPathSafe, validateNarEntries, validateNarFile } from "@/lib/nar/validate";
import { describe, expect, it } from "vitest";

describe("validateNarFile", () => {
	it("有効な .nar ファイルを受け入れる", () => {
		const result = validateNarFile({ name: "ghost.nar", size: 1024 });
		expect(result).toEqual({ valid: true });
	});

	it("大文字拡張子 .NAR を受け入れる", () => {
		const result = validateNarFile({ name: "ghost.NAR", size: 1024 });
		expect(result).toEqual({ valid: true });
	});

	it("混合ケース .Nar を受け入れる", () => {
		const result = validateNarFile({ name: "ghost.Nar", size: 1024 });
		expect(result).toEqual({ valid: true });
	});

	it(".zip 拡張子を受け入れる", () => {
		const result = validateNarFile({ name: "ghost.zip", size: 1024 });
		expect(result).toEqual({ valid: true });
	});

	it("大文字拡張子 .ZIP を受け入れる", () => {
		const result = validateNarFile({ name: "ghost.ZIP", size: 1024 });
		expect(result).toEqual({ valid: true });
	});

	it("拡張子なしを拒否する", () => {
		const result = validateNarFile({ name: "ghost", size: 1024 });
		expect(result.valid).toBe(false);
	});

	it(".nar.zip を受け入れる", () => {
		const result = validateNarFile({ name: "ghost.nar.zip", size: 1024 });
		expect(result).toEqual({ valid: true });
	});

	it("ちょうど MAX_FILE_SIZE のファイルを受け入れる", () => {
		const result = validateNarFile({
			name: "ghost.nar",
			size: NAR_LIMITS.MAX_FILE_SIZE,
		});
		expect(result).toEqual({ valid: true });
	});

	it("MAX_FILE_SIZE を超えるファイルを拒否する", () => {
		const result = validateNarFile({
			name: "ghost.nar",
			size: NAR_LIMITS.MAX_FILE_SIZE + 1,
		});
		expect(result.valid).toBe(false);
	});
});

describe("validateNarEntries", () => {
	it("有効なエントリ一覧を受け入れる", () => {
		const result = validateNarEntries([
			{ path: "ghost/master/dic01.dic", size: 1024 },
			{ path: "ghost/master/descript.txt", size: 256 },
		]);
		expect(result).toEqual({ valid: true });
	});

	it("エントリ数が上限を超える場合に拒否する", () => {
		const entries = Array.from({ length: NAR_LIMITS.MAX_ENTRY_COUNT + 1 }, (_, i) => ({
			path: `file${i}.txt`,
			size: 1,
		}));
		const result = validateNarEntries(entries);
		expect(result.valid).toBe(false);
	});

	it("展開後合計サイズが上限を超える場合に拒否する", () => {
		const result = validateNarEntries([
			{ path: "large.dic", size: NAR_LIMITS.MAX_EXTRACTED_SIZE + 1 },
		]);
		expect(result.valid).toBe(false);
	});

	it("安全でないパスを含む場合に拒否する", () => {
		const result = validateNarEntries([{ path: "../etc/passwd", size: 100 }]);
		expect(result.valid).toBe(false);
	});
});

describe("isPathSafe", () => {
	it("通常のパスを許可する", () => {
		expect(isPathSafe("ghost/master/dic01.dic")).toBe(true);
	});

	it("ルート直下のファイルを許可する", () => {
		expect(isPathSafe("install.txt")).toBe(true);
	});

	it("直接トラバーサル ../etc/passwd を拒否する", () => {
		expect(isPathSafe("../etc/passwd")).toBe(false);
	});

	it("バックスラッシュ多段トラバーサルを拒否する", () => {
		expect(isPathSafe("..\\..\\..\\windows\\system32")).toBe(false);
	});

	it("間接トラバーサル foo/../../etc/passwd を拒否する", () => {
		expect(isPathSafe("foo/../../etc/passwd")).toBe(false);
	});

	it("UNC パスを拒否する", () => {
		expect(isPathSafe("\\\\server\\share")).toBe(false);
	});

	it("Windows ドライブレターを拒否する", () => {
		expect(isPathSafe("C:\\windows\\system32")).toBe(false);
	});

	it(". セグメント混在のトラバーサルを拒否する", () => {
		expect(isPathSafe("foo/./bar/../../../baz")).toBe(false);
	});

	it("絶対パスを拒否する", () => {
		expect(isPathSafe("/etc/passwd")).toBe(false);
	});

	it(". セグメントのみのパスを許可する", () => {
		expect(isPathSafe("./ghost/master/dic.dic")).toBe(true);
	});

	it("深い階層への .. で戻るが範囲内のパスを許可する", () => {
		expect(isPathSafe("a/b/../c")).toBe(true);
	});
});
