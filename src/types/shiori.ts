import type { SakuraScriptToken } from "./sakura-script";

export type ShioriType = "yaya" | "satori" | "unknown";

export interface GhostMeta {
	name: string;
	author: string;
	characterNames: Record<number, string>;
	properties: Record<string, string>;
}

export interface DicFunction {
	name: string;
	condition?: string | null;
	filePath: string;
	startLine: number;
	endLine: number;
	dialogues: Dialogue[];
}

export interface Dialogue {
	tokens: SakuraScriptToken[];
	startLine: number;
	endLine: number;
	rawText: string;
}
