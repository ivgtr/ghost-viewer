import { useFileContentStore } from "@/stores/file-content-store";
import { useEffect, useState } from "react";

export function ImageViewer({ filePath }: { filePath: string }) {
	const buffer = useFileContentStore((s) => s.fileContents.get(filePath));
	const [objectUrl, setObjectUrl] = useState<string | null>(null);

	useEffect(() => {
		if (!buffer) {
			setObjectUrl(null);
			return;
		}
		const url = URL.createObjectURL(new Blob([buffer]));
		setObjectUrl(url);
		return () => {
			URL.revokeObjectURL(url);
		};
	}, [buffer]);

	if (!objectUrl) {
		return (
			<div className="flex h-full items-center justify-center text-sm text-zinc-500">
				画像を読み込めません
			</div>
		);
	}

	return (
		<div className="flex h-full items-center justify-center overflow-auto bg-zinc-900 p-4">
			<img src={objectUrl} alt={filePath} className="max-h-full max-w-full object-contain" />
		</div>
	);
}
