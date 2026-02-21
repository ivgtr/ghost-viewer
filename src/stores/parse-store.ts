import { collectSurfaceIdsByScope } from "@/lib/analyzers/analyze-conversation-surfaces";
import type { ParseResult } from "@/types";
import { createStore } from "./create-store";
import { useSurfaceStore } from "./surface-store";

interface ParseState {
	parseResult: ParseResult | null;
	isParsing: boolean;
	parseError: string | null;
	parsedFileCount: number;
	totalFileCount: number;
	surfaceIdsByScope: Map<number, number[]>;
	startBatchParse: (totalFileCount: number) => void;
	incrementParsedCount: () => void;
	succeedParse: (result: ParseResult) => void;
	failParse: (error: string) => void;
	reset: () => void;
}

export const useParseStore = createStore<ParseState>(
	{
		parseResult: null,
		isParsing: false,
		parseError: null,
		parsedFileCount: 0,
		totalFileCount: 0,
		surfaceIdsByScope: new Map(),
	},
	(set, get) => ({
		startBatchParse: (totalFileCount: number) =>
			set({ isParsing: true, parseError: null, parsedFileCount: 0, totalFileCount }),
		incrementParsedCount: () => set({ parsedFileCount: get().parsedFileCount + 1 }),
		succeedParse: (result) => {
			const surfaceIdsByScope = collectSurfaceIdsByScope(result.functions);
			set({
				parseResult: result,
				isParsing: false,
				surfaceIdsByScope,
			});
			const parseScopeIds = [...surfaceIdsByScope.keys()].filter((id) => id >= 1);
			if (parseScopeIds.length > 0) {
				const surfaceStore = useSurfaceStore.getState();
				const merged = [...new Set([...surfaceStore.availableSecondaryScopeIds, ...parseScopeIds])];
				surfaceStore.setAvailableSecondaryScopeIds(merged);
			}
		},
		failParse: (error) => set({ parseError: error, isParsing: false }),
	}),
);
