import type { JumpContext } from "@/stores/view-store";
import { useViewStore } from "@/stores/view-store";
import { beforeEach, describe, expect, it } from "vitest";

describe("viewStore", () => {
	beforeEach(() => {
		useViewStore.getState().reset();
	});

	it("初期状態が正しい", () => {
		const state = useViewStore.getState();
		expect(state.activeRightPane).toBe("code");
		expect(state.variantIndexByFunction.size).toBe(0);
		expect(state.jumpContext).toBeNull();
	});

	it("showConversation と showCode で右ペイン表示を切り替えられる", () => {
		useViewStore.getState().showConversation();
		expect(useViewStore.getState().activeRightPane).toBe("conversation");

		useViewStore.getState().showCode();
		expect(useViewStore.getState().activeRightPane).toBe("code");
	});

	it("setVariantIndex で関数ごとの選択バリアントを保持できる", () => {
		useViewStore.getState().setVariantIndex("OnBoot", 2);
		useViewStore.getState().setVariantIndex("OnClose", 1);

		const map = useViewStore.getState().variantIndexByFunction;
		expect(map.get("OnBoot")).toBe(2);
		expect(map.get("OnClose")).toBe(1);
	});

	it("setJumpContext でジャンプ文脈を保存・解除できる", () => {
		const context: JumpContext = {
			functionName: "OnBoot",
			variantIndex: 1,
			filePath: "ghost/master/boot.dic",
			startLine: 10,
			endLine: 12,
		};
		useViewStore.getState().setJumpContext(context);
		expect(useViewStore.getState().jumpContext).toEqual(context);

		useViewStore.getState().setJumpContext(null);
		expect(useViewStore.getState().jumpContext).toBeNull();
	});

	it("reset で初期状態に戻る", () => {
		useViewStore.getState().showConversation();
		useViewStore.getState().setVariantIndex("OnBoot", 3);
		useViewStore.getState().setJumpContext({
			functionName: "OnBoot",
			variantIndex: 3,
			filePath: "ghost/master/boot.dic",
			startLine: 5,
			endLine: 7,
		});

		useViewStore.getState().reset();
		const state = useViewStore.getState();
		expect(state.activeRightPane).toBe("code");
		expect(state.variantIndexByFunction.size).toBe(0);
		expect(state.jumpContext).toBeNull();
	});
});
