import type { ParseResult } from "./parse-result";
import type { ShioriType } from "./shiori";

export type WorkerRequest = {
	type: "parse";
	fileContent: ArrayBuffer;
	fileName: string;
	shioriType: ShioriType;
};

export type WorkerResponse =
	| { type: "parsed"; result: ParseResult }
	| { type: "error"; message: string }
	| { type: "progress"; percent: number };
