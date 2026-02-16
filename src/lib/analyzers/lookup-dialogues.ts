import type { Dialogue, DicFunction } from "@/types/shiori";

export function lookupDialoguesByFunctionName(name: string, functions: DicFunction[]): Dialogue[] {
	return functions.filter((fn) => fn.name === name).flatMap((fn) => fn.dialogues);
}
