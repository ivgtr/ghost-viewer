import { create } from "zustand";

type DataProps<T> = {
	[K in keyof T as T[K] extends (...args: never[]) => unknown ? never : K]: T[K];
};

type ActionProps<T> = {
	[K in keyof T as T[K] extends (...args: never[]) => unknown ? K : never]: T[K];
};

export function createStore<T extends { reset: () => void }>(
	initialState: DataProps<T>,
	createActions: (
		set: (partial: Partial<DataProps<T>>) => void,
		get: () => T,
	) => Omit<ActionProps<T>, "reset">,
) {
	return create<T>()((set, get) => {
		const setData = (partial: Partial<DataProps<T>> | DataProps<T>) => {
			set((state) => ({ ...state, ...partial }));
		};
		const actions = createActions((partial) => setData(partial), get);
		const state = {
			...initialState,
			...actions,
			reset: () => setData(initialState),
		};
		return state as T;
	});
}
