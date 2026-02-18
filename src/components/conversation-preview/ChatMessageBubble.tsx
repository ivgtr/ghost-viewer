import { resolveVariable } from "@/lib/sakura-script/resolve-variable";
import type { ChatMessage } from "@/types/chat-message";

const COLOR_PALETTES = [
	{ bg: "bg-blue-900/50", nameColor: "text-blue-400" },
	{ bg: "bg-green-900/50", nameColor: "text-green-400" },
	{ bg: "bg-purple-900/50", nameColor: "text-purple-400" },
	{ bg: "bg-amber-900/50", nameColor: "text-amber-400" },
	{ bg: "bg-rose-900/50", nameColor: "text-rose-400" },
	{ bg: "bg-cyan-900/50", nameColor: "text-cyan-400" },
] as const;

interface ChatMessageBubbleProps {
	message: ChatMessage;
	characterName: string;
	characterNames: Record<number, string>;
	properties: Record<string, string>;
	onChoiceClick?: (targetFn: string) => void;
	onSurfaceClick?: (scopeId: number, surfaceId: number, syncId: string) => void;
}

export function ChatMessageBubble({
	message,
	characterName,
	characterNames,
	properties,
	onChoiceClick,
	onSurfaceClick,
}: ChatMessageBubbleProps) {
	const alignment = message.characterId === 0 ? "items-start" : "items-end";
	const colorIndex = message.characterId % COLOR_PALETTES.length;
	const bubbleBg = COLOR_PALETTES[colorIndex]?.bg ?? "bg-zinc-700/50";
	const nameColor = COLOR_PALETTES[colorIndex]?.nameColor ?? "text-zinc-400";

	return (
		<div className={`flex flex-col ${alignment} gap-1`}>
			<span className={`text-xs ${nameColor}`}>{characterName}</span>
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
							if (segment.surfaceId !== null && onSurfaceClick) {
								const surfaceId = segment.surfaceId;
								return (
									<button
										key={key}
										type="button"
										aria-label={`s[${segment.value}]`}
										data-testid={`surface-sync-${segment.syncId}`}
										className="mx-0.5 inline-block cursor-pointer rounded bg-zinc-600 px-1.5 py-0.5 text-xs text-zinc-300 transition-colors hover:bg-zinc-500"
										onClick={() => onSurfaceClick(segment.scopeId, surfaceId, segment.syncId)}
									>
										s[{segment.value}]
									</button>
								);
							}
							return (
								<span
									key={key}
									className="mx-0.5 inline-block rounded bg-zinc-700 px-1.5 py-0.5 text-xs text-zinc-400"
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
						case "variable": {
							const resolved = resolveVariable(segment.value, { characterNames, properties });
							if (resolved) {
								return (
									<span
										key={key}
										className="mx-0.5 inline-block rounded bg-purple-800/40 px-1 py-0.5 text-sm text-purple-100"
									>
										{resolved}
									</span>
								);
							}
							return (
								<span
									key={key}
									className="mx-0.5 inline-block rounded bg-purple-800/60 px-1.5 py-0.5 font-mono text-xs text-purple-200"
								>
									%({segment.value})
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
