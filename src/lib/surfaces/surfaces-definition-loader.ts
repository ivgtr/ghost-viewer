import { decodeWithAutoDetection } from "@/lib/encoding/detect";
import type {
	SurfaceDefinitionFile,
	SurfaceDefinitionFilesByShell,
	SurfaceDefinitionLoadResult,
	SurfaceDiagnostic,
} from "@/types";

interface ShellDefinitionBuckets {
	surfacesBase: SurfaceDefinitionFile[];
	surfacesExtra: SurfaceDefinitionFile[];
	aliasFiles: SurfaceDefinitionFile[];
}

const SHELL_FILE_PATTERN = /^shell\/([^/]+)\/([^/]+)$/i;
const SURFACES_TEXT_FILE = "surfaces.txt";
const ALIAS_TEXT_FILE = "alias.txt";

export function loadSurfaceDefinitions(
	fileContents: Map<string, ArrayBuffer>,
	targetShellNames: string[],
): SurfaceDefinitionLoadResult {
	const diagnostics: SurfaceDiagnostic[] = [];
	const targetSet = new Set(targetShellNames);
	const bucketsByShell = new Map<string, ShellDefinitionBuckets>();

	for (const [path, buffer] of fileContents.entries()) {
		const match = SHELL_FILE_PATTERN.exec(path);
		if (!match) {
			continue;
		}

		const shellName = match[1];
		const fileName = match[2];
		if (shellName === undefined || fileName === undefined) {
			continue;
		}
		if (!targetSet.has(shellName)) {
			continue;
		}

		const kind = resolveDefinitionKind(fileName);
		if (!kind) {
			continue;
		}

		const text = decodeDefinitionText(buffer, shellName, path, diagnostics);
		if (text === null) {
			continue;
		}

		const definitionFile: SurfaceDefinitionFile = {
			shellName,
			path,
			text,
			kind,
		};
		const buckets = ensureBuckets(bucketsByShell, shellName);
		if (fileName.toLowerCase() === SURFACES_TEXT_FILE) {
			buckets.surfacesBase.push(definitionFile);
			continue;
		}
		if (fileName.toLowerCase() === ALIAS_TEXT_FILE) {
			buckets.aliasFiles.push(definitionFile);
			continue;
		}
		buckets.surfacesExtra.push(definitionFile);
	}

	const filesByShell: SurfaceDefinitionFilesByShell = new Map();
	for (const shellName of [...targetSet].sort((a, b) => a.localeCompare(b))) {
		const buckets = bucketsByShell.get(shellName);
		if (!buckets) {
			diagnostics.push({
				level: "warning",
				code: "SURFACE_DEFINITION_NOT_FOUND",
				message: "surfaces 定義ファイルが見つかりません",
				shellName,
				path: null,
			});
			continue;
		}
		const ordered = orderDefinitionFiles(buckets);
		if (ordered.length === 0) {
			diagnostics.push({
				level: "warning",
				code: "SURFACE_DEFINITION_NOT_FOUND",
				message: "surfaces 定義ファイルが見つかりません",
				shellName,
				path: null,
			});
			continue;
		}
		filesByShell.set(shellName, ordered);
	}

	return {
		filesByShell,
		diagnostics,
	};
}

function ensureBuckets(
	bucketsByShell: Map<string, ShellDefinitionBuckets>,
	shellName: string,
): ShellDefinitionBuckets {
	const existing = bucketsByShell.get(shellName);
	if (existing) {
		return existing;
	}
	const created: ShellDefinitionBuckets = {
		surfacesBase: [],
		surfacesExtra: [],
		aliasFiles: [],
	};
	bucketsByShell.set(shellName, created);
	return created;
}

function resolveDefinitionKind(fileName: string): "surfaces" | "alias" | null {
	const lowerName = fileName.toLowerCase();
	if (lowerName === ALIAS_TEXT_FILE) {
		return "alias";
	}
	if (lowerName === SURFACES_TEXT_FILE || /^surfaces.*\.txt$/i.test(fileName)) {
		return "surfaces";
	}
	return null;
}

function decodeDefinitionText(
	buffer: ArrayBuffer,
	shellName: string,
	path: string,
	diagnostics: SurfaceDiagnostic[],
): string | null {
	try {
		const { text } = decodeWithAutoDetection(buffer);
		return text;
	} catch {
		diagnostics.push({
			level: "warning",
			code: "SURFACE_DEFINITION_DECODE_FAILED",
			message: "surfaces 定義ファイルのデコードに失敗しました",
			shellName,
			path,
		});
		return null;
	}
}

function orderDefinitionFiles(buckets: ShellDefinitionBuckets): SurfaceDefinitionFile[] {
	const surfacesBase = [...buckets.surfacesBase].sort((a, b) => a.path.localeCompare(b.path));
	const surfacesExtra = [...buckets.surfacesExtra].sort((a, b) => a.path.localeCompare(b.path));
	const aliasFiles = [...buckets.aliasFiles].sort((a, b) => a.path.localeCompare(b.path));
	return [...surfacesBase, ...surfacesExtra, ...aliasFiles];
}
