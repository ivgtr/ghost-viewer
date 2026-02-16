import type { ParseResult } from "@/types";
import { createStore } from "./create-store";

interface ParseState {
	parseResult: ParseResult | null;
	isParsing: boolean;
	parseError: string | null;
	parseProgress: number;
	startParse: () => void;
	succeedParse: (result: ParseResult) => void;
	failParse: (error: string) => void;
	updateProgress: (percent: number) => void;
	reset: () => void;
}

export const useParseStore = createStore<ParseState>(
	{
		parseResult: null,
		isParsing: false,
		parseError: null,
		parseProgress: 0,
	},
	(set) => ({
		startParse: () => set({ isParsing: true, parseError: null, parseProgress: 0 }),
		succeedParse: (result) => set({ parseResult: result, isParsing: false, parseProgress: 100 }),
		failParse: (error) => set({ parseError: error, isParsing: false, parseProgress: 0 }),
		updateProgress: (percent: number) => set({ parseProgress: percent }),
	}),
);
