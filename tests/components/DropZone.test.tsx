import { DropZone } from "@/components/file-tree/DropZone";
import { useGhostStore } from "@/stores/ghost-store";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

describe("DropZone", () => {
	beforeEach(() => {
		useGhostStore.getState().reset();
	});

	afterEach(() => {
		cleanup();
	});

	it("DropZone が描画される", () => {
		render(<DropZone />);
		expect(
			screen.getByRole("button", { name: "NARファイルをドロップまたはクリックして選択" }),
		).toBeInTheDocument();
	});

	it("有効なファイルドロップで fileName が更新される", () => {
		render(<DropZone />);
		const dropZone = screen.getByRole("button", {
			name: "NARファイルをドロップまたはクリックして選択",
		});

		const file = new File(["content"], "ghost.nar", {
			type: "application/octet-stream",
		});

		fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

		expect(useGhostStore.getState().fileName).toBe("ghost.nar");
	});

	it("無効なファイルでエラーが表示される", () => {
		render(<DropZone />);
		const dropZone = screen.getByRole("button", {
			name: "NARファイルをドロップまたはクリックして選択",
		});

		const file = new File(["content"], "ghost.zip", {
			type: "application/zip",
		});

		fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

		expect(screen.getByRole("alert")).toBeInTheDocument();
		expect(useGhostStore.getState().error).toBeTruthy();
	});

	it("エラー表示時に aria-describedby が設定される", () => {
		useGhostStore.setState({ error: "テストエラー" });
		render(<DropZone />);

		const dropZone = screen.getByRole("button", {
			name: "NARファイルをドロップまたはクリックして選択",
		});
		expect(dropZone).toHaveAttribute("aria-describedby", "dropzone-error");
		expect(screen.getByRole("alert")).toHaveTextContent("テストエラー");
	});

	it("ファイル選択後に fileName が表示される", () => {
		useGhostStore.setState({ fileName: "test.nar", error: null });
		render(<DropZone />);
		expect(screen.getByText("test.nar")).toBeInTheDocument();
	});

	it("ファイル入力が .nar のみ受け付ける", () => {
		render(<DropZone />);
		const input = document.querySelector("input[type='file']");
		expect(input).toBeInTheDocument();
		expect(input).toHaveAttribute("accept", ".nar");
	});
});
