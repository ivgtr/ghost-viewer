export type SakuraScriptTokenType =
	| "text"
	| "charSwitch"
	| "surface"
	| "choice"
	| "raise"
	| "wait"
	| "marker"
	| "unknown";

export interface SakuraScriptToken {
	tokenType: SakuraScriptTokenType;
	raw: string;
	value: string;
	offset: number;
}
