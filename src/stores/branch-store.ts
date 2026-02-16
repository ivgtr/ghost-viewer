import { buildBranchGraph } from "@/lib/analyzers/build-branch-graph";
import { filterReachableGraph } from "@/lib/analyzers/filter-reachable-graph";
import { layoutGraph } from "@/lib/analyzers/layout-graph";
import type { BranchEdgeData, BranchNodeData, DicFunction } from "@/types";
import type { Edge, Node } from "@xyflow/react";
import { createStore } from "./create-store";

const LAYOUT_OPTIONS = { nodeWidth: 280, nodeHeight: 140 };

interface BranchState {
	nodes: Node<BranchNodeData>[];
	edges: Edge<BranchEdgeData>[];
	allNodes: Node<BranchNodeData>[];
	allEdges: Edge<BranchEdgeData>[];
	startNodeId: string | null;
	rootNodeIds: string[];
	selectedNodeId: string | null;
	buildGraph: (functions: DicFunction[]) => void;
	setStartNode: (nodeId: string | null) => void;
	selectNode: (nodeId: string | null) => void;
	reset: () => void;
}

export const useBranchStore = createStore<BranchState>(
	{
		nodes: [],
		edges: [],
		allNodes: [],
		allEdges: [],
		startNodeId: null,
		rootNodeIds: [],
		selectedNodeId: null,
	},
	(set, get) => ({
		buildGraph: (functions) => {
			const { nodes, edges } = buildBranchGraph(functions);
			const layoutNodes = layoutGraph(nodes, edges, LAYOUT_OPTIONS);

			const targetIds = new Set(edges.map((e) => e.target));
			const rootNodeIds = nodes.filter((n) => !targetIds.has(n.id)).map((n) => n.id);

			set({
				nodes: layoutNodes,
				edges,
				allNodes: layoutNodes,
				allEdges: edges,
				startNodeId: null,
				rootNodeIds,
			});
		},
		setStartNode: (nodeId) => {
			const { allNodes, allEdges } = get();
			if (nodeId === null) {
				set({ startNodeId: null, nodes: allNodes, edges: allEdges });
			} else {
				const { nodes, edges } = filterReachableGraph(nodeId, allNodes, allEdges);
				set({
					startNodeId: nodeId,
					nodes: layoutGraph(nodes, edges, LAYOUT_OPTIONS),
					edges,
				});
			}
		},
		selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
	}),
);
