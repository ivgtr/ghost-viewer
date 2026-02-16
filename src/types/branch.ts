export interface BranchNodeData {
	label: string;
	preview: string;
	surfaceIds: number[];
	characters: number[];
	filePath: string;
	startLine: number;
}

export type BranchEdgeType = "choice" | "raise";

export interface BranchEdgeData {
	edgeType: BranchEdgeType;
	label: string;
}
