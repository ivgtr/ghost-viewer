import { Layout } from "@/components/common/Layout";
import { useCatalogStore } from "@/stores/catalog-store";
import { useFileContentStore } from "@/stores/file-content-store";
import { useFileTreeStore } from "@/stores/file-tree-store";
import { useGhostStore } from "@/stores/ghost-store";
import { useParseStore } from "@/stores/parse-store";
import { useSurfaceStore } from "@/stores/surface-store";
import { useViewStore } from "@/stores/view-store";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("Layout", () => {
	beforeEach(() => {
		useCatalogStore.getState().reset();
		useParseStore.getState().reset();
		useFileTreeStore.getState().reset();
		useFileContentStore.getState().reset();
		useGhostStore.getState().reset();
		useSurfaceStore.getState().reset();
		useViewStore.getState().reset();
		Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
			value: vi.fn(),
			writable: true,
			configurable: true,
		});
	});
	afterEach(() => {
		cleanup();
	});

	it("3つのレーンと3つのリサイズハンドルが描画される", () => {
		const { container } = render(<Layout />);

		expect(
			screen.getByRole("button", { name: "NAR/ZIPファイルをドロップまたはクリックして選択" }),
		).toBeInTheDocument();
		expect(screen.getByText("ファイルを選択してください")).toBeInTheDocument();
		expect(screen.getByText("NAR/ZIP ファイルを読み込んでください")).toBeInTheDocument();
		expect(screen.getByText("Ghost Viewer")).toBeInTheDocument();

		const separators = container.querySelectorAll("[data-separator]");
		expect(separators).toHaveLength(3);
	});

	it("selectedFunctionName が空文字でも右ペインに ConversationPreview が表示される", () => {
		useCatalogStore.getState().selectFunction("");
		useViewStore.getState().showConversation();

		render(<Layout />);

		expect(screen.queryByText("ファイルを選択してください")).not.toBeInTheDocument();
		expect(screen.getByText("ダイアログが見つかりません")).toBeInTheDocument();
	});

	it("会話選択中でも activeRightPane が code ならコード表示される", () => {
		useCatalogStore.getState().selectFunction("OnBoot");
		useViewStore.getState().showCode();

		render(<Layout />);

		expect(screen.queryByText("イベントを選択してください")).not.toBeInTheDocument();
		expect(screen.getByText("File Viewer")).toBeInTheDocument();
	});

	it("activeRightPane が conversation なら会話プレビューを表示する", () => {
		useCatalogStore.getState().selectFunction("OnBoot");
		useViewStore.getState().showConversation();

		render(<Layout />);

		expect(screen.getByText("ダイアログが見つかりません")).toBeInTheDocument();
	});

	it("非対応SHIORIの案内がある場合は会話カタログ中央に表示される", () => {
		useGhostStore.setState({ unsupportedShioriNotice: "Kawari は対応予定です" });

		render(<Layout />);

		expect(screen.getByText("Kawari は対応予定です")).toBeInTheDocument();
		expect(screen.queryByText("NAR/ZIP ファイルを読み込んでください")).not.toBeInTheDocument();
	});

	it("ファイルツリーヘッダーにファイル名が表示される", () => {
		useGhostStore.setState({ fileName: "test-ghost.nar" });
		useFileTreeStore
			.getState()
			.setTree([{ id: "ghost", name: "ghost", path: "ghost", kind: "directory", children: [] }]);

		render(<Layout />);

		expect(screen.getByText("test-ghost.nar")).toBeInTheDocument();
	});

	it("画像ファイル選択時にファイルビューア領域に画像が表示される", () => {
		useFileTreeStore.getState().setTree([
			{
				id: "shell/master/surface0.png",
				name: "surface0.png",
				path: "shell/master/surface0.png",
				kind: "file",
				fileKind: "image",
				size: 100,
			},
		]);
		useFileTreeStore.getState().selectNode("shell/master/surface0.png");

		const pngBytes = new Uint8Array(24);
		pngBytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
		pngBytes.set([0x00, 0x00, 0x00, 0x0d], 8);
		pngBytes.set([0x49, 0x48, 0x44, 0x52], 12);
		const view = new DataView(pngBytes.buffer);
		view.setUint32(16, 120);
		view.setUint32(20, 180);
		useFileContentStore
			.getState()
			.setFileContents(new Map([["shell/master/surface0.png", pngBytes.buffer]]));

		useCatalogStore.getState().selectFunction("OnBoot");
		useViewStore.getState().showCode();

		render(<Layout />);

		const img = screen.getByRole("img");
		expect(img).toBeInTheDocument();
	});
});
