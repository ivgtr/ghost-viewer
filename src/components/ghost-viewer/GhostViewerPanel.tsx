import { useSurfaceStore } from "@/stores/surface-store";
import { useMemo } from "react";

export function GhostViewerPanel() {
	const shells = useSurfaceStore((s) => s.shells);
	const selectedShellName = useSurfaceStore((s) => s.selectedShellName);
	const diagnostics = useSurfaceStore((s) => s.diagnostics);
	const selectShell = useSurfaceStore((s) => s.selectShell);

	const selectedShell = useMemo(
		() => shells.find((shell) => shell.shellName === selectedShellName) ?? null,
		[shells, selectedShellName],
	);

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

			{shells.length > 1 ? (
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
						{shells.map((shell) => (
							<option key={shell.shellName} value={shell.shellName}>
								{shell.shellName}
							</option>
						))}
					</select>
				</div>
			) : null}

			<div className="min-h-0 flex-1 overflow-auto p-4">
				{diagnostics.length === 0 ? (
					<p className="text-xs text-zinc-500">診断はありません</p>
				) : (
					<ul className="space-y-2">
						{diagnostics.map((diagnostic, index) => (
							<li
								key={`${diagnostic.code}-${index}`}
								className="rounded border border-zinc-700 bg-zinc-800/60 p-2 text-xs text-zinc-300"
							>
								<p className="font-medium">{diagnostic.code}</p>
								<p>{diagnostic.message}</p>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
