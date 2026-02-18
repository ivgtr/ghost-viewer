import { ChatMessageBubble } from "@/components/conversation-preview/ChatMessageBubble";
import type { ChatMessage } from "@/types/chat-message";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

describe("ChatMessageBubble", () => {
	it("surface セグメントをクリックすると同期コールバックが呼ばれる", () => {
		const onSurfaceClick = vi.fn();
		render(
			<ChatMessageBubble
				message={createMessage({
					segments: [
						{
							type: "surface",
							value: "5",
							surfaceId: 5,
							scopeId: 1,
							syncId: "0:0",
						},
					],
				})}
				characterName="けろ"
				characterNames={{}}
				properties={{}}
				onSurfaceClick={onSurfaceClick}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "s[5]" }));
		expect(onSurfaceClick).toHaveBeenCalledTimes(1);
		expect(onSurfaceClick).toHaveBeenCalledWith(1, 5, "0:0");
	});

	it("surfaceId が null の場合はクリック不可表示になる", () => {
		const onSurfaceClick = vi.fn();
		render(
			<ChatMessageBubble
				message={createMessage({
					segments: [
						{
							type: "surface",
							value: "hoge",
							surfaceId: null,
							scopeId: 0,
							syncId: "0:0",
						},
					],
				})}
				characterName="さくら"
				characterNames={{}}
				properties={{}}
				onSurfaceClick={onSurfaceClick}
			/>,
		);

		expect(screen.queryByRole("button", { name: "s[hoge]" })).toBeNull();
		expect(screen.getByText("s[hoge]")).toBeInTheDocument();
		expect(onSurfaceClick).not.toHaveBeenCalled();
	});
});

function createMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
	return {
		characterId: 0,
		segments: [{ type: "text", value: "hello" }],
		...overrides,
	};
}
