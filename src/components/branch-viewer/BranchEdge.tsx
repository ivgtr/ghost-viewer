import type { BranchEdgeData } from "@/types";
import {
	BaseEdge,
	type Edge,
	EdgeLabelRenderer,
	type EdgeProps,
	getBezierPath,
} from "@xyflow/react";

const EDGE_COLORS: Record<string, string> = {
	choice: "#f97316",
	raise: "#a855f7",
};

export function BranchEdge({
	sourceX,
	sourceY,
	targetX,
	targetY,
	sourcePosition,
	targetPosition,
	data,
	markerEnd,
}: EdgeProps<Edge<BranchEdgeData>>) {
	const [edgePath, labelX, labelY] = getBezierPath({
		sourceX,
		sourceY,
		targetX,
		targetY,
		sourcePosition,
		targetPosition,
	});

	const color = EDGE_COLORS[data?.edgeType ?? ""] ?? "#71717a";

	return (
		<>
			<BaseEdge path={edgePath} markerEnd={markerEnd} style={{ stroke: color, strokeWidth: 2 }} />
			{data?.label && (
				<EdgeLabelRenderer>
					<div
						className="nodrag nopan pointer-events-none absolute rounded bg-zinc-800 px-1.5 py-0.5 text-xs"
						style={{
							transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
							color,
						}}
					>
						{data.label}
					</div>
				</EdgeLabelRenderer>
			)}
		</>
	);
}
