import type { BranchEdgeData, BranchEdgeType, BranchNodeData, DicFunction } from "@/types";
import type { Edge, Node } from "@xyflow/react";

const PREVIEW_MAX_LENGTH = 50;

export function buildBranchGraph(functions: DicFunction[]): {
	nodes: Node<BranchNodeData>[];
	edges: Edge<BranchEdgeData>[];
} {
	const merged = new Map<string, DicFunction>();
	for (const fn of functions) {
		const existing = merged.get(fn.name);
		if (existing) {
			existing.dialogues.push(...fn.dialogues);
		} else {
			merged.set(fn.name, { ...fn, dialogues: [...fn.dialogues] });
		}
	}
	const deduped = [...merged.values()];

	const functionNames = new Set(deduped.map((fn) => fn.name));

	const nodes: Node<BranchNodeData>[] = deduped.map((fn) => ({
		id: fn.name,
		type: "branchNode",
		position: { x: 0, y: 0 },
		data: {
			label: fn.name,
			preview: buildPreview(fn),
		},
	}));

	const edges = buildEdges(deduped, functionNames);

	return { nodes, edges };
}

function buildPreview(fn: DicFunction): string {
	const first = fn.dialogues[0];
	if (!first) return "";
	const texts: string[] = [];
	for (const token of first.tokens) {
		if (token.tokenType === "text") texts.push(token.value);
	}
	const joined = texts.join("");
	return joined.length > PREVIEW_MAX_LENGTH ? `${joined.slice(0, PREVIEW_MAX_LENGTH)}...` : joined;
}

function buildEdges(functions: DicFunction[], functionNames: Set<string>): Edge<BranchEdgeData>[] {
	const edges: Edge<BranchEdgeData>[] = [];
	const edgeIds = new Set<string>();

	for (const fn of functions) {
		for (const dialogue of fn.dialogues) {
			for (const token of dialogue.tokens) {
				if (token.tokenType === "choice") {
					addChoiceEdge(fn.name, token.value, functionNames, edges, edgeIds);
				} else if (token.tokenType === "raise") {
					addRaiseEdge(fn.name, token.value, functionNames, edges, edgeIds);
				}
			}
		}
	}

	return edges;
}

function addChoiceEdge(
	sourceId: string,
	value: string,
	functionNames: Set<string>,
	edges: Edge<BranchEdgeData>[],
	edgeIds: Set<string>,
): void {
	const parts = value.split(",");
	const label = parts[0]?.trim();
	const targetId = parts[1]?.trim();

	if (!label || !targetId || !functionNames.has(targetId)) return;

	pushEdge(sourceId, targetId, "choice", label, edges, edgeIds);
}

function addRaiseEdge(
	sourceId: string,
	value: string,
	functionNames: Set<string>,
	edges: Edge<BranchEdgeData>[],
	edgeIds: Set<string>,
): void {
	const parts = value.split(",");
	const eventName = parts[0]?.trim();

	if (!eventName || !functionNames.has(eventName)) return;

	pushEdge(sourceId, eventName, "raise", eventName, edges, edgeIds);
}

function pushEdge(
	sourceId: string,
	targetId: string,
	edgeType: BranchEdgeType,
	label: string,
	edges: Edge<BranchEdgeData>[],
	edgeIds: Set<string>,
): void {
	let index = 0;
	let edgeId = `${sourceId}-${edgeType}-${targetId}-${index}`;
	while (edgeIds.has(edgeId)) {
		index++;
		edgeId = `${sourceId}-${edgeType}-${targetId}-${index}`;
	}
	edgeIds.add(edgeId);

	edges.push({
		id: edgeId,
		source: sourceId,
		target: targetId,
		type: "branchEdge",
		data: { edgeType, label },
	});
}
