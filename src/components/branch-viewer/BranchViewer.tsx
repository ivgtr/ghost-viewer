import { BranchEdge } from "@/components/branch-viewer/BranchEdge";
import { BranchNode } from "@/components/branch-viewer/BranchNode";
import { useBranchStore } from "@/stores/branch-store";
import { useFileTreeStore } from "@/stores/file-tree-store";
import { useParseStore } from "@/stores/parse-store";
import { Background, Controls, MiniMap, ReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { NodeMouseHandler } from "@xyflow/react";
import { useCallback, useEffect } from "react";
import type { ChangeEvent } from "react";

const nodeTypes = { branchNode: BranchNode };
const edgeTypes = { branchEdge: BranchEdge };

export function BranchViewer() {
	const parseResult = useParseStore((s) => s.parseResult);
	const isParsing = useParseStore((s) => s.isParsing);
	const parseError = useParseStore((s) => s.parseError);
	const parsedFileCount = useParseStore((s) => s.parsedFileCount);
	const totalFileCount = useParseStore((s) => s.totalFileCount);
	const nodes = useBranchStore((s) => s.nodes);
	const edges = useBranchStore((s) => s.edges);
	const rootNodeIds = useBranchStore((s) => s.rootNodeIds);
	const startNodeId = useBranchStore((s) => s.startNodeId);
	const buildGraph = useBranchStore((s) => s.buildGraph);
	const setStartNode = useBranchStore((s) => s.setStartNode);
	const selectNode = useBranchStore((s) => s.selectNode);

	const handleNodeClick: NodeMouseHandler = useCallback(
		(_event, node) => {
			useFileTreeStore.getState().selectNode(null);
			selectNode(node.id);
		},
		[selectNode],
	);

	useEffect(() => {
		if (parseResult?.functions.length) {
			buildGraph(parseResult.functions);
		}
	}, [parseResult, buildGraph]);

	if (isParsing) {
		return (
			<div className="flex h-full items-center justify-center text-zinc-400">
				解析中... {parsedFileCount} / {totalFileCount} ファイル
			</div>
		);
	}

	if (parseError) {
		return <div className="flex h-full items-center justify-center text-red-400">{parseError}</div>;
	}

	if (!parseResult || nodes.length === 0) {
		return (
			<div className="flex h-full items-center justify-center text-zinc-500">No branch data</div>
		);
	}

	const handleStartNodeChange = (e: ChangeEvent<HTMLSelectElement>) => {
		setStartNode(e.target.value || null);
	};

	return (
		<div className="flex h-full w-full flex-col">
			{rootNodeIds.length > 0 && (
				<div className="flex items-center gap-2 border-b border-zinc-700 px-3 py-2">
					<select
						className="rounded border border-zinc-600 bg-zinc-800 px-2 py-1 text-sm text-zinc-200"
						value={startNodeId ?? ""}
						onChange={handleStartNodeChange}
					>
						<option value="">すべて表示</option>
						{rootNodeIds.map((id) => (
							<option key={id} value={id}>
								{id}
							</option>
						))}
					</select>
				</div>
			)}
			<div className="min-h-0 flex-1">
				<ReactFlow
					nodes={nodes}
					edges={edges}
					nodeTypes={nodeTypes}
					edgeTypes={edgeTypes}
					onNodeClick={handleNodeClick}
					fitView
					nodesDraggable={false}
				>
					<Background />
					<Controls />
					<MiniMap />
				</ReactFlow>
			</div>
		</div>
	);
}
