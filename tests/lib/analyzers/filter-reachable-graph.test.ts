import { filterReachableGraph } from "@/lib/analyzers/filter-reachable-graph";
import type { Edge, Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";

function makeNode(id: string): Node {
	return { id, position: { x: 0, y: 0 }, data: {} };
}

function makeEdge(source: string, target: string): Edge {
	return { id: `${source}-${target}`, source, target };
}

describe("filterReachableGraph", () => {
	it("空グラフでは空を返す", () => {
		const result = filterReachableGraph("A", [], []);
		expect(result.nodes).toEqual([]);
		expect(result.edges).toEqual([]);
	});

	it("存在しない起点では空を返す", () => {
		const nodes = [makeNode("A")];
		const result = filterReachableGraph("X", nodes, []);
		expect(result.nodes).toEqual([]);
		expect(result.edges).toEqual([]);
	});

	it("単一ノード（エッジなし）ではそのノードのみ返す", () => {
		const nodes = [makeNode("A")];
		const result = filterReachableGraph("A", nodes, []);
		expect(result.nodes).toHaveLength(1);
		expect(result.nodes[0].id).toBe("A");
		expect(result.edges).toEqual([]);
	});

	it("線形パス A→B→C、起点 A で全ノードを返す", () => {
		const nodes = [makeNode("A"), makeNode("B"), makeNode("C")];
		const edges = [makeEdge("A", "B"), makeEdge("B", "C")];
		const result = filterReachableGraph("A", nodes, edges);
		expect(result.nodes).toHaveLength(3);
		expect(result.edges).toHaveLength(2);
	});

	it("線形パス A→B→C、起点 B で B, C のみ返す", () => {
		const nodes = [makeNode("A"), makeNode("B"), makeNode("C")];
		const edges = [makeEdge("A", "B"), makeEdge("B", "C")];
		const result = filterReachableGraph("B", nodes, edges);
		expect(result.nodes).toHaveLength(2);
		expect(result.nodes.map((n) => n.id).sort()).toEqual(["B", "C"]);
		expect(result.edges).toHaveLength(1);
		expect(result.edges[0].id).toBe("B-C");
	});

	it("分岐グラフで到達可能なサブグラフのみ返す", () => {
		const nodes = [makeNode("A"), makeNode("B"), makeNode("C"), makeNode("D")];
		const edges = [makeEdge("A", "B"), makeEdge("A", "C"), makeEdge("D", "A")];
		const result = filterReachableGraph("A", nodes, edges);
		expect(result.nodes.map((n) => n.id).sort()).toEqual(["A", "B", "C"]);
		expect(result.edges).toHaveLength(2);
	});

	it("循環グラフ A→B→A で無限ループしない", () => {
		const nodes = [makeNode("A"), makeNode("B")];
		const edges = [makeEdge("A", "B"), makeEdge("B", "A")];
		const result = filterReachableGraph("A", nodes, edges);
		expect(result.nodes).toHaveLength(2);
		expect(result.edges).toHaveLength(2);
	});

	it("孤立ノードはフィルタで除外される", () => {
		const nodes = [makeNode("A"), makeNode("B"), makeNode("C")];
		const edges = [makeEdge("A", "B")];
		const result = filterReachableGraph("A", nodes, edges);
		expect(result.nodes.map((n) => n.id).sort()).toEqual(["A", "B"]);
		expect(result.edges).toHaveLength(1);
	});
});
