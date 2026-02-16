import { buildBranchGraph } from "@/lib/analyzers/build-branch-graph";
import { layoutGraph } from "@/lib/analyzers/layout-graph";
import type { BranchEdgeData, BranchNodeData, DicFunction } from "@/types";
import type { Edge, Node } from "@xyflow/react";
import { createStore } from "./create-store";

interface BranchState {
	nodes: Node<BranchNodeData>[];
	edges: Edge<BranchEdgeData>[];
	selectedNodeId: string | null;
	buildGraph: (functions: DicFunction[]) => void;
	selectNode: (nodeId: string | null) => void;
	reset: () => void;
}

export const useBranchStore = createStore<BranchState>(
	{ nodes: [], edges: [], selectedNodeId: null },
	(set) => ({
		buildGraph: (functions) => {
			const { nodes, edges } = buildBranchGraph(functions);
			set({ nodes: layoutGraph(nodes, edges, { nodeWidth: 280, nodeHeight: 140 }), edges });
		},
		selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
	}),
);
