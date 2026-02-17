import { decodeWithAutoDetection } from "@/lib/encoding/detect";
import type { DetectedEncoding } from "@/lib/encoding/detect";
import { createStore } from "./create-store";

interface HighlightRange {
	startLine: number;
	endLine: number;
}

interface FileContentState {
	fileContents: Map<string, ArrayBuffer>;
	decodedText: string | null;
	detectedEncoding: DetectedEncoding | null;
	decodeError: string | null;
	highlightRange: HighlightRange | null;
	setFileContents: (contents: Map<string, ArrayBuffer>) => void;
	decodeFile: (path: string) => void;
	setHighlightRange: (range: HighlightRange | null) => void;
	reset: () => void;
}

export const useFileContentStore = createStore<FileContentState>(
	{
		fileContents: new Map<string, ArrayBuffer>(),
		decodedText: null,
		detectedEncoding: null,
		decodeError: null,
		highlightRange: null,
	},
	(set, get) => ({
		setFileContents: (contents) => set({ fileContents: contents }),
		setHighlightRange: (range) => set({ highlightRange: range }),
		decodeFile: (path) => {
			const buffer = get().fileContents.get(path);
			if (!buffer) {
				set({
					decodedText: null,
					detectedEncoding: null,
					decodeError: `ファイルが見つかりません: ${path}`,
					highlightRange: null,
				});
				return;
			}
			try {
				const result = decodeWithAutoDetection(buffer);
				set({
					decodedText: result.text,
					detectedEncoding: result.encoding,
					decodeError: null,
					highlightRange: null,
				});
			} catch (err: unknown) {
				const message = err instanceof Error ? err.message : "デコードに失敗しました";
				set({
					decodedText: null,
					detectedEncoding: null,
					decodeError: message,
					highlightRange: null,
				});
			}
		},
	}),
);
