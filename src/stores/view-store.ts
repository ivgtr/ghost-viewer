import { createStore } from "./create-store";

export interface JumpContext {
	functionName: string;
	variantIndex: number;
	filePath: string;
	startLine: number;
	endLine: number;
}

interface ViewState {
	activeRightPane: "conversation" | "code";
	variantIndexByFunction: Map<string, number>;
	jumpContext: JumpContext | null;
	showConversation: () => void;
	showCode: () => void;
	setVariantIndex: (functionName: string, variantIndex: number) => void;
	setJumpContext: (jumpContext: JumpContext | null) => void;
	reset: () => void;
}

export const useViewStore = createStore<ViewState>(
	{
		activeRightPane: "code",
		variantIndexByFunction: new Map<string, number>(),
		jumpContext: null,
	},
	(set, get) => ({
		showConversation: () => set({ activeRightPane: "conversation" }),
		showCode: () => set({ activeRightPane: "code" }),
		setVariantIndex: (functionName, variantIndex) => {
			const normalizedIndex = Math.max(0, Math.floor(variantIndex));
			const next = new Map(get().variantIndexByFunction);
			next.set(functionName, normalizedIndex);
			set({ variantIndexByFunction: next });
		},
		setJumpContext: (jumpContext) => set({ jumpContext }),
	}),
);
