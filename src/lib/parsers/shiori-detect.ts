import { decodeWithAutoDetection } from "@/lib/encoding/detect";
import { isShioriDetectTargetPath } from "@/lib/parsers/dictionary-path";
import type { ShioriType } from "@/types";

const DLL_MAP: Record<string, ShioriType> = {
	"yaya.dll": "yaya",
	"aya5.dll": "yaya",
	"aya.dll": "yaya",
	"satori.dll": "satori",
	"kawari.dll": "kawari",
	"kawarirc.dll": "kawari",
};

export function detectShioriByDll(dllName: string): ShioriType | null {
	const normalized = dllName.trim().toLowerCase();
	return DLL_MAP[normalized] ?? null;
}

export function detectShioriByContent(dicTexts: string[]): ShioriType | null {
	let yayaScore = 0;
	let satoriScore = 0;

	for (const text of dicTexts) {
		for (const line of text.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (trimmed === "{" || trimmed === "}") {
				yayaScore++;
			} else if (/\breturn\b/.test(trimmed)) {
				yayaScore++;
			} else if (/\bif\b/.test(trimmed)) {
				yayaScore++;
			} else if (/\belse\b/.test(trimmed)) {
				yayaScore++;
			}

			if (line.startsWith("\uFF0A")) {
				satoriScore++;
			}
			if (line.startsWith("\uFF1A")) {
				satoriScore++;
			}
		}
	}

	if (yayaScore === 0 && satoriScore === 0) {
		return null;
	}
	return yayaScore >= satoriScore ? "yaya" : "satori";
}

export function detectShioriType(
	fileContents: Map<string, ArrayBuffer>,
	properties: Record<string, string>,
): ShioriType {
	const shioriDll = properties.shiori;
	if (shioriDll) {
		const result = detectShioriByDll(shioriDll);
		if (result) {
			return result;
		}
	}

	const dicTexts: string[] = [];
	for (const [path, buffer] of fileContents) {
		if (!isShioriDetectTargetPath(path)) {
			continue;
		}
		try {
			const { text } = decodeWithAutoDetection(buffer);
			dicTexts.push(text);
		} catch {
			// バイナリファイルはスキップ
		}
	}

	const contentResult = detectShioriByContent(dicTexts);
	if (contentResult) {
		return contentResult;
	}

	return "unknown";
}
