import type { ParseResult } from "@/types";
import { createStore } from "./create-store";

interface ParseState {
	parseResult: ParseResult | null;
	isParsing: boolean;
	parseError: string | null;
	parsedFileCount: number;
	totalFileCount: number;
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
	},
	(set, get) => ({
		startBatchParse: (totalFileCount: number) =>
			set({ isParsing: true, parseError: null, parsedFileCount: 0, totalFileCount }),
		incrementParsedCount: () => set({ parsedFileCount: get().parsedFileCount + 1 }),
		succeedParse: (result) => set({ parseResult: result, isParsing: false }),
		failParse: (error) => set({ parseError: error, isParsing: false }),
	}),
);
