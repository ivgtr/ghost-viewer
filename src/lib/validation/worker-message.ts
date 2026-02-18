import {
	array,
	finite,
	instance,
	integer,
	literal,
	maxValue,
	minValue,
	null_,
	number,
	object,
	parse,
	pipe,
	record,
	string,
	union,
} from "valibot";

import type { WorkerRequest, WorkerResponse } from "@/types";

const NON_NEGATIVE_INTEGER_SCHEMA = pipe(number(), finite(), integer(), minValue(0));
const PROGRESS_PERCENT_SCHEMA = pipe(number(), finite(), minValue(0), maxValue(100));

const SAKURA_SCRIPT_TOKEN_SCHEMA = object({
	tokenType: union([
		literal("text"),
		literal("charSwitch"),
		literal("surface"),
		literal("balloon"),
		literal("choice"),
		literal("raise"),
		literal("directive"),
		literal("wait"),
		literal("marker"),
		literal("variable"),
		literal("unknown"),
	]),
	raw: string(),
	value: string(),
	offset: NON_NEGATIVE_INTEGER_SCHEMA,
});

const DIALOGUE_SCHEMA = object({
	tokens: array(SAKURA_SCRIPT_TOKEN_SCHEMA),
	startLine: NON_NEGATIVE_INTEGER_SCHEMA,
	endLine: NON_NEGATIVE_INTEGER_SCHEMA,
	rawText: string(),
});

const DIC_FUNCTION_SCHEMA = object({
	name: string(),
	filePath: string(),
	startLine: NON_NEGATIVE_INTEGER_SCHEMA,
	endLine: NON_NEGATIVE_INTEGER_SCHEMA,
	dialogues: array(DIALOGUE_SCHEMA),
});

const GHOST_META_SCHEMA = object({
	name: string(),
	author: string(),
	characterNames: record(string(), string()),
	properties: record(string(), string()),
});

const PARSE_DIAGNOSTIC_SCHEMA = object({
	level: union([literal("warning"), literal("error")]),
	code: string(),
	message: string(),
	filePath: string(),
	line: NON_NEGATIVE_INTEGER_SCHEMA,
});

const PARSE_RESULT_SCHEMA = object({
	shioriType: union([literal("yaya"), literal("satori"), literal("kawari"), literal("unknown")]),
	functions: array(DIC_FUNCTION_SCHEMA),
	meta: union([GHOST_META_SCHEMA, null_()]),
	diagnostics: array(PARSE_DIAGNOSTIC_SCHEMA),
});

const BATCH_PARSE_WORKER_FILE_SCHEMA = object({
	filePath: string(),
	fileContent: instance(ArrayBuffer),
});

const WORKER_REQUEST_SCHEMA = union([
	object({
		type: literal("parse-yaya-batch"),
		files: array(BATCH_PARSE_WORKER_FILE_SCHEMA),
	}),
	object({
		type: literal("parse-satori-batch"),
		files: array(BATCH_PARSE_WORKER_FILE_SCHEMA),
	}),
	object({
		type: literal("parse-kawari-batch"),
		files: array(BATCH_PARSE_WORKER_FILE_SCHEMA),
	}),
]);

const WORKER_RESPONSE_SCHEMA = union([
	object({
		type: literal("parsed"),
		result: PARSE_RESULT_SCHEMA,
	}),
	object({
		type: literal("error"),
		message: string(),
	}),
	object({
		type: literal("progress"),
		percent: PROGRESS_PERCENT_SCHEMA,
	}),
]);

export function parseWorkerRequest(input: unknown): WorkerRequest {
	return parse(WORKER_REQUEST_SCHEMA, input);
}

export function parseWorkerResponse(input: unknown): WorkerResponse {
	return parse(WORKER_RESPONSE_SCHEMA, input);
}
