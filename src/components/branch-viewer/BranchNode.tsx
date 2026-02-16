import type { BranchNodeData } from "@/types";
import { Handle, Position } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";

function CharacterBadge({ id }: { id: number }) {
	const bg = id === 0 ? "bg-blue-500" : id === 1 ? "bg-green-500" : "bg-zinc-500";
	const label = `\\${id}`;
	return (
		<span className={`${bg} inline-block rounded px-1.5 py-0.5 text-xs text-white`}>{label}</span>
	);
}

function SurfaceBadge({ id }: { id: number }) {
	return (
		<span className="inline-block rounded bg-zinc-600 px-1.5 py-0.5 text-xs text-zinc-200">
			s[{id}]
		</span>
	);
}

export function BranchNode({ data, selected }: NodeProps<Node<BranchNodeData>>) {
	return (
		<div
			className={`w-[280px] overflow-hidden rounded border ${
				selected ? "border-blue-400" : "border-zinc-600"
			} bg-zinc-800 shadow-md`}
		>
			<Handle type="target" position={Position.Top} />

			<div className="bg-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-100 truncate">
				{data.label}
			</div>

			{(data.characters.length > 0 || data.preview) && (
				<div className="px-3 py-2 space-y-1">
					{data.characters.length > 0 && (
						<div className="flex gap-1">
							{data.characters.map((id) => (
								<CharacterBadge key={id} id={id} />
							))}
						</div>
					)}
					{data.preview && (
						<p className="text-xs text-zinc-400 leading-relaxed truncate">{data.preview}</p>
					)}
				</div>
			)}

			{data.surfaceIds.length > 0 && (
				<div className="flex gap-1 flex-wrap border-t border-zinc-700 px-3 py-1.5">
					{data.surfaceIds.map((id) => (
						<SurfaceBadge key={id} id={id} />
					))}
				</div>
			)}

			<Handle type="source" position={Position.Bottom} />
		</div>
	);
}
