import type { ChatMessage } from "@/types/chat-message";

const FALLBACK_STYLE = {
	alignment: "items-start",
	bg: "bg-amber-900/50",
	nameColor: "text-amber-400",
} as const;

const CHARACTER_STYLES = [
	{ alignment: "items-start", bg: "bg-blue-900/50", nameColor: "text-blue-400" },
	{ alignment: "items-end", bg: "bg-green-900/50", nameColor: "text-green-400" },
	FALLBACK_STYLE,
] as const;

interface ChatMessageBubbleProps {
	message: ChatMessage;
	characterName: string;
	onChoiceClick?: (targetFn: string) => void;
}

export function ChatMessageBubble({
	message,
	characterName,
	onChoiceClick,
}: ChatMessageBubbleProps) {
	const style = CHARACTER_STYLES[message.characterId] ?? FALLBACK_STYLE;
	const alignment = style.alignment;
	const bubbleBg = style.bg;
	const nameBg = style.nameColor;

	return (
		<div className={`flex flex-col ${alignment} gap-1`}>
			<span className={`text-xs ${nameBg}`}>{characterName}</span>
			<div className={`max-w-[85%] rounded-lg px-3 py-2 ${bubbleBg}`}>
				{message.segments.map((segment, i) => {
					const key = `${segment.type}-${i}`;
					switch (segment.type) {
						case "text":
							return (
								<span key={key} className="text-sm text-zinc-200">
									{segment.value}
								</span>
							);
						case "lineBreak":
							return <br key={key} />;
						case "surface":
							return (
								<span
									key={key}
									className="mx-0.5 inline-block rounded bg-zinc-600 px-1.5 py-0.5 text-xs text-zinc-300"
								>
									s[{segment.value}]
								</span>
							);
						case "choice": {
							const label = segment.value.split(",")[0];
							const targetFn = segment.value.split(",")[1]?.trim();
							if (targetFn && onChoiceClick) {
								return (
									<button
										key={key}
										type="button"
										className="mx-0.5 inline-block rounded bg-orange-800/60 px-2 py-0.5 text-xs text-orange-200 hover:bg-orange-700/60 transition-colors cursor-pointer"
										onClick={() => onChoiceClick(targetFn)}
									>
										{label}
									</button>
								);
							}
							return (
								<span
									key={key}
									className="mx-0.5 inline-block rounded bg-orange-800/60 px-2 py-0.5 text-xs text-orange-200"
								>
									{label}
								</span>
							);
						}
						case "variable":
							return (
								<span
									key={key}
									className="mx-0.5 inline-block rounded bg-purple-800/60 px-1.5 py-0.5 font-mono text-xs text-purple-200"
								>
									%({segment.value})
								</span>
							);
						case "wait":
							return null;
					}
				})}
			</div>
		</div>
	);
}
