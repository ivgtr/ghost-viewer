import { Layout } from "@/components/common/Layout";
import { useCatalogStore } from "@/stores/catalog-store";
import { useFileTreeStore } from "@/stores/file-tree-store";
import { useGhostStore } from "@/stores/ghost-store";
import { useParseStore } from "@/stores/parse-store";
import { useSurfaceStore } from "@/stores/surface-store";
import { useViewStore } from "@/stores/view-store";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Layout", () => {
	beforeEach(() => {
		useCatalogStore.getState().reset();
		useParseStore.getState().reset();
		useFileTreeStore.getState().reset();
		useGhostStore.getState().reset();
		useSurfaceStore.getState().reset();
		useViewStore.getState().reset();
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
		expect(screen.getByText("ゴーストビューアー")).toBeInTheDocument();

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
		expect(screen.getByText("コードビュー")).toBeInTheDocument();
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
});
