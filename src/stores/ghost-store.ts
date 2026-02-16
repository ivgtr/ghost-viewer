import { classifyFileKind } from "@/lib/nar/extract";
import { processNarFile } from "@/lib/nar/extract";
import { validateNarFile } from "@/lib/nar/validate";
import { parseDescriptFromBuffer } from "@/lib/parsers/descript";
import { detectShioriType } from "@/lib/parsers/shiori-detect";
import { requestParse } from "@/lib/workers/worker-client";
import type { DicFunction, GhostMeta, GhostStats, ShioriType } from "@/types";
import { createStore } from "./create-store";
import { useFileContentStore } from "./file-content-store";
import { useFileTreeStore } from "./file-tree-store";
import { useParseStore } from "./parse-store";

interface GhostState {
	meta: GhostMeta | null;
	shioriType: ShioriType;
	stats: GhostStats | null;
	fileName: string | null;
	error: string | null;
	isExtracting: boolean;
	acceptFile: (file: File) => void;
	setMeta: (meta: GhostMeta) => void;
	setShioriType: (shioriType: ShioriType) => void;
	setStats: (stats: GhostStats) => void;
	reset: () => void;
}

const initialState = {
	meta: null,
	shioriType: "unknown" as ShioriType,
	stats: null,
	fileName: null,
	error: null,
	isExtracting: false,
};

export const useGhostStore = createStore<GhostState>(initialState, (set, get) => ({
	acceptFile: (file: File) => {
		if (get().isExtracting) {
			set({ error: "展開処理中です。完了後に再度お試しください" });
			return;
		}

		const result = validateNarFile(file);
		if (!result.valid) {
			set({ error: result.reason, fileName: null });
			return;
		}

		set({
			fileName: file.name,
			error: null,
			meta: null,
			shioriType: "unknown",
			stats: null,
			isExtracting: true,
		});
		useParseStore.getState().reset();
		useFileTreeStore.getState().reset();
		useFileContentStore.getState().reset();

		processNarFile(file)
			.then((extractionResult) => {
				useFileTreeStore.getState().setTree(extractionResult.tree);
				useFileContentStore.getState().setFileContents(extractionResult.fileContents);

				const descriptBuffer = extractionResult.fileContents.get("ghost/master/descript.txt");
				let properties: Record<string, string> = {};
				if (descriptBuffer) {
					const meta = parseDescriptFromBuffer(descriptBuffer);
					properties = meta.properties;
					set({ meta });
				}

				const shioriType = detectShioriType(extractionResult.fileContents, properties);
				set({ shioriType, stats: extractionResult.stats, isExtracting: false });

				if (shioriType !== "yaya" && shioriType !== "satori") return;

				const dicPaths: string[] = [];
				for (const path of extractionResult.fileContents.keys()) {
					if (classifyFileKind(path) === "dictionary") {
						dicPaths.push(path);
					}
				}

				if (dicPaths.length === 0) return;

				batchParse(dicPaths, extractionResult.fileContents, shioriType);
			})
			.catch((err: unknown) => {
				const message = err instanceof Error ? err.message : "NAR ファイルの展開に失敗しました";
				set({ error: message, isExtracting: false });
			});
	},
	setMeta: (meta) => set({ meta }),
	setShioriType: (shioriType) => set({ shioriType }),
	setStats: (stats) => set({ stats }),
}));

async function batchParse(
	dicPaths: string[],
	fileContents: Map<string, ArrayBuffer>,
	shioriType: "yaya" | "satori",
): Promise<void> {
	const parseStore = useParseStore.getState();
	parseStore.startBatchParse(dicPaths.length);

	const allFunctions: DicFunction[] = [];

	for (const path of dicPaths) {
		const buffer = fileContents.get(path);
		if (!buffer) {
			useParseStore.getState().incrementParsedCount();
			continue;
		}

		const fileName = path.slice(path.lastIndexOf("/") + 1);

		try {
			const result = await requestParse({
				fileContent: buffer.slice(0),
				fileName,
				shioriType,
			});
			allFunctions.push(...result.functions);
		} catch {
			// 個別ファイルのパースエラーはスキップし続行
		}

		useParseStore.getState().incrementParsedCount();
	}

	useParseStore.getState().succeedParse({
		shioriType,
		functions: allFunctions,
		meta: null,
	});
}
