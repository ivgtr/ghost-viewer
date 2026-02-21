import type { ChatMessage } from "@/types/chat-message";

export function findFirstNonZeroSpeaker(messages: ChatMessage[]): number | null {
	for (const message of messages) {
		if (message.characterId !== 0) {
			return message.characterId;
		}
	}
	return null;
}
