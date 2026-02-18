import type { DicFunction, GhostMeta, ShioriType } from "./shiori";

export interface ParseDiagnostic {
	level: "warning" | "error";
	code: string;
	message: string;
	filePath: string;
	line: number;
}

export interface ParseResult {
	shioriType: ShioriType;
	functions: DicFunction[];
	meta: GhostMeta | null;
	diagnostics: ParseDiagnostic[];
}
