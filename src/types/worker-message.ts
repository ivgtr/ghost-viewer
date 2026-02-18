import type { ParseResult } from "./parse-result";

export interface BatchParseWorkerFile {
	fileContent: ArrayBuffer;
	filePath: string;
}

export interface ParseYayaBatchWorkerRequest {
	type: "parse-yaya-batch";
	files: BatchParseWorkerFile[];
}

export interface ParseSatoriBatchWorkerRequest {
	type: "parse-satori-batch";
	files: BatchParseWorkerFile[];
}

export interface ParseKawariBatchWorkerRequest {
	type: "parse-kawari-batch";
	files: BatchParseWorkerFile[];
}

export type WorkerRequest =
	| ParseYayaBatchWorkerRequest
	| ParseSatoriBatchWorkerRequest
	| ParseKawariBatchWorkerRequest;

export type WorkerResponse =
	| { type: "parsed"; result: ParseResult }
	| { type: "error"; message: string }
	| { type: "progress"; percent: number };
