import type { DicFunction, GhostMeta, ShioriType } from "./shiori";

export interface ParseResult {
	shioriType: ShioriType;
	functions: DicFunction[];
	meta: GhostMeta | null;
}
