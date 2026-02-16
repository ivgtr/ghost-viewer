import { Layout } from "@/components/common/Layout";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("Layout", () => {
	it("3つのパネルと2つのリサイズハンドルが描画される", () => {
		const { container } = render(<Layout />);

		expect(
			screen.getByRole("button", { name: "NARファイルをドロップまたはクリックして選択" }),
		).toBeInTheDocument();
		expect(screen.getByText("ファイルを選択してください")).toBeInTheDocument();
		expect(screen.getByText("No branch data")).toBeInTheDocument();

		const separators = container.querySelectorAll("[data-separator]");
		expect(separators).toHaveLength(2);
	});
});
