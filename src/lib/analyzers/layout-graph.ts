import type { Edge, Node } from "@xyflow/react";
import dagre from "dagre";

interface LayoutOptions {
	direction?: "TB" | "LR";
	nodeWidth?: number;
	nodeHeight?: number;
}

const DEFAULT_NODE_WIDTH = 200;
const DEFAULT_NODE_HEIGHT = 80;

export function layoutGraph<T extends Record<string, unknown>>(
	nodes: Node<T>[],
	edges: Edge[],
	options?: LayoutOptions,
): Node<T>[] {
	if (nodes.length === 0) return [];

	const direction = options?.direction ?? "TB";
	const nodeWidth = options?.nodeWidth ?? DEFAULT_NODE_WIDTH;
	const nodeHeight = options?.nodeHeight ?? DEFAULT_NODE_HEIGHT;

	const g = new dagre.graphlib.Graph();
	g.setDefaultEdgeLabel(() => ({}));
	g.setGraph({ rankdir: direction });

	for (const node of nodes) {
		g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
	}

	for (const edge of edges) {
		g.setEdge(edge.source, edge.target);
	}

	dagre.layout(g);

	return nodes.map((node) => {
		const pos = g.node(node.id);
		return {
			...node,
			position: {
				x: pos.x - nodeWidth / 2,
				y: pos.y - nodeHeight / 2,
			},
		};
	});
}
