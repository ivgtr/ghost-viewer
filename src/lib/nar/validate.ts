import { array, finite, integer, minValue, number, object, parse, pipe, string } from "valibot";

import type { NarEntryMeta, NarValidationResult } from "@/types";
import { NAR_LIMITS, NAR_SUPPORTED_EXTENSIONS } from "./constants";

interface FileInfo {
	readonly name: string;
	readonly size: number;
}

const NAR_FILE_SCHEMA = object({
	name: string(),
	size: pipe(number(), finite(), integer(), minValue(0)),
});

const NAR_ENTRY_SCHEMA = object({
	path: string(),
	size: pipe(number(), finite(), integer(), minValue(0)),
});

const NAR_ENTRIES_SCHEMA = array(NAR_ENTRY_SCHEMA);

export function validateNarFile(file: FileInfo): NarValidationResult {
	let parsedFile: FileInfo;
	try {
		parsedFile = parse(NAR_FILE_SCHEMA, file);
	} catch {
		return { valid: false, reason: "ファイル情報が不正です" };
	}

	const name = parsedFile.name.toLowerCase();
	const hasSupportedExtension = NAR_SUPPORTED_EXTENSIONS.some((extension) =>
		name.endsWith(extension),
	);
	if (!hasSupportedExtension) {
		return { valid: false, reason: "NAR/ZIPファイル（.nar, .zip）のみ対応しています" };
	}

	if (parsedFile.size > NAR_LIMITS.MAX_FILE_SIZE) {
		const maxMB = NAR_LIMITS.MAX_FILE_SIZE / (1024 * 1024);
		return {
			valid: false,
			reason: `ファイルサイズが上限（${maxMB}MB）を超えています`,
		};
	}

	return { valid: true };
}

export function validateNarEntries(entries: NarEntryMeta[]): NarValidationResult {
	let parsedEntries: NarEntryMeta[];
	try {
		parsedEntries = parse(NAR_ENTRIES_SCHEMA, entries);
	} catch {
		return { valid: false, reason: "エントリ情報が不正です" };
	}

	if (parsedEntries.length > NAR_LIMITS.MAX_ENTRY_COUNT) {
		return {
			valid: false,
			reason: `エントリ数が上限（${NAR_LIMITS.MAX_ENTRY_COUNT}）を超えています`,
		};
	}

	let totalSize = 0;
	for (const entry of parsedEntries) {
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
