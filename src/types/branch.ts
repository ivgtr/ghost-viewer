export interface BranchNodeData {
	[key: string]: unknown;
	label: string;
	preview: string;
}

export type BranchEdgeType = "choice" | "raise";

export interface BranchEdgeData {
	[key: string]: unknown;
	edgeType: BranchEdgeType;
	label: string;
}
