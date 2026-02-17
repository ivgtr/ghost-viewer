import type { ChatMessage, ChatSegment } from "@/types/chat-message";
import type { SakuraScriptToken } from "@/types/sakura-script";

function hasContent(segments: ChatSegment[]): boolean {
	return segments.some(
		(s) =>
			s.type === "text" || s.type === "choice" || s.type === "surface" || s.type === "variable",
	);
}

function stripLeadingLineBreaks(segments: ChatSegment[]): ChatSegment[] {
	const firstContentIndex = segments.findIndex(
		(s) => s.type === "text" || s.type === "choice" || s.type === "variable",
	);
	if (firstContentIndex <= 0) return segments;
	return segments.filter((s, i) => i >= firstContentIndex || s.type !== "lineBreak");
}

export function buildChatMessages(tokens: SakuraScriptToken[]): ChatMessage[] {
	const messages: ChatMessage[] = [];
	let currentCharId = 0;
	let segments: ChatSegment[] = [];

	function flush(): void {
		if (hasContent(segments)) {
			messages.push({ characterId: currentCharId, segments: stripLeadingLineBreaks(segments) });
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
				if (token.raw.startsWith("\\n")) {
					segments.push({ type: "lineBreak", value: "" });
				} else if (token.raw.startsWith("\\c")) {
					flush();
				}
				break;
			// raise, unknown, marker(\e, \t) → skip
		}
	}

	flush();
	return messages;
}
