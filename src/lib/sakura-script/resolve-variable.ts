export interface VariableContext {
	characterNames: Record<number, string>;
	properties: Record<string, string>;
	custom?: Record<string, string>;
}

export function resolveVariable(name: string, ctx: VariableContext): string | null {
	const charnameMatch = name.match(/^charname\((\d+)\)$/);
	if (charnameMatch) {
		const id = Number(charnameMatch[1]);
		return ctx.characterNames[id] ?? null;
	}

	if (ctx.custom?.[name] !== undefined) {
		return ctx.custom[name];
	}

	return ctx.properties[name] ?? null;
}
