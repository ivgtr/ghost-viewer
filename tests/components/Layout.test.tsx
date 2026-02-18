import { Layout } from "@/components/common/Layout";
import { useCatalogStore } from "@/stores/catalog-store";
import { useFileTreeStore } from "@/stores/file-tree-store";
import { useParseStore } from "@/stores/parse-store";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("Layout", () => {
	beforeEach(() => {
		useCatalogStore.getState().reset();
		useParseStore.getState().reset();
		useFileTreeStore.getState().reset();
	});
	afterEach(() => {
		cleanup();
	});

	it("3つのパネルと2つのリサイズハンドルが描画される", () => {
		const { container } = render(<Layout />);

		expect(
			screen.getByRole("button", { name: "NAR/ZIPファイルをドロップまたはクリックして選択" }),
		).toBeInTheDocument();
		expect(screen.getByText("ファイルを選択してください")).toBeInTheDocument();
		expect(screen.getByText("NAR/ZIP ファイルを読み込んでください")).toBeInTheDocument();

		const separators = container.querySelectorAll("[data-separator]");
		expect(separators).toHaveLength(2);
	});

	it("selectedFunctionName が空文字でも右ペインに ConversationPreview が表示される", () => {
		useCatalogStore.getState().selectFunction("");

		render(<Layout />);

		expect(screen.queryByText("ファイルを選択してください")).not.toBeInTheDocument();
		expect(screen.getByText("ダイアログが見つかりません")).toBeInTheDocument();
	});
});
