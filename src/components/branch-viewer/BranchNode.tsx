import type { BranchNodeData } from "@/types";
import { Handle, Position } from "@xyflow/react";
import type { Node, NodeProps } from "@xyflow/react";

export function BranchNode({ data, selected }: NodeProps<Node<BranchNodeData>>) {
	return (
		<div
			className={`w-[200px] overflow-hidden rounded border ${
				selected ? "border-blue-400" : "border-zinc-600"
			} bg-zinc-800 shadow-md`}
		>
			<Handle type="target" position={Position.Top} />
			<div className="bg-zinc-700 px-3 py-1.5 text-sm font-medium text-zinc-100 truncate">
				{data.label}
			</div>
			{data.preview && (
				<div className="px-3 py-2">
					<p className="text-xs text-zinc-400 leading-relaxed truncate">{data.preview}</p>
				</div>
			)}
			<Handle type="source" position={Position.Bottom} />
		</div>
	);
}
