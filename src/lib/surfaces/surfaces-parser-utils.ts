export function unquote(value: string): string {
	if (
		(value.startsWith('"') && value.endsWith('"')) ||
		(value.startsWith("'") && value.endsWith("'"))
	) {
		return value.slice(1, -1);
	}
	return value;
}

export function parseNullableInteger(value: string | undefined): number | null {
	if (value === undefined) {
		return null;
	}
	const normalized = value.trim();
	if (!/^-?\d+$/.test(normalized)) {
		return null;
	}
	return Number(normalized);
}

export function parseNullableNumber(value: string | undefined): number | null {
	if (value === undefined) {
		return null;
	}
	const parsed = Number(value.trim());
	if (!Number.isFinite(parsed)) {
		return null;
	}
	return parsed;
}

export function stripLineComment(line: string): string {
	const commentIndex = line.indexOf("//");
	if (commentIndex === -1) {
		return line;
	}
	return line.slice(0, commentIndex);
}

export function hashPointKey(key: string): number {
	let hash = 0;
	for (const char of key) {
		hash = (hash * 31 + char.charCodeAt(0)) | 0;
	}
	return Math.abs(hash);
}
