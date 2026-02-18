import type { SurfaceExtractionResult } from "@/types";
import { createStore } from "./create-store";

interface SurfaceState {
	shells: SurfaceExtractionResult["shells"];
	selectedShellName: string | null;
	diagnostics: SurfaceExtractionResult["diagnostics"];
	setExtractionResult: (result: SurfaceExtractionResult) => void;
	selectShell: (shellName: string | null) => void;
	reset: () => void;
}

export const useSurfaceStore = createStore<SurfaceState>(
	{
		shells: [],
		selectedShellName: null,
		diagnostics: [],
	},
	(set, get) => ({
		setExtractionResult: (result) => {
			const selectedShellName = resolveSelectedShell(result);
			set({
				shells: result.shells,
				selectedShellName,
				diagnostics: result.diagnostics,
			});
		},
		selectShell: (shellName) => {
			if (shellName === null) {
				set({ selectedShellName: null });
				return;
			}
			const exists = get().shells.some((shell) => shell.shellName === shellName);
			if (!exists) {
				return;
			}
			set({ selectedShellName: shellName });
		},
	}),
);

function resolveSelectedShell(result: SurfaceExtractionResult): string | null {
	if (result.initialShellName !== null) {
		return result.initialShellName;
	}
	return result.shells[0]?.shellName ?? null;
}
