import type { BranchEdgeData, BranchEdgeType, BranchNodeData, DicFunction } from "@/types";
import type { Edge, Node } from "@xyflow/react";

const PREVIEW_MAX_LENGTH = 50;

export function buildBranchGraph(functions: DicFunction[]): {
	nodes: Node<BranchNodeData>[];
	edges: Edge<BranchEdgeData>[];
} {
	const seen = new Set<string>();
	const deduped: DicFunction[] = [];
	for (const fn of functions) {
		if (!seen.has(fn.name)) {
			seen.add(fn.name);
			deduped.push(fn);
		}
	}

	const functionNames = new Set(deduped.map((fn) => fn.name));

	const nodes: Node<BranchNodeData>[] = deduped.map((fn) => ({
		id: fn.name,
		type: "branchNode",
		position: { x: 0, y: 0 },
		data: {
			label: fn.name,
			preview: buildPreview(fn),
			surfaceIds: extractSurfaceIds(fn),
			characters: extractCharacters(fn),
			filePath: fn.filePath,
			startLine: fn.startLine,
		},
	}));

	const edges = buildEdges(deduped, functionNames);

	return { nodes, edges };
}

function buildPreview(fn: DicFunction): string {
	const texts: string[] = [];
	for (const dialogue of fn.dialogues) {
		for (const token of dialogue.tokens) {
			if (token.tokenType === "text") {
				texts.push(token.value);
			}
		}
	}
	const joined = texts.join("");
	return joined.length > PREVIEW_MAX_LENGTH ? `${joined.slice(0, PREVIEW_MAX_LENGTH)}...` : joined;
}

function extractSurfaceIds(fn: DicFunction): number[] {
	const ids = new Set<number>();
	for (const dialogue of fn.dialogues) {
		for (const token of dialogue.tokens) {
			if (token.tokenType === "surface") {
				const id = Number(token.value);
				if (!Number.isNaN(id)) {
					ids.add(id);
				}
			}
		}
	}
	return [...ids];
}

function extractCharacters(fn: DicFunction): number[] {
	const chars = new Set<number>();
	for (const dialogue of fn.dialogues) {
		for (const token of dialogue.tokens) {
			if (token.tokenType === "charSwitch") {
				const id = Number(token.value);
				if (!Number.isNaN(id)) {
					chars.add(id);
				}
			}
		}
	}
	return [...chars];
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
		data: { edgeType, label },
	});
}
