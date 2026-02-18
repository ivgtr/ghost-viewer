import { createStore } from "./create-store";
import { useFileTreeStore } from "./file-tree-store";

interface CatalogState {
	selectedFunctionName: string | null;
	selectFunction: (name: string | null) => void;
	reset: () => void;
}

export const useCatalogStore = createStore<CatalogState>(
	{
		selectedFunctionName: null,
	},
	(set) => ({
		selectFunction: (name) => {
			set({ selectedFunctionName: name });
			if (name !== null) {
				useFileTreeStore.getState().selectNode(null);
			}
		},
	}),
);
