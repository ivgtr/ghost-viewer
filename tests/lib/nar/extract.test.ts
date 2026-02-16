import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { buildFileTree, classifyFileKind, extractNar } from "@/lib/nar/extract";
import type { NarEntryMeta } from "@/types";

async function createTestNarBuffer(files: Record<string, string>): Promise<ArrayBuffer> {
	const zip = new JSZip();
	for (const [path, content] of Object.entries(files)) {
		zip.file(path, content);
	}
	return zip.generateAsync({ type: "arraybuffer" });
}

describe("classifyFileKind", () => {
	it(".dic → dictionary", () => {
		expect(classifyFileKind("word.dic")).toBe("dictionary");
	});

	it(".DIC（大文字）→ dictionary", () => {
		expect(classifyFileKind("word.DIC")).toBe("dictionary");
	});

	it(".txt → text", () => {
		expect(classifyFileKind("readme.txt")).toBe("text");
	});

	it(".png → image", () => {
		expect(classifyFileKind("surface0.png")).toBe("image");
	});

	it(".jpg → image", () => {
		expect(classifyFileKind("photo.jpg")).toBe("image");
	});

	it(".pna → image", () => {
		expect(classifyFileKind("surface0.pna")).toBe("image");
	});

	it(".dll → dll", () => {
		expect(classifyFileKind("shiori.dll")).toBe("dll");
	});

	it(".so → dll", () => {
		expect(classifyFileKind("shiori.so")).toBe("dll");
	});

	it("未知の拡張子 → other", () => {
		expect(classifyFileKind("data.xml")).toBe("other");
	});

	it("拡張子なし → other", () => {
		expect(classifyFileKind("README")).toBe("other");
	});
});

describe("buildFileTree", () => {
	it("フラットエントリからネストツリーを構築する", () => {
		const entries: NarEntryMeta[] = [
			{ path: "ghost/master/dic01.dic", size: 100 },
			{ path: "ghost/master/descript.txt", size: 50 },
		];
		const tree = buildFileTree(entries);

		expect(tree).toHaveLength(1);
		expect(tree[0].kind).toBe("directory");
		expect(tree[0].name).toBe("ghost");
		if (tree[0].kind === "directory") {
			expect(tree[0].children).toHaveLength(1);
			expect(tree[0].children[0].name).toBe("master");
			if (tree[0].children[0].kind === "directory") {
				expect(tree[0].children[0].children).toHaveLength(2);
			}
		}
	});

	it("ディレクトリをファイルの前にソートする", () => {
		const entries: NarEntryMeta[] = [
			{ path: "install.txt", size: 10 },
			{ path: "ghost/master/dic.dic", size: 100 },
		];
		const tree = buildFileTree(entries);

		expect(tree[0].kind).toBe("directory");
		expect(tree[0].name).toBe("ghost");
		expect(tree[1].kind).toBe("file");
		expect(tree[1].name).toBe("install.txt");
	});

	it("FileKind を正しく設定する", () => {
		const entries: NarEntryMeta[] = [
			{ path: "dic01.dic", size: 100 },
			{ path: "surface0.png", size: 200 },
		];
		const tree = buildFileTree(entries);

		const dicNode = tree.find((n) => n.name === "dic01.dic");
		const imgNode = tree.find((n) => n.name === "surface0.png");
		expect(dicNode?.kind === "file" && dicNode.fileKind).toBe("dictionary");
		expect(imgNode?.kind === "file" && imgNode.fileKind).toBe("image");
	});

	it("ノード ID がパスと一致する", () => {
		const entries: NarEntryMeta[] = [{ path: "ghost/master/dic.dic", size: 100 }];
		const tree = buildFileTree(entries);

		expect(tree[0].id).toBe("ghost");
		if (tree[0].kind === "directory") {
			expect(tree[0].children[0].id).toBe("ghost/master");
			if (tree[0].children[0].kind === "directory") {
				expect(tree[0].children[0].children[0].id).toBe("ghost/master/dic.dic");
			}
		}
	});

	it("空エントリ → 空ツリー", () => {
		expect(buildFileTree([])).toEqual([]);
	});

	it("ルート直下ファイルのみ", () => {
		const entries: NarEntryMeta[] = [
			{ path: "install.txt", size: 10 },
			{ path: "readme.txt", size: 20 },
		];
		const tree = buildFileTree(entries);

		expect(tree).toHaveLength(2);
		expect(tree.every((n) => n.kind === "file")).toBe(true);
	});

	it("バックスラッシュを正規化する", () => {
		const entries: NarEntryMeta[] = [{ path: "ghost\\master\\dic.dic", size: 100 }];
		const tree = buildFileTree(entries);

		expect(tree[0].kind).toBe("directory");
		expect(tree[0].name).toBe("ghost");
		if (tree[0].kind === "directory") {
			expect(tree[0].children[0].name).toBe("master");
		}
	});

	it("ディレクトリエントリ（末尾 /）をスキップする", () => {
		const entries: NarEntryMeta[] = [
			{ path: "ghost/", size: 0 },
			{ path: "ghost/master/", size: 0 },
			{ path: "ghost/master/dic.dic", size: 100 },
		];
		const tree = buildFileTree(entries);

		expect(tree).toHaveLength(1);
		expect(tree[0].kind).toBe("directory");
		if (tree[0].kind === "directory") {
			expect(tree[0].children).toHaveLength(1);
			expect(tree[0].children[0].kind).toBe("directory");
		}
	});

	it("同名ディレクトリの重複を防止する", () => {
		const entries: NarEntryMeta[] = [
			{ path: "ghost/master/dic01.dic", size: 100 },
			{ path: "ghost/master/dic02.dic", size: 200 },
			{ path: "ghost/shell/surface0.png", size: 300 },
		];
		const tree = buildFileTree(entries);

		expect(tree).toHaveLength(1);
		if (tree[0].kind === "directory") {
			expect(tree[0].children).toHaveLength(2);
			const masterDir = tree[0].children.find((n) => n.name === "master");
			expect(masterDir?.kind).toBe("directory");
			if (masterDir?.kind === "directory") {
				expect(masterDir.children).toHaveLength(2);
			}
		}
	});
});

describe("extractNar", () => {
	it("有効な NAR からツリー・エントリ・stats を返す", async () => {
		const buffer = await createTestNarBuffer({
			"ghost/master/dic01.dic": "hello",
			"ghost/master/descript.txt": "name,TestGhost",
		});
		const result = await extractNar(buffer);

		expect(result.entries).toHaveLength(2);
		expect(result.tree).toHaveLength(1);
		expect(result.stats.totalFiles).toBe(2);
		expect(result.stats.dicFileCount).toBe(1);
		expect(result.stats.totalLines).toBe(0);
		expect(result.stats.totalSize).toBeGreaterThan(0);
	});

	it("空 ZIP → 空結果", async () => {
		const buffer = await createTestNarBuffer({});
		const result = await extractNar(buffer);

		expect(result.entries).toHaveLength(0);
		expect(result.tree).toHaveLength(0);
		expect(result.stats.totalFiles).toBe(0);
		expect(result.stats.totalSize).toBe(0);
	});

	it("安全でないパスを含むエントリでエラーを throw する", async () => {
		const zip = new JSZip();
		zip.file("/etc/passwd", "root:x:0:0");
		const buffer = await zip.generateAsync({ type: "arraybuffer" });

		await expect(extractNar(buffer)).rejects.toThrow("安全でないパス");
	});

	it("fileContents Map を返す", async () => {
		const buffer = await createTestNarBuffer({
			"ghost/master/dic01.dic": "hello",
			"readme.txt": "world",
		});
		const result = await extractNar(buffer);

		expect(result.fileContents).toBeInstanceOf(Map);
		expect(result.fileContents.size).toBe(2);
		expect(result.fileContents.has("ghost/master/dic01.dic")).toBe(true);
		expect(result.fileContents.has("readme.txt")).toBe(true);
	});

	it("fileContents のキーがバックスラッシュを正規化している", async () => {
		const zip = new JSZip();
		zip.file("ghost\\master\\dic.dic", "test");
		const buffer = await zip.generateAsync({ type: "arraybuffer" });
		const result = await extractNar(buffer);

		expect(result.fileContents.has("ghost/master/dic.dic")).toBe(true);
	});

	it("不正な ZIP データでエラーを throw する", async () => {
		const buffer = new ArrayBuffer(100);
		await expect(extractNar(buffer)).rejects.toThrow();
	});
});
