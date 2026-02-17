import {
	lookupDialoguesByFunctionName,
	lookupSourceLocation,
} from "@/lib/analyzers/lookup-dialogues";
import { buildChatMessages } from "@/lib/sakura-script/build-chat-messages";
import { useCatalogStore } from "@/stores/catalog-store";
import { useFileContentStore } from "@/stores/file-content-store";
import { useFileTreeStore } from "@/stores/file-tree-store";
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

	const functions = parseResult?.functions ?? [];

	const dialogues = useMemo(() => {
		if (!selectedFunctionName) return [];
		return lookupDialoguesByFunctionName(selectedFunctionName, functions);
	}, [selectedFunctionName, functions]);

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

	const handleJumpToSource = useCallback(() => {
		if (!selectedFunctionName) return;
		const source = lookupSourceLocation(selectedFunctionName, clampedIndex, functions);
		if (!source) return;
		useFileTreeStore.getState().selectNode(source.filePath);
		useFileContentStore.getState().setHighlightRange({
			startLine: source.startLine,
			endLine: source.endLine,
		});
	}, [selectedFunctionName, clampedIndex, functions]);

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
				<div className="flex items-center gap-2 min-w-0">
					<span className="text-sm font-medium text-zinc-200 truncate">{selectedFunctionName}</span>
					<button
						type="button"
						onClick={handleJumpToSource}
						className="shrink-0 text-zinc-400 hover:text-zinc-200"
						title="ソースコードにジャンプ"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
							className="size-4"
							aria-hidden="true"
						>
							<path
								fillRule="evenodd"
								d="M6.28 5.22a.75.75 0 0 1 0 1.06L2.56 10l3.72 3.72a.75.75 0 0 1-1.06 1.06L.97 10.53a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Zm7.44 0a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L17.44 10l-3.72-3.72a.75.75 0 0 1 0-1.06Z"
								clipRule="evenodd"
							/>
						</svg>
					</button>
				</div>
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
