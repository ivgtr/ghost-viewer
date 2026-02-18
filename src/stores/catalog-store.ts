import { createStore } from "./create-store";

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
		},
	}),
);
