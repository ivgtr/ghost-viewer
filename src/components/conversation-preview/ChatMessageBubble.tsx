import type { ChatMessage } from "@/types/chat-message";

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
	const isKero = message.characterId === 1;
	const alignment = isKero ? "items-end" : "items-start";
	const bubbleBg = isKero ? "bg-green-900/50" : "bg-blue-900/50";
	const nameBg = isKero ? "text-green-400" : "text-blue-400";

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
						case "wait":
							return null;
					}
				})}
			</div>
		</div>
	);
}
