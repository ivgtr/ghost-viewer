import { useFileContentStore } from "@/stores/file-content-store";

export function TextViewer() {
	const decodedText = useFileContentStore((s) => s.decodedText);
	const detectedEncoding = useFileContentStore((s) => s.detectedEncoding);
	const decodeError = useFileContentStore((s) => s.decodeError);

	if (decodeError) {
		return (
			<div className="flex h-full items-center justify-center text-zinc-400">
				<p>{decodeError}</p>
			</div>
		);
	}

	if (decodedText === null) {
		return (
			<div className="flex h-full items-center justify-center text-zinc-500">
				ファイルを選択してください
			</div>
		);
	}

	const lines = decodedText.split("\n");
	const gutterWidth = String(lines.length).length;

	return (
		<div className="flex h-full flex-col overflow-hidden">
			<div className="flex items-center gap-3 border-b border-zinc-700 px-4 py-2 text-xs text-zinc-400">
				<span>{detectedEncoding?.toUpperCase()}</span>
				<span>{lines.length} 行</span>
			</div>
			<div className="flex-1 overflow-auto">
				<pre className="p-4 text-sm leading-6 text-zinc-200">
					{lines.map((line, i) => (
						// biome-ignore lint/suspicious/noArrayIndexKey: 行は静的リストで並び替えが発生しない
						<div key={i} className="flex">
							<span
								className="mr-4 inline-block select-none text-right text-zinc-600"
								style={{ minWidth: `${gutterWidth}ch` }}
							>
								{i + 1}
							</span>
							<span>{line}</span>
						</div>
					))}
				</pre>
			</div>
		</div>
	);
}
