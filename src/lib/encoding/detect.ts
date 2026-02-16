export type DetectedEncoding = "utf-8" | "shift_jis" | "euc-jp";

export interface DecodeResult {
	text: string;
	encoding: DetectedEncoding;
}

const MAGIC_BYTES: readonly [readonly number[], string][] = [
	[[0x89, 0x50, 0x4e, 0x47], "PNG"],
	[[0xff, 0xd8, 0xff], "JPEG"],
	[[0x47, 0x49, 0x46], "GIF"],
	[[0x42, 0x4d], "BMP"],
	[[0x4d, 0x5a], "PE/DLL"],
	[[0x7f, 0x45, 0x4c, 0x46], "ELF"],
];

const SCAN_SIZE = 8192;

function isBinary(bytes: Uint8Array): string | null {
	for (const [magic, label] of MAGIC_BYTES) {
		if (bytes.length >= magic.length && magic.every((b, i) => bytes[i] === b)) {
			return label;
		}
	}

	const scanLength = Math.min(bytes.length, SCAN_SIZE);

	for (let i = 0; i < scanLength; i++) {
		if (bytes[i] === 0x00) {
			return "null byte";
		}
	}

	let controlCount = 0;
	for (let i = 0; i < scanLength; i++) {
		const b = bytes[i] as number;
		if (b < 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d) {
			controlCount++;
		}
	}
	if (scanLength > 0 && controlCount / scanLength > 0.1) {
		return "control characters";
	}

	return null;
}

function countJapaneseChars(text: string): number {
	let count = 0;
	for (const ch of text) {
		const code = ch.codePointAt(0) as number;
		if (
			(code >= 0x3040 && code <= 0x309f) ||
			(code >= 0x30a0 && code <= 0x30ff) ||
			(code >= 0x4e00 && code <= 0x9fff)
		) {
			count++;
		}
	}
	return count;
}

export function decodeWithAutoDetection(buffer: ArrayBuffer): DecodeResult {
	if (buffer.byteLength === 0) {
		return { text: "", encoding: "utf-8" };
	}

	const bytes = new Uint8Array(buffer);

	const binaryReason = isBinary(bytes);
	if (binaryReason) {
		throw new Error(`バイナリファイルはテキストとして表示できません (${binaryReason})`);
	}

	if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
		const decoder = new TextDecoder("utf-8");
		return { text: decoder.decode(buffer), encoding: "utf-8" };
	}

	try {
		const decoder = new TextDecoder("utf-8", { fatal: true });
		const text = decoder.decode(buffer);
		return { text, encoding: "utf-8" };
	} catch {
		// UTF-8 ではない — Shift_JIS / EUC-JP を比較
	}

	const sjisText = new TextDecoder("shift_jis").decode(buffer);
	const eucText = new TextDecoder("euc-jp").decode(buffer);

	const sjisScore = countJapaneseChars(sjisText);
	const eucScore = countJapaneseChars(eucText);

	if (eucScore > sjisScore) {
		return { text: eucText, encoding: "euc-jp" };
	}
	return { text: sjisText, encoding: "shift_jis" };
}
