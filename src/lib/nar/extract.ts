import JSZip from "jszip";

import type { FileKind, FileTreeNode, GhostStats, NarEntryMeta } from "@/types";
import { NAR_LIMITS } from "./constants";
import { isPathSafe } from "./validate";

export interface ExtractionResult {
	tree: FileTreeNode[];
	entries: NarEntryMeta[];
	stats: GhostStats;
	fileContents: Map<string, ArrayBuffer>;
}

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".bmp", ".pna", ".gif"]);
const DLL_EXTENSIONS = new Set([".dll", ".so"]);

export function classifyFileKind(fileName: string): FileKind {
	const ext = fileName.slice(fileName.lastIndexOf(".")).toLowerCase();
	if (ext === ".dic") return "dictionary";
	if (ext === ".txt") return "text";
	if (IMAGE_EXTENSIONS.has(ext)) return "image";
	if (DLL_EXTENSIONS.has(ext)) return "dll";
	return "other";
}

export function buildFileTree(entries: NarEntryMeta[]): FileTreeNode[] {
	const root: FileTreeNode[] = [];
	const dirMap = new Map<string, FileTreeNode[]>();
	dirMap.set("", root);

	for (const entry of entries) {
		const normalized = entry.path.split("\\").join("/");
		if (normalized.endsWith("/")) continue;

		const segments = normalized.split("/");
		const fileName = segments[segments.length - 1] as string;

		let currentPath = "";
		let currentChildren = root;

		for (let i = 0; i < segments.length - 1; i++) {
			const dirName = segments[i] as string;
			const dirPath = currentPath === "" ? dirName : `${currentPath}/${dirName}`;

			let dirChildren = dirMap.get(dirPath);
			if (!dirChildren) {
				dirChildren = [];
				const dirNode: FileTreeNode = {
					id: dirPath,
					name: dirName,
					path: dirPath,
					kind: "directory",
					children: dirChildren,
				};
				currentChildren.push(dirNode);
				dirMap.set(dirPath, dirChildren);
			}

			currentPath = dirPath;
			currentChildren = dirChildren;
		}

		const fileNode: FileTreeNode = {
			id: normalized,
			name: fileName,
			path: normalized,
			kind: "file",
			fileKind: classifyFileKind(fileName),
			size: entry.size,
		};
		currentChildren.push(fileNode);
	}

	sortTreeNodes(root);
	return root;
}

function sortTreeNodes(nodes: FileTreeNode[]): void {
	nodes.sort((a, b) => {
		if (a.kind !== b.kind) {
			return a.kind === "directory" ? -1 : 1;
		}
		return a.name.localeCompare(b.name);
	});

	for (const node of nodes) {
		if (node.kind === "directory") {
			sortTreeNodes(node.children);
		}
	}
}

function computeStats(entries: NarEntryMeta[]): GhostStats {
	let totalSize = 0;
	let dicFileCount = 0;

	for (const entry of entries) {
		totalSize += entry.size;
		if (classifyFileKind(entry.path) === "dictionary") {
			dicFileCount++;
		}
	}

	return {
		totalFiles: entries.length,
		dicFileCount,
		totalLines: 0,
		totalSize,
	};
}

export async function extractNar(buffer: ArrayBuffer): Promise<ExtractionResult> {
	const zip = await JSZip.loadAsync(buffer);

	const filePaths: string[] = [];
	for (const relativePath of Object.keys(zip.files)) {
		if (!relativePath.endsWith("/")) {
			filePaths.push(relativePath);
		}
	}

	if (filePaths.length > NAR_LIMITS.MAX_ENTRY_COUNT) {
		throw new Error(`エントリ数が上限（${NAR_LIMITS.MAX_ENTRY_COUNT}）を超えています`);
	}

	for (const p of filePaths) {
		if (!isPathSafe(p)) {
			throw new Error(`安全でないパスが含まれています: ${p}`);
		}
	}

	const entries: NarEntryMeta[] = [];
	const fileContents = new Map<string, ArrayBuffer>();
	let totalSize = 0;

	for (const filePath of filePaths) {
		const file = zip.file(filePath);
		if (!file) continue;

		const data = await file.async("arraybuffer");
		const size = data.byteLength;
		totalSize += size;

		const normalizedPath = filePath.split("\\").join("/");
		entries.push({ path: filePath, size });
		fileContents.set(normalizedPath, data);
	}

	if (totalSize > NAR_LIMITS.MAX_EXTRACTED_SIZE) {
		const maxMB = NAR_LIMITS.MAX_EXTRACTED_SIZE / (1024 * 1024);
		throw new Error(`展開後の合計サイズが上限（${maxMB}MB）を超えています`);
	}

	const tree = buildFileTree(entries);
	const stats = computeStats(entries);

	return { tree, entries, stats, fileContents };
}

export async function processNarFile(file: File): Promise<ExtractionResult> {
	const buffer = await file.arrayBuffer();
	return extractNar(buffer);
}
