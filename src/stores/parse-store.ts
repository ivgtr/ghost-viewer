import type { ParseResult } from "@/types";
import { createStore } from "./create-store";

interface ParseState {
	parseResult: ParseResult | null;
	isParsing: boolean;
	parseError: string | null;
	startParse: () => void;
	succeedParse: (result: ParseResult) => void;
	failParse: (error: string) => void;
	reset: () => void;
}

export const useParseStore = createStore<ParseState>(
	{
		parseResult: null,
		isParsing: false,
		parseError: null,
	},
	(set) => ({
		startParse: () => set({ isParsing: true, parseError: null }),
		succeedParse: (result) => set({ parseResult: result, isParsing: false }),
		failParse: (error) => set({ parseError: error, isParsing: false }),
	}),
);
