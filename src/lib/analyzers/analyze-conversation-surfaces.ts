import type { ChatMessage } from "@/types/chat-message";
import type { DicFunction } from "@/types/shiori";

interface ConversationSurfaceAnalysis {
	firstByScope: Array<{ scopeId: number; requestedSurfaceId: number }>;
}

export function analyzeConversationSurfaces(messages: ChatMessage[]): ConversationSurfaceAnalysis {
	const firstSurfaceByScope = new Map<number, number>();

	for (const message of messages) {
		for (const segment of message.segments) {
			if (segment.type !== "surface" || segment.surfaceId === null) {
				continue;
			}
			if (!firstSurfaceByScope.has(segment.scopeId)) {
				firstSurfaceByScope.set(segment.scopeId, segment.surfaceId);
			}
		}
	}

	return {
		firstByScope: [...firstSurfaceByScope.entries()].map(([scopeId, requestedSurfaceId]) => ({
			scopeId,
			requestedSurfaceId,
		})),
	};
}

export function collectSurfaceIdsByScope(functions: DicFunction[]): Map<number, number[]> {
	const sets = new Map<number, Set<number>>();
	for (const fn of functions) {
		for (const dialogue of fn.dialogues) {
			let scope = 0;
			for (const token of dialogue.tokens) {
				if (token.tokenType === "charSwitch") {
					const n = Number(token.value);
					if (Number.isInteger(n) && n >= 0) scope = n;
				} else if (token.tokenType === "surface") {
					const id = Number(token.value);
					if (!Number.isInteger(id)) continue;
					let set = sets.get(scope);
					if (!set) {
						set = new Set();
						sets.set(scope, set);
					}
					set.add(id);
				}
			}
		}
	}
	const result = new Map<number, number[]>();
	for (const [scopeId, set] of sets) {
		result.set(
			scopeId,
			[...set].sort((a, b) => a - b),
		);
	}
	return result;
}
