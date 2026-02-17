export type SakuraScriptTokenType =
	| "text"
	| "charSwitch"
	| "surface"
	| "balloon"
	| "choice"
	| "raise"
	| "wait"
	| "marker"
	| "variable"
	| "unknown";

export interface SakuraScriptToken {
	tokenType: SakuraScriptTokenType;
	raw: string;
	value: string;
	offset: number;
}
