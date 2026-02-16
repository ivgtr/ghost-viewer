export interface BranchNodeData {
	[key: string]: unknown;
	label: string;
	preview: string;
	surfaceIds: number[];
	characters: number[];
	filePath: string;
	startLine: number;
}

export type BranchEdgeType = "choice" | "raise";

export interface BranchEdgeData {
	[key: string]: unknown;
	edgeType: BranchEdgeType;
	label: string;
}
