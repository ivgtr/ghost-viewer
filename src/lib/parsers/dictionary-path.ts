const SATORI_DIC_TXT_PATTERN = /^dic.*\.txt$/i;

export function normalizeArchivePath(path: string): string {
	return path.replace(/\\/g, "/");
}

export function isDicPath(path: string): boolean {
	return normalizeArchivePath(path).toLowerCase().endsWith(".dic");
}

export function isSatoriDicTxtPath(path: string): boolean {
	const normalized = normalizeArchivePath(path);
	if (!normalized.startsWith("ghost/master/")) {
		return false;
	}
	const segments = normalized.split("/");
	const fileName = segments[segments.length - 1];
	if (!fileName) {
		return false;
	}
	return SATORI_DIC_TXT_PATTERN.test(fileName);
}

export function isBatchParseTargetPath(path: string, shioriType: "yaya" | "satori"): boolean {
	if (isDicPath(path)) {
		return true;
	}
	if (shioriType === "satori") {
		return isSatoriDicTxtPath(path);
	}
	return false;
}

export function isShioriDetectTargetPath(path: string): boolean {
	const normalized = normalizeArchivePath(path);
	if (!normalized.startsWith("ghost/master/")) {
		return false;
	}
	return isDicPath(normalized) || isSatoriDicTxtPath(normalized);
}
