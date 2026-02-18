import { FileTree } from "@/components/file-tree/FileTree";
import { useFileTreeStore } from "@/stores/file-tree-store";
import { useViewStore } from "@/stores/view-store";
import type { FileTreeNode } from "@/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sampleTree: FileTreeNode[] = [
	{
		id: "dir-ghost",
		name: "ghost",
		path: "ghost",
		kind: "directory",
		children: [
			{
				id: "file-dic",
				name: "ai.dic",
				path: "ghost/ai.dic",
				kind: "file",
				fileKind: "dictionary",
				size: 1000,
			},
			{
				id: "dir-nested",
				name: "sub",
				path: "ghost/sub",
				kind: "directory",
				children: [
					{
						id: "file-nested",
						name: "deep.txt",
						path: "ghost/sub/deep.txt",
						kind: "file",
						fileKind: "text",
						size: 50,
					},
				],
			},
		],
	},
	{
		id: "file-readme",
		name: "readme.txt",
		path: "readme.txt",
		kind: "file",
		fileKind: "text",
		size: 200,
	},
];

describe("FileTree", () => {
	const scrollIntoViewMock = vi.fn();

	beforeEach(() => {
		useFileTreeStore.getState().reset();
		useViewStore.getState().reset();
		scrollIntoViewMock.mockReset();
		Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
			value: scrollIntoViewMock,
			configurable: true,
		});
	});

	afterEach(() => {
		cleanup();
	});

	it("空ツリー時にメッセージを表示する", () => {
		render(<FileTree />);
		expect(screen.getByText("ファイルがありません")).toBeInTheDocument();
	});

	it("ディレクトリとファイルをレンダリングする", () => {
		useFileTreeStore.getState().setTree(sampleTree);
		render(<FileTree />);

		expect(screen.getByText("ghost")).toBeInTheDocument();
		expect(screen.getByText("ai.dic")).toBeInTheDocument();
		expect(screen.getByText("readme.txt")).toBeInTheDocument();
	});

	it("ディレクトリクリックで折りたたみ/展開をトグルする", () => {
		useFileTreeStore.getState().setTree(sampleTree);
		render(<FileTree />);

		expect(screen.getByText("ai.dic")).toBeInTheDocument();

		fireEvent.click(screen.getByText("ghost"));
		expect(screen.queryByText("ai.dic")).not.toBeInTheDocument();

		fireEvent.click(screen.getByText("ghost"));
		expect(screen.getByText("ai.dic")).toBeInTheDocument();
	});

	it("ファイルクリックで選択状態が更新される", () => {
		useFileTreeStore.getState().setTree(sampleTree);
		render(<FileTree />);

		fireEvent.click(screen.getByText("readme.txt"));
		expect(useFileTreeStore.getState().selectedNodeId).toBe("file-readme");
	});

	it("ツリーに role=tree が設定される", () => {
		useFileTreeStore.getState().setTree(sampleTree);
		render(<FileTree />);
		expect(screen.getByRole("tree")).toBeInTheDocument();
	});

	it("ディレクトリノードに aria-expanded が設定される", () => {
		useFileTreeStore.getState().setTree(sampleTree);
		render(<FileTree />);

		const ghostItem = screen.getByRole("treeitem", { name: /ghost/ });
		expect(ghostItem).toHaveAttribute("aria-expanded", "true");

		fireEvent.click(screen.getByText("ghost"));
		expect(ghostItem).toHaveAttribute("aria-expanded", "false");
	});

	it("選択ノードへ自動スクロールする", () => {
		useFileTreeStore.getState().setTree(sampleTree);
		render(<FileTree />);

		fireEvent.click(screen.getByText("readme.txt"));

		expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
	});
});
