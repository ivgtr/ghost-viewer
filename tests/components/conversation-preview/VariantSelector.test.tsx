import { VariantSelector } from "@/components/conversation-preview/VariantSelector";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
	cleanup();
});

describe("VariantSelector", () => {
	it("count が 1 以下なら何も表示しない", () => {
		render(<VariantSelector count={1} selected={0} onChange={() => undefined} />);
		expect(screen.queryByLabelText("バリアントを選択")).not.toBeInTheDocument();
	});

	it("統一UIを表示する", () => {
		render(<VariantSelector count={5} selected={1} onChange={() => undefined} />);

		expect(screen.getByLabelText("前のバリアント")).toBeInTheDocument();
		expect(screen.getByLabelText("バリアントを選択")).toBeInTheDocument();
		expect(screen.getByLabelText("次のバリアント")).toBeInTheDocument();
		expect(screen.getByText("2 / 5")).toBeInTheDocument();
		expect(screen.getByRole("option", { name: "#1" })).toBeInTheDocument();
		expect(screen.getByRole("option", { name: "#5" })).toBeInTheDocument();
	});

	it("先頭では前へ、末尾では次へが無効になる", () => {
		const { rerender } = render(
			<VariantSelector count={5} selected={0} onChange={() => undefined} />,
		);
		expect(screen.getByLabelText("前のバリアント")).toBeDisabled();
		expect(screen.getByLabelText("次のバリアント")).toBeEnabled();

		rerender(<VariantSelector count={5} selected={4} onChange={() => undefined} />);
		expect(screen.getByLabelText("前のバリアント")).toBeEnabled();
		expect(screen.getByLabelText("次のバリアント")).toBeDisabled();
	});

	it("前後ボタン押下で正しい index を通知する", () => {
		const onChange = vi.fn();
		render(<VariantSelector count={5} selected={2} onChange={onChange} />);

		fireEvent.click(screen.getByLabelText("前のバリアント"));
		fireEvent.click(screen.getByLabelText("次のバリアント"));

		expect(onChange).toHaveBeenNthCalledWith(1, 1);
		expect(onChange).toHaveBeenNthCalledWith(2, 3);
	});

	it("セレクト変更で index を通知する", () => {
		const onChange = vi.fn();
		render(<VariantSelector count={5} selected={1} onChange={onChange} />);

		fireEvent.change(screen.getByLabelText("バリアントを選択"), { target: { value: "4" } });

		expect(onChange).toHaveBeenCalledWith(4);
	});
});
