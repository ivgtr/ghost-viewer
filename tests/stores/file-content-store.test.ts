import { useFileContentStore } from "@/stores/file-content-store";
import { beforeEach, describe, expect, it } from "vitest";

describe("fileContentStore", () => {
	beforeEach(() => {
		useFileContentStore.getState().reset();
	});

	it("初期状態が正しい", () => {
		const state = useFileContentStore.getState();
		expect(state.fileContents.size).toBe(0);
		expect(state.decodedText).toBeNull();
		expect(state.detectedEncoding).toBeNull();
		expect(state.decodeError).toBeNull();
	});

	it("setFileContents でファイルデータを設定できる", () => {
		const contents = new Map<string, ArrayBuffer>();
		contents.set("test.txt", new TextEncoder().encode("hello").buffer);
		useFileContentStore.getState().setFileContents(contents);

		expect(useFileContentStore.getState().fileContents.size).toBe(1);
	});

	it("decodeFile で UTF-8 テキストをデコードできる", () => {
		const contents = new Map<string, ArrayBuffer>();
		contents.set("test.txt", new TextEncoder().encode("hello world").buffer);
		useFileContentStore.getState().setFileContents(contents);

		useFileContentStore.getState().decodeFile("test.txt");

		const state = useFileContentStore.getState();
		expect(state.decodedText).toBe("hello world");
		expect(state.detectedEncoding).toBe("utf-8");
		expect(state.decodeError).toBeNull();
	});

	it("decodeFile で Shift_JIS テキストをデコードできる", () => {
		const contents = new Map<string, ArrayBuffer>();
		// 「あいうえお」in Shift_JIS
		const sjisBytes = new Uint8Array([0x82, 0xa0, 0x82, 0xa2, 0x82, 0xa4, 0x82, 0xa6, 0x82, 0xa8]);
		contents.set("dic.dic", sjisBytes.buffer);
		useFileContentStore.getState().setFileContents(contents);

		useFileContentStore.getState().decodeFile("dic.dic");

		const state = useFileContentStore.getState();
		expect(state.decodedText).toBe("あいうえお");
		expect(state.detectedEncoding).toBe("shift_jis");
		expect(state.decodeError).toBeNull();
	});

	it("存在しないパスでエラーを設定する", () => {
		useFileContentStore.getState().decodeFile("nonexistent.txt");

		const state = useFileContentStore.getState();
		expect(state.decodedText).toBeNull();
		expect(state.decodeError).toContain("ファイルが見つかりません");
	});

	it("バイナリファイルでエラーを設定する", () => {
		const contents = new Map<string, ArrayBuffer>();
		// PNG header
		const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
		contents.set("image.png", pngBytes.buffer);
		useFileContentStore.getState().setFileContents(contents);

		useFileContentStore.getState().decodeFile("image.png");

		const state = useFileContentStore.getState();
		expect(state.decodedText).toBeNull();
		expect(state.decodeError).toContain("バイナリファイル");
	});

	it("初期状態で highlightRange が null", () => {
		expect(useFileContentStore.getState().highlightRange).toBeNull();
	});

	it("setHighlightRange でハイライト範囲を設定できる", () => {
		useFileContentStore.getState().setHighlightRange({ startLine: 5, endLine: 10 });
		expect(useFileContentStore.getState().highlightRange).toEqual({ startLine: 5, endLine: 10 });
	});

	it("decodeFile で highlightRange がリセットされる", () => {
		const contents = new Map<string, ArrayBuffer>();
		contents.set("test.txt", new TextEncoder().encode("hello").buffer);
		useFileContentStore.getState().setFileContents(contents);
		useFileContentStore.getState().setHighlightRange({ startLine: 5, endLine: 10 });

		useFileContentStore.getState().decodeFile("test.txt");
		expect(useFileContentStore.getState().highlightRange).toBeNull();
	});

	it("reset で初期状態に戻る", () => {
		const contents = new Map<string, ArrayBuffer>();
		contents.set("test.txt", new TextEncoder().encode("hello").buffer);
		useFileContentStore.getState().setFileContents(contents);
		useFileContentStore.getState().decodeFile("test.txt");

		useFileContentStore.getState().reset();

		const state = useFileContentStore.getState();
		expect(state.fileContents.size).toBe(0);
		expect(state.decodedText).toBeNull();
		expect(state.detectedEncoding).toBeNull();
		expect(state.decodeError).toBeNull();
	});
});
