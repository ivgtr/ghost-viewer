import { useEffect, useMemo, useRef, useState } from "react";
import { useFileContentStore } from "@/stores/file-content-store";
import { useSurfaceStore } from "@/stores/surface-store";
import type { ShellSurfaceCatalog } from "@/types";

export function GhostViewerPanel() {
	const catalog = useSurfaceStore((state) => state.catalog);
	const selectedShellName = useSurfaceStore((state) => state.selectedShellName);
	const currentSurfaceByScope = useSurfaceStore((state) => state.currentSurfaceByScope);
	const focusedScope = useSurfaceStore((state) => state.focusedScope);
	const notifications = useSurfaceStore((state) => state.notifications);
	const selectShell = useSurfaceStore((state) => state.selectShell);
	const setFocusedScope = useSurfaceStore((state) => state.setFocusedScope);
	const fileContents = useFileContentStore((state) => state.fileContents);

	const selectedShell = useMemo(
		() => catalog.find((entry) => entry.shellName === selectedShellName) ?? null,
		[catalog, selectedShellName],
	);
	const sakuraSurfaceId = currentSurfaceByScope.get(0) ?? null;
	const keroSurfaceId = currentSurfaceByScope.get(1) ?? null;

	const sakuraPngBuffer = useMemo(
		() => resolveSurfacePngBuffer(selectedShell, sakuraSurfaceId, fileContents),
		[selectedShell, sakuraSurfaceId, fileContents],
	);
	const keroPngBuffer = useMemo(
		() => resolveSurfacePngBuffer(selectedShell, keroSurfaceId, fileContents),
		[selectedShell, keroSurfaceId, fileContents],
	);

	const sakuraImageUrl = useObjectUrl(sakuraPngBuffer);
	const keroImageUrl = useObjectUrl(keroPngBuffer);

	return (
		<div className="flex h-full min-h-0 flex-col overflow-hidden">
			<div className="border-b border-zinc-700 px-4 py-2">
				<p className="text-sm font-medium text-zinc-200">ゴーストビューアー</p>
				<p className="text-xs text-zinc-400">
					{selectedShell
						? `shell: ${selectedShell.shellName} / surface: ${selectedShell.assets.length}`
						: "利用可能なサーフェスがありません"}
				</p>
			</div>

			{catalog.length > 1 ? (
				<div className="border-b border-zinc-700 px-4 py-2">
					<label htmlFor="shell-select" className="mr-2 text-xs text-zinc-400">
						shell
					</label>
					<select
						id="shell-select"
						value={selectedShellName ?? ""}
						onChange={(event) => selectShell(event.target.value || null)}
						className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-xs text-zinc-200"
					>
						{catalog.map((shell) => (
							<option key={shell.shellName} value={shell.shellName}>
								{shell.shellName}
							</option>
						))}
					</select>
				</div>
			) : null}

			<div className="grid min-h-0 flex-1 grid-cols-2 gap-3 p-3">
				<SurfaceScopeCard
					label="さくら"
					scopeId={0}
					surfaceId={sakuraSurfaceId}
					imageUrl={sakuraImageUrl}
					focused={focusedScope === 0}
					onFocus={() => setFocusedScope(0)}
				/>
				<SurfaceScopeCard
					label="けろ"
					scopeId={1}
					surfaceId={keroSurfaceId}
					imageUrl={keroImageUrl}
					focused={focusedScope === 1}
					onFocus={() => setFocusedScope(1)}
				/>
			</div>

			<div className="max-h-28 overflow-auto border-t border-zinc-700 px-4 py-2">
				{notifications.length === 0 ? (
					<p className="text-xs text-zinc-500">通知はありません</p>
				) : (
					<ul className="space-y-2">
						{notifications.map((notification, index) => (
							<li
								key={`${notification.code}-${index}`}
								className="rounded border border-zinc-700 bg-zinc-800/70 p-2 text-xs text-zinc-300"
							>
								<p className="font-medium">{notification.code}</p>
								<p>{notification.message}</p>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}

interface SurfaceScopeCardProps {
	label: string;
	scopeId: number;
	surfaceId: number | null;
	imageUrl: string | null;
	focused: boolean;
	onFocus: () => void;
}

function SurfaceScopeCard({
	label,
	scopeId,
	surfaceId,
	imageUrl,
	focused,
	onFocus,
}: SurfaceScopeCardProps) {
	return (
		<button
			type="button"
			onClick={onFocus}
			className={`flex min-h-0 flex-col overflow-hidden rounded border p-2 text-left transition-colors ${
				focused
					? "border-emerald-500 bg-emerald-500/10"
					: "border-zinc-700 bg-zinc-800/40 hover:border-zinc-500"
			}`}
		>
			<p className="text-xs text-zinc-300">
				{label} / scope {scopeId}
			</p>
			<p className="mb-2 text-xs text-zinc-500">surface: {surfaceId ?? "-"}</p>
			<div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded border border-zinc-700 bg-zinc-900/70">
				{imageUrl ? (
					<img
						src={imageUrl}
						alt={`${label} surface ${surfaceId ?? "unknown"}`}
						className="h-full w-full object-contain"
					/>
				) : (
					<span className="text-xs text-zinc-500">画像なし</span>
				)}
			</div>
		</button>
	);
}

function resolveSurfacePngBuffer(
	shellCatalog: ShellSurfaceCatalog | null,
	surfaceId: number | null,
	fileContents: Map<string, ArrayBuffer>,
): ArrayBuffer | null {
	if (shellCatalog === null || surfaceId === null) {
		return null;
	}
	const asset = shellCatalog.assets.find((entry) => entry.id === surfaceId);
	if (!asset) {
		return null;
	}
	return fileContents.get(asset.pngPath) ?? null;
}

function useObjectUrl(buffer: ArrayBuffer | null): string | null {
	const [url, setUrl] = useState<string | null>(null);
	const currentUrlRef = useRef<string | null>(null);

	useEffect(() => {
		if (buffer === null) {
			return;
		}

		const objectUrl = URL.createObjectURL(new Blob([buffer], { type: "image/png" }));
		const previousUrl = currentUrlRef.current;
		if (previousUrl) {
			URL.revokeObjectURL(previousUrl);
		}
		currentUrlRef.current = objectUrl;
		setUrl(objectUrl);
	}, [buffer]);

	useEffect(() => {
		return () => {
			const currentUrl = currentUrlRef.current;
			if (currentUrl) {
				URL.revokeObjectURL(currentUrl);
			}
			currentUrlRef.current = null;
		};
	}, []);

	return url;
}
