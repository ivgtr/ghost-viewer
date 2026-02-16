/** NAR エントリのメタ情報（パスとサイズのみ。実データは別責務で管理） */
export interface NarEntryMeta {
	path: string;
	size: number;
}

/** 展開済み NAR ファイルのメタ情報 */
export interface NarFile {
	fileName: string;
	fileSize: number;
	entries: NarEntryMeta[];
	totalSize: number;
}

export type NarValidationResult = { valid: true } | { valid: false; reason: string };
