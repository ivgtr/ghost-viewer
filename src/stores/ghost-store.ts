import { processNarFile } from "@/lib/nar/extract";
import { validateNarFile } from "@/lib/nar/validate";
import { parseDescriptFromBuffer } from "@/lib/parsers/descript";
import { isBatchParseTargetPath } from "@/lib/parsers/dictionary-path";
import { detectShioriType, detectUnsupportedShiori } from "@/lib/parsers/shiori-detect";
import { extractSurfaceAssets } from "@/lib/surfaces/surface-asset-extractor";
import { loadSurfaceDefinitions } from "@/lib/surfaces/surfaces-definition-loader";
import { parseSurfacesCore } from "@/lib/surfaces/surfaces-parser-core";
import { requestParseSatoriBatch, requestParseYayaBatch } from "@/lib/workers/worker-client";
import type {
	BatchParseWorkerFile,
	DicFunction,
	GhostMeta,
	GhostStats,
	ParseDiagnostic,
	ParseResult,
	ShioriType,
} from "@/types";
import { useCatalogStore } from "./catalog-store";
import { createStore } from "./create-store";
import { useFileContentStore } from "./file-content-store";
import { useFileTreeStore } from "./file-tree-store";
import { useParseStore } from "./parse-store";
import { useSurfaceStore } from "./surface-store";
import { useViewStore } from "./view-store";

interface GhostState {
	meta: GhostMeta | null;
	shioriType: ShioriType;
	stats: GhostStats | null;
	fileName: string | null;
	error: string | null;
	unsupportedShioriNotice: string | null;
	isExtracting: boolean;
	acceptFile: (file: File) => void;
	setMeta: (meta: GhostMeta) => void;
	setShioriType: (shioriType: ShioriType) => void;
	setStats: (stats: GhostStats) => void;
	reset: () => void;
}

type GhostDataState = Omit<
	GhostState,
	"acceptFile" | "setMeta" | "setShioriType" | "setStats" | "reset"
>;

const initialState: GhostDataState = {
	meta: null,
	shioriType: "unknown",
	stats: null,
	fileName: null,
	error: null,
	unsupportedShioriNotice: null,
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
			unsupportedShioriNotice: null,
			isExtracting: true,
		});
		useParseStore.getState().reset();
		useFileTreeStore.getState().reset();
		useFileContentStore.getState().reset();
		useCatalogStore.getState().reset();
		useViewStore.getState().reset();
		useSurfaceStore.getState().reset();

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
				const surfaceAssets = extractSurfaceAssets(extractionResult.fileContents);
				const shellNames = surfaceAssets.shells.map((shell) => shell.shellName);
				const definitionLoadResult = loadSurfaceDefinitions(
					extractionResult.fileContents,
					shellNames,
				);
				const parseResult = parseSurfacesCore(definitionLoadResult.filesByShell);
				const surfaceDiagnostics = [
					...surfaceAssets.diagnostics,
					...definitionLoadResult.diagnostics,
					...parseResult.diagnostics,
				];
				useSurfaceStore.getState().initialize({
					catalog: surfaceAssets.shells,
					initialShellName: surfaceAssets.initialShellName,
					definitionsByShell: parseResult.definitionsByShell,
					aliasMapByShell: parseResult.aliasMapByShell,
					diagnostics: surfaceDiagnostics,
					descriptProperties: properties,
				});

				const unsupportedShiori = detectUnsupportedShiori(
					extractionResult.fileContents,
					properties,
				);
				if (unsupportedShiori === "kawari") {
					set({
						shioriType: "unknown",
						stats: extractionResult.stats,
						unsupportedShioriNotice: "Kawari は対応予定です",
						isExtracting: false,
					});
					return;
				}

				const shioriType = detectShioriType(extractionResult.fileContents, properties);
				set({
					shioriType,
					stats: extractionResult.stats,
					unsupportedShioriNotice: null,
					isExtracting: false,
				});

				if (shioriType !== "yaya" && shioriType !== "satori") return;

				const dicPaths: string[] = [];
				for (const path of extractionResult.fileContents.keys()) {
					if (isBatchParseTargetPath(path, shioriType)) {
						dicPaths.push(path);
					}
				}

				if (dicPaths.length === 0) return;

				batchParse(dicPaths, extractionResult.fileContents, shioriType);
			})
			.catch((err: unknown) => {
				const message = err instanceof Error ? err.message : "アーカイブの展開に失敗しました";
				set({ error: message, isExtracting: false });
			});
	},
	setMeta: (meta) => set({ meta }),
	setShioriType: (shioriType) => set({ shioriType }),
	setStats: (stats) => set({ stats }),
}));

const ghostStoreReset = useGhostStore.getState().reset;
useGhostStore.setState({
	reset: () => {
		ghostStoreReset();
		useSurfaceStore.getState().reset();
	},
});

async function batchParse(
	dicPaths: string[],
	fileContents: Map<string, ArrayBuffer>,
	shioriType: "yaya" | "satori",
): Promise<void> {
	const parseStore = useParseStore.getState();
	parseStore.startBatchParse(dicPaths.length);

	const allFunctions: DicFunction[] = [];
	const allDiagnostics: ParseDiagnostic[] = [];
	const files: BatchParseWorkerFile[] = [];
	let missingCount = 0;

	for (const path of dicPaths) {
		const buffer = fileContents.get(path);
		if (!buffer) {
			missingCount++;
			continue;
		}
		files.push({
			filePath: path,
			fileContent: buffer.slice(0),
		});
	}

	let reportedCount = 0;
	for (let i = 0; i < missingCount; i++) {
		useParseStore.getState().incrementParsedCount();
		reportedCount++;
	}

	const requestConfig = resolveBatchRequest(shioriType);
	try {
		const result = await requestConfig.request({
			files,
			onProgress: (percent) => {
				if (files.length === 0) return;

				const parsedFromFiles = Math.floor((percent / 100) * files.length);
				const targetCount = Math.min(dicPaths.length, missingCount + parsedFromFiles);
				while (reportedCount < targetCount) {
					useParseStore.getState().incrementParsedCount();
					reportedCount++;
				}
			},
		});
		allFunctions.push(...result.functions);
		allDiagnostics.push(...result.diagnostics);
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : requestConfig.fallbackErrorMessage;
		allDiagnostics.push({
			level: "error",
			code: requestConfig.diagnosticCode,
			message,
			filePath: "",
			line: 0,
		});
	}

	while (reportedCount < dicPaths.length) {
		useParseStore.getState().incrementParsedCount();
		reportedCount++;
	}

	useParseStore.getState().succeedParse({
		shioriType,
		functions: allFunctions,
		meta: null,
		diagnostics: allDiagnostics,
	});
}

interface BatchRequestOptions {
	files: BatchParseWorkerFile[];
	onProgress?: (percent: number) => void;
}

interface BatchRequestConfig {
	request: (options: BatchRequestOptions) => Promise<ParseResult>;
	diagnosticCode: string;
	fallbackErrorMessage: string;
}

function resolveBatchRequest(shioriType: "yaya" | "satori"): BatchRequestConfig {
	switch (shioriType) {
		case "yaya":
			return {
				request: requestParseYayaBatch,
				diagnosticCode: "YAYA_BATCH_PARSE_FAILED",
				fallbackErrorMessage: "YAYA バッチ解析に失敗しました",
			};
		case "satori":
			return {
				request: requestParseSatoriBatch,
				diagnosticCode: "SATORI_BATCH_PARSE_FAILED",
				fallbackErrorMessage: "Satori バッチ解析に失敗しました",
			};
		default: {
			const _exhaustive: never = shioriType;
			throw new Error(`未対応の SHIORI タイプ: ${_exhaustive}`);
		}
	}
}
