interface BaseChatSegment {
	type: "text" | "lineBreak" | "surface" | "choice" | "wait" | "variable";
	value: string;
}

export interface ChatTextSegment extends BaseChatSegment {
	type: "text";
}

export interface ChatLineBreakSegment extends BaseChatSegment {
	type: "lineBreak";
}

export interface ChatSurfaceSegment extends BaseChatSegment {
	type: "surface";
	surfaceId: number | null;
	syncId: string;
	scopeId: number;
}

export interface ChatChoiceSegment extends BaseChatSegment {
	type: "choice";
}

export interface ChatWaitSegment extends BaseChatSegment {
	type: "wait";
}

export interface ChatVariableSegment extends BaseChatSegment {
	type: "variable";
}

export type ChatSegment =
	| ChatTextSegment
	| ChatLineBreakSegment
	| ChatSurfaceSegment
	| ChatChoiceSegment
	| ChatWaitSegment
	| ChatVariableSegment;

export interface ChatMessage {
	characterId: number;
	segments: ChatSegment[];
}
