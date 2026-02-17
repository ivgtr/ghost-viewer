import type { ChatMessage, ChatSegment } from "@/types/chat-message";
import type { SakuraScriptToken } from "@/types/sakura-script";

function hasContent(segments: ChatSegment[]): boolean {
	return segments.some(
		(s) =>
			s.type === "text" || s.type === "choice" || s.type === "surface" || s.type === "variable",
	);
}

export function buildChatMessages(tokens: SakuraScriptToken[]): ChatMessage[] {
	const messages: ChatMessage[] = [];
	let currentCharId = 0;
	let segments: ChatSegment[] = [];

	function flush(): void {
		if (hasContent(segments)) {
			messages.push({ characterId: currentCharId, segments });
		}
		segments = [];
	}

	for (const token of tokens) {
		switch (token.tokenType) {
			case "charSwitch": {
				flush();
				currentCharId = Number(token.value);
				break;
			}
			case "text":
				segments.push({ type: "text", value: token.value });
				break;
			case "surface":
				segments.push({ type: "surface", value: token.value });
				break;
			case "choice":
				segments.push({ type: "choice", value: token.value });
				break;
			case "variable":
				segments.push({ type: "variable", value: token.value });
				break;
			case "wait":
				segments.push({ type: "wait", value: token.value });
				break;
			case "marker":
				if (token.raw === "\\n") {
					segments.push({ type: "lineBreak", value: "" });
				}
				break;
			// raise, unknown, marker(\e) → skip
		}
	}

	flush();
	return messages;
}
