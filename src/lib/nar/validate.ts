import type { NarEntryMeta, NarValidationResult } from "@/types";
import { NAR_LIMITS, NAR_SUPPORTED_EXTENSIONS } from "./constants";

interface FileInfo {
	readonly name: string;
	readonly size: number;
}

export function validateNarFile(file: FileInfo): NarValidationResult {
	const name = file.name.toLowerCase();
	const hasSupportedExtension = NAR_SUPPORTED_EXTENSIONS.some((extension) =>
		name.endsWith(extension),
	);
	if (!hasSupportedExtension) {
		return { valid: false, reason: "NAR/ZIPファイル（.nar, .zip）のみ対応しています" };
	}

	if (file.size > NAR_LIMITS.MAX_FILE_SIZE) {
		const maxMB = NAR_LIMITS.MAX_FILE_SIZE / (1024 * 1024);
		return {
			valid: false,
			reason: `ファイルサイズが上限（${maxMB}MB）を超えています`,
		};
	}

	return { valid: true };
}

export function validateNarEntries(entries: NarEntryMeta[]): NarValidationResult {
	if (entries.length > NAR_LIMITS.MAX_ENTRY_COUNT) {
		return {
			valid: false,
			reason: `エントリ数が上限（${NAR_LIMITS.MAX_ENTRY_COUNT}）を超えています`,
		};
	}

	let totalSize = 0;
	for (const entry of entries) {
		if (!isPathSafe(entry.path)) {
			return {
				valid: false,
				reason: `安全でないパスが含まれています: ${entry.path}`,
			};
		}
		totalSize += entry.size;
	}

	if (totalSize > NAR_LIMITS.MAX_EXTRACTED_SIZE) {
		const maxMB = NAR_LIMITS.MAX_EXTRACTED_SIZE / (1024 * 1024);
		return {
			valid: false,
			reason: `展開後の合計サイズが上限（${maxMB}MB）を超えています`,
		};
	}

	return { valid: true };
}

export function isPathSafe(entryPath: string): boolean {
	const normalized = entryPath.split("\\").join("/");

	if (normalized.startsWith("/")) return false;
	if (/^[a-zA-Z]:/.test(normalized)) return false;

	const segments = normalized.split("/");
	let depth = 0;
	for (const segment of segments) {
		if (segment === "..") {
			depth--;
			if (depth < 0) return false;
		} else if (segment !== "" && segment !== ".") {
			depth++;
		}
	}
	return true;
}
