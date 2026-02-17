export interface ChatSegment {
	type: "text" | "lineBreak" | "surface" | "choice" | "wait" | "variable";
	value: string;
}

export interface ChatMessage {
	characterId: number;
	segments: ChatSegment[];
}
