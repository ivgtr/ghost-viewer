import { NAR_FILE_INPUT_ACCEPT } from "@/lib/nar/constants";
import { useGhostStore } from "@/stores/ghost-store";
import { useRef, useState } from "react";

export function DropZone() {
	const [isDragOver, setIsDragOver] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const error = useGhostStore((s) => s.error);
	const fileName = useGhostStore((s) => s.fileName);

	const handleFile = (file: File | undefined) => {
		if (file) {
			useGhostStore.getState().acceptFile(file);
		}
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);
		handleFile(e.dataTransfer.files[0]);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);
	};

	const handleClick = () => {
		inputRef.current?.click();
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		handleFile(e.target.files?.[0]);
		e.target.value = "";
	};

	return (
		<div className="flex h-full flex-col items-center justify-center p-4">
			<button
				type="button"
				aria-label="NAR/ZIPファイルをドロップまたはクリックして選択"
				aria-describedby={error ? "dropzone-error" : undefined}
				className={`flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
					isDragOver ? "border-blue-400 bg-blue-400/10" : "border-zinc-600 hover:border-zinc-400"
				}`}
				onClick={handleClick}
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
			>
				<p className="text-sm text-zinc-400">
					{fileName ? fileName : "NAR/ZIPファイルをドロップまたはクリックして選択"}
				</p>
				<input
					ref={inputRef}
					type="file"
					accept={NAR_FILE_INPUT_ACCEPT}
					className="hidden"
					onChange={handleChange}
				/>
			</button>
			{error && (
				<p id="dropzone-error" role="alert" className="mt-2 text-sm text-red-400">
					{error}
				</p>
			)}
		</div>
	);
}
