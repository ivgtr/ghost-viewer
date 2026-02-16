import type { Edge, Node } from "@xyflow/react";

export function filterReachableGraph<N extends Node, E extends Edge>(
	startNodeId: string,
	nodes: N[],
	edges: E[],
): { nodes: N[]; edges: E[] } {
	const nodeIds = new Set(nodes.map((n) => n.id));
	if (!nodeIds.has(startNodeId)) {
		return { nodes: [], edges: [] };
	}

	const adjacency = new Map<string, string[]>();
	for (const edge of edges) {
		const targets = adjacency.get(edge.source);
		if (targets) {
			targets.push(edge.target);
		} else {
			adjacency.set(edge.source, [edge.target]);
		}
	}

	const visited = new Set<string>();
	const queue = [startNodeId];
	visited.add(startNodeId);

	while (queue.length > 0) {
		const current = queue.shift();
		if (current === undefined) break;
		const neighbors = adjacency.get(current);
		if (!neighbors) continue;
		for (const neighbor of neighbors) {
			if (!visited.has(neighbor)) {
				visited.add(neighbor);
				queue.push(neighbor);
			}
		}
	}

	return {
		nodes: nodes.filter((n) => visited.has(n.id)),
		edges: edges.filter((e) => visited.has(e.source) && visited.has(e.target)),
	};
}
