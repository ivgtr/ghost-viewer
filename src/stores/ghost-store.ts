import { processNarFile } from "@/lib/nar/extract";
import { validateNarFile } from "@/lib/nar/validate";
import type { GhostMeta, GhostStats, ShioriType } from "@/types";
import { createStore } from "./create-store";
import { useFileTreeStore } from "./file-tree-store";
import { useParseStore } from "./parse-store";

interface GhostState {
	meta: GhostMeta | null;
	shioriType: ShioriType;
	stats: GhostStats | null;
	fileName: string | null;
	error: string | null;
	isExtracting: boolean;
	acceptFile: (file: File) => void;
	setMeta: (meta: GhostMeta) => void;
	setShioriType: (shioriType: ShioriType) => void;
	setStats: (stats: GhostStats) => void;
	reset: () => void;
}

const initialState = {
	meta: null,
	shioriType: "unknown" as ShioriType,
	stats: null,
	fileName: null,
	error: null,
	isExtracting: false,
};

export const useGhostStore = createStore<GhostState>(initialState, (set, get) => ({
	acceptFile: (file: File) => {
		if (get().isExtracting) {
			set({ error: "展開処理中です。完了後に再度お試しください" });
			return;
		}

		const result = validateNarFile(file);
		if (!result.valid) {
			set({ error: result.reason, fileName: null });
			return;
		}

		set({
			fileName: file.name,
			error: null,
			meta: null,
			shioriType: "unknown",
			stats: null,
			isExtracting: true,
		});
		useParseStore.getState().reset();
		useFileTreeStore.getState().reset();

		processNarFile(file)
			.then((extractionResult) => {
				useFileTreeStore.getState().setTree(extractionResult.tree);
				set({ stats: extractionResult.stats, isExtracting: false });
			})
			.catch((err: unknown) => {
				const message = err instanceof Error ? err.message : "NAR ファイルの展開に失敗しました";
				set({ error: message, isExtracting: false });
			});
	},
	setMeta: (meta) => set({ meta }),
	setShioriType: (shioriType) => set({ shioriType }),
	setStats: (stats) => set({ stats }),
}));
