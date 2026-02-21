import { NAR_FILE_INPUT_ACCEPT } from "@/lib/nar/constants";
import { useGhostStore } from "@/stores/ghost-store";
import { useCallback, useRef } from "react";

import type { RefObject } from "react";

export function useNarFileInput(): {
	inputRef: RefObject<HTMLInputElement | null>;
	accept: string;
	handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	triggerFileSelect: () => void;
} {
	const inputRef = useRef<HTMLInputElement | null>(null);

	const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			useGhostStore.getState().acceptFile(file);
		}
		e.target.value = "";
	}, []);

	const triggerFileSelect = useCallback(() => {
		inputRef.current?.click();
	}, []);

	return {
		inputRef,
		accept: NAR_FILE_INPUT_ACCEPT,
		handleChange,
		triggerFileSelect,
	};
}
