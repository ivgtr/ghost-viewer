import { useBranchStore } from "@/stores/branch-store";
import { useParseStore } from "@/stores/parse-store";
import { Background, Controls, MiniMap, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useEffect } from "react";

export function BranchViewer() {
	const parseResult = useParseStore((s) => s.parseResult);
	const nodes = useBranchStore((s) => s.nodes);
	const edges = useBranchStore((s) => s.edges);
	const buildGraph = useBranchStore((s) => s.buildGraph);

	useEffect(() => {
		if (parseResult?.functions.length) {
			buildGraph(parseResult.functions);
		}
	}, [parseResult, buildGraph]);

	if (!parseResult || nodes.length === 0) {
		return (
			<div className="flex h-full items-center justify-center text-zinc-500">No branch data</div>
		);
	}

	return (
		<div className="h-full w-full">
			<ReactFlow nodes={nodes} edges={edges} fitView nodesDraggable={false}>
				<Background />
				<Controls />
				<MiniMap />
			</ReactFlow>
		</div>
	);
}
