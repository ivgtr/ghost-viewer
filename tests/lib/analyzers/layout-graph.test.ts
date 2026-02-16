import { layoutGraph } from "@/lib/analyzers/layout-graph";
import type { Edge, Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";

function makeNode(id: string): Node<Record<string, unknown>> {
	return { id, position: { x: 0, y: 0 }, data: {} };
}

function makeEdge(source: string, target: string): Edge {
	return { id: `${source}-${target}`, source, target };
}

describe("layoutGraph", () => {
	it("空配列を渡すと空配列を返す", () => {
		const result = layoutGraph([], []);
		expect(result).toEqual([]);
	});

	it("ノードに位置を計算する", () => {
		const nodes = [makeNode("a"), makeNode("b")];
		const edges = [makeEdge("a", "b")];
		const result = layoutGraph(nodes, edges);

		expect(result).toHaveLength(2);
		for (const node of result) {
			expect(typeof node.position.x).toBe("number");
			expect(typeof node.position.y).toBe("number");
		}
	});

	it("TB方向では親ノードが子ノードより上に配置される", () => {
		const nodes = [makeNode("parent"), makeNode("child")];
		const edges = [makeEdge("parent", "child")];
		const result = layoutGraph(nodes, edges, { direction: "TB" });

		const parentNode = result.find((n) => n.id === "parent") as Node<Record<string, unknown>>;
		const childNode = result.find((n) => n.id === "child") as Node<Record<string, unknown>>;
		expect(parentNode.position.y).toBeLessThan(childNode.position.y);
	});

	it("入力ノードを変更しない（immutability）", () => {
		const nodes = [makeNode("a"), makeNode("b")];
		const edges = [makeEdge("a", "b")];
		const originalPositions = nodes.map((n) => ({ ...n.position }));

		layoutGraph(nodes, edges);

		for (let i = 0; i < nodes.length; i++) {
			expect(nodes[i].position).toEqual(originalPositions[i]);
		}
	});
});
