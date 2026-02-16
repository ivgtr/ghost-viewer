import { lookupDialoguesByFunctionName } from "@/lib/analyzers/lookup-dialogues";
import { buildChatMessages } from "@/lib/sakura-script/build-chat-messages";
import { useCatalogStore } from "@/stores/catalog-store";
import { useGhostStore } from "@/stores/ghost-store";
import { useParseStore } from "@/stores/parse-store";
import { useCallback, useMemo, useState } from "react";
import { ChatMessageBubble } from "./ChatMessageBubble";
import { VariantSelector } from "./VariantSelector";

export function ConversationPreview() {
	const selectedFunctionName = useCatalogStore((s) => s.selectedFunctionName);
	const selectFunction = useCatalogStore((s) => s.selectFunction);
	const parseResult = useParseStore((s) => s.parseResult);
	const meta = useGhostStore((s) => s.meta);
	const [variantIndex, setVariantIndex] = useState(0);

	const dialogues = useMemo(() => {
		if (!selectedFunctionName) return [];
		return lookupDialoguesByFunctionName(selectedFunctionName, parseResult?.functions ?? []);
	}, [selectedFunctionName, parseResult]);

	const clampedIndex = Math.min(variantIndex, Math.max(0, dialogues.length - 1));

	const messages = useMemo(() => {
		const dialogue = dialogues[clampedIndex];
		if (!dialogue) return [];
		return buildChatMessages(dialogue.tokens);
	}, [dialogues, clampedIndex]);

	const sakuraName = meta?.sakuraName ?? "\\0";
	const keroName = meta?.keroName ?? "\\1";

	const handleChoiceClick = useCallback(
		(targetFn: string) => {
			selectFunction(targetFn);
			setVariantIndex(0);
		},
		[selectFunction],
	);

	if (!selectedFunctionName) {
		return (
			<div className="flex h-full items-center justify-center text-zinc-500">
				イベントを選択してください
			</div>
		);
	}

	if (dialogues.length === 0) {
		return (
			<div className="flex h-full items-center justify-center text-zinc-500">
				ダイアログが見つかりません
			</div>
		);
	}

	const handleVariantChange = (index: number) => {
		setVariantIndex(index);
	};

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<div className="flex items-center justify-between border-b border-zinc-700 px-4 py-2">
				<span className="text-sm font-medium text-zinc-200 truncate">{selectedFunctionName}</span>
				<VariantSelector
					count={dialogues.length}
					selected={clampedIndex}
					onChange={handleVariantChange}
				/>
			</div>
			<div className="flex-1 space-y-3 overflow-auto p-4">
				{messages.map((msg, i) => (
					<ChatMessageBubble
						// biome-ignore lint/suspicious/noArrayIndexKey: メッセージ列は静的で並び替えが発生しない
						key={i}
						message={msg}
						characterName={msg.characterId === 0 ? sakuraName : keroName}
						onChoiceClick={handleChoiceClick}
					/>
				))}
			</div>
		</div>
	);
}
