import { useFileTreeStore } from "@/stores/file-tree-store";
import type { FileTreeNode } from "@/types";
import { beforeEach, describe, expect, it } from "vitest";

describe("fileTreeStore", () => {
	beforeEach(() => {
		useFileTreeStore.getState().reset();
	});

	it("初期状態が正しい", () => {
		const state = useFileTreeStore.getState();
		expect(state.tree).toEqual([]);
		expect(state.selectedNodeId).toBeNull();
		expect(state.expandedNodeIds.size).toBe(0);
	});

	it("setTree でツリーを設定できる", () => {
		const tree: FileTreeNode[] = [
			{
				id: "1",
				name: "ghost",
				path: "ghost",
				kind: "directory",
				children: [],
			},
		];
		useFileTreeStore.getState().setTree(tree);
		expect(useFileTreeStore.getState().tree).toEqual(tree);
	});

	it("selectNode でノードを選択できる", () => {
		useFileTreeStore.getState().selectNode("node-1");
		expect(useFileTreeStore.getState().selectedNodeId).toBe("node-1");
	});

	it("selectNode(null) で選択を解除できる", () => {
		useFileTreeStore.getState().selectNode("node-1");
		useFileTreeStore.getState().selectNode(null);
		expect(useFileTreeStore.getState().selectedNodeId).toBeNull();
	});

	it("reset で初期状態に戻る", () => {
		useFileTreeStore.getState().setTree([
			{
				id: "1",
				name: "file.txt",
				path: "file.txt",
				kind: "file",
				fileKind: "text",
				size: 100,
			},
		]);
		useFileTreeStore.getState().selectNode("1");
		useFileTreeStore.getState().reset();

		const state = useFileTreeStore.getState();
		expect(state.tree).toEqual([]);
		expect(state.selectedNodeId).toBeNull();
		expect(state.expandedNodeIds.size).toBe(0);
	});

	it("setTree 時にルート直下のディレクトリが自動展開される", () => {
		const tree: FileTreeNode[] = [
			{
				id: "dir-1",
				name: "ghost",
				path: "ghost",
				kind: "directory",
				children: [],
			},
			{
				id: "file-1",
				name: "readme.txt",
				path: "readme.txt",
				kind: "file",
				fileKind: "text",
				size: 50,
			},
			{
				id: "dir-2",
				name: "shell",
				path: "shell",
				kind: "directory",
				children: [],
			},
		];
		useFileTreeStore.getState().setTree(tree);

		const { expandedNodeIds } = useFileTreeStore.getState();
		expect(expandedNodeIds.has("dir-1")).toBe(true);
		expect(expandedNodeIds.has("dir-2")).toBe(true);
		expect(expandedNodeIds.has("file-1")).toBe(false);
	});

	it("toggleNodeExpansion で展開/折りたたみをトグルできる", () => {
		useFileTreeStore.getState().setTree([
			{
				id: "dir-1",
				name: "ghost",
				path: "ghost",
				kind: "directory",
				children: [],
			},
		]);

		expect(useFileTreeStore.getState().expandedNodeIds.has("dir-1")).toBe(true);

		useFileTreeStore.getState().toggleNodeExpansion("dir-1");
		expect(useFileTreeStore.getState().expandedNodeIds.has("dir-1")).toBe(false);

		useFileTreeStore.getState().toggleNodeExpansion("dir-1");
		expect(useFileTreeStore.getState().expandedNodeIds.has("dir-1")).toBe(true);
	});

	it("reset で expandedNodeIds もクリアされる", () => {
		useFileTreeStore.getState().setTree([
			{
				id: "dir-1",
				name: "ghost",
				path: "ghost",
				kind: "directory",
				children: [],
			},
		]);
		expect(useFileTreeStore.getState().expandedNodeIds.size).toBe(1);

		useFileTreeStore.getState().reset();
		expect(useFileTreeStore.getState().expandedNodeIds.size).toBe(0);
	});
});
