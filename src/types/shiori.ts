import type { SakuraScriptToken } from "./sakura-script";

export type ShioriType = "yaya" | "satori" | "kawari" | "unknown";

export interface GhostMeta {
	name: string;
	author: string;
	sakuraName: string;
	keroName: string;
	properties: Record<string, string>;
}

export interface DicFunction {
	name: string;
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
