import { useFileContentStore } from "@/stores/file-content-store";
import { useCallback, useEffect, useRef } from "react";

export function TextViewer() {
	const decodedText = useFileContentStore((s) => s.decodedText);
	const detectedEncoding = useFileContentStore((s) => s.detectedEncoding);
	const decodeError = useFileContentStore((s) => s.decodeError);
	const highlightRange = useFileContentStore((s) => s.highlightRange);
	const scrollTargetRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (highlightRange && scrollTargetRef.current) {
			scrollTargetRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	}, [highlightRange]);

	const isHighlighted = useCallback(
		(lineIndex: number) => {
			if (!highlightRange) return false;
			return lineIndex >= highlightRange.startLine && lineIndex <= highlightRange.endLine;
		},
		[highlightRange],
	);

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
					{lines.map((line, i) => {
						const lineNumber = i + 1;
						const highlighted = isHighlighted(i);
						return (
							<div
								key={lineNumber}
								ref={
									highlighted && highlightRange && i === highlightRange.startLine
										? scrollTargetRef
										: undefined
								}
								className={`flex ${highlighted ? "bg-yellow-900/30" : ""}`}
							>
								<span
									className={`mr-4 inline-block select-none text-right ${highlighted ? "text-yellow-600" : "text-zinc-600"}`}
									style={{ minWidth: `${gutterWidth}ch` }}
								>
									{lineNumber}
								</span>
								<span>{line}</span>
							</div>
						);
					})}
				</pre>
			</div>
		</div>
	);
}
