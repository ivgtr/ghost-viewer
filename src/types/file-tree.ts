export type FileKind = "dictionary" | "text" | "image" | "dll" | "other";

export interface DirectoryNode {
	id: string;
	name: string;
	path: string;
	kind: "directory";
	children: FileTreeNode[];
}

export interface FileNode {
	id: string;
	name: string;
	path: string;
	kind: "file";
	fileKind: FileKind;
	size: number;
}

export type FileTreeNode = DirectoryNode | FileNode;
