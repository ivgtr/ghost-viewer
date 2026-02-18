import { ConversationPreview } from "@/components/conversation-preview/ConversationPreview";
import { useCatalogStore } from "@/stores/catalog-store";
import { useFileContentStore } from "@/stores/file-content-store";
import { useFileTreeStore } from "@/stores/file-tree-store";
import { useGhostStore } from "@/stores/ghost-store";
import { useParseStore } from "@/stores/parse-store";
import { useViewStore } from "@/stores/view-store";
import type { GhostMeta, ParseResult, SakuraScriptToken } from "@/types";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

function makeToken(
	tokenType: SakuraScriptToken["tokenType"],
	raw: string,
	value: string,
): SakuraScriptToken {
	return {
		tokenType,
		raw,
		value,
		offset: 0,
	};
}

describe("ConversationPreview", () => {
	beforeEach(() => {
		cleanup();
		useCatalogStore.getState().reset();
		useFileContentStore.getState().reset();
		useFileTreeStore.getState().reset();
		useGhostStore.getState().reset();
		useParseStore.getState().reset();
		useViewStore.getState().reset();
	});

	it("空イベント名選択時もプレビューを表示し、無名ラベルを表示する", () => {
		const parseResult: ParseResult = {
			shioriType: "satori",
			functions: [
				{
					name: "",
					condition: null,
					filePath: "ghost/master/dic08_RandomTalk.txt",
					startLine: 10,
					endLine: 13,
					dialogues: [
						{
							tokens: [makeToken("charSwitch", "\\0", "0"), makeToken("text", "hello", "hello")],
							startLine: 11,
							endLine: 11,
							rawText: "\\0hello",
						},
					],
				},
			],
			meta: null,
			diagnostics: [],
		};

		useParseStore.getState().succeedParse(parseResult);
		useCatalogStore.getState().selectFunction("");

		render(<ConversationPreview />);

		expect(screen.queryByText("ファイルを選択してください")).not.toBeInTheDocument();
		expect(screen.getByText("（無名イベント）")).toBeInTheDocument();
		expect(screen.getByText("hello")).toBeInTheDocument();
	});

	it("charSwitch を含むSatori会話で sakura/kero 名が表示される", () => {
		const parseResult: ParseResult = {
			shioriType: "satori",
			functions: [
				{
					name: "OnBoot",
					condition: "（Ｒ０）>0",
					filePath: "ghost/master/dic01_Base.txt",
					startLine: 1,
					endLine: 4,
					dialogues: [
						{
							tokens: [
								makeToken("charSwitch", "\\0", "0"),
								makeToken("text", "こんにちは", "こんにちは"),
								makeToken("charSwitch", "\\1", "1"),
								makeToken("text", "やあ", "やあ"),
							],
							startLine: 2,
							endLine: 3,
							rawText: "こんにちは\nやあ",
						},
					],
				},
			],
			meta: null,
			diagnostics: [],
		};
		const meta: GhostMeta = {
			name: "test",
			author: "author",
			characterNames: {
				0: "ポスト",
				1: "狛犬",
			},
			properties: {},
		};

		useParseStore.getState().succeedParse(parseResult);
		useGhostStore.getState().setMeta(meta);
		useCatalogStore.getState().selectFunction("OnBoot");

		render(<ConversationPreview />);

		expect(screen.getByText("ポスト")).toBeInTheDocument();
		expect(screen.getByText("狛犬")).toBeInTheDocument();
		expect(screen.getByText("こんにちは")).toBeInTheDocument();
		expect(screen.getByText("やあ")).toBeInTheDocument();
		expect(screen.getByText("条件: （Ｒ０）>0")).toBeInTheDocument();
	});

	it("条件式が無い場合は条件表示を出さない", () => {
		const parseResult: ParseResult = {
			shioriType: "satori",
			functions: [
				{
					name: "OnBoot",
					condition: null,
					filePath: "ghost/master/dic01_Base.txt",
					startLine: 1,
					endLine: 2,
					dialogues: [
						{
							tokens: [makeToken("charSwitch", "\\0", "0"), makeToken("text", "hello", "hello")],
							startLine: 1,
							endLine: 1,
							rawText: "hello",
						},
					],
				},
			],
			meta: null,
			diagnostics: [],
		};

		useParseStore.getState().succeedParse(parseResult);
		useCatalogStore.getState().selectFunction("OnBoot");
		render(<ConversationPreview />);

		expect(screen.queryByText(/^条件:/)).not.toBeInTheDocument();
	});

	it("ソースコードジャンプで会話選択を維持しつつコード表示へ切り替える", () => {
		const parseResult: ParseResult = {
			shioriType: "satori",
			functions: [
				{
					name: "OnBoot",
					condition: null,
					filePath: "ghost/master/dic01_Base.txt",
					startLine: 0,
					endLine: 4,
					dialogues: [
						{
							tokens: [makeToken("charSwitch", "\\0", "0"), makeToken("text", "hello", "hello")],
							startLine: 1,
							endLine: 3,
							rawText: "hello",
						},
					],
				},
			],
			meta: null,
			diagnostics: [],
		};

		useParseStore.getState().succeedParse(parseResult);
		useCatalogStore.getState().selectFunction("OnBoot");

		render(<ConversationPreview />);
		fireEvent.click(screen.getByTitle("ソースコードにジャンプ"));

		expect(useCatalogStore.getState().selectedFunctionName).toBe("OnBoot");
		expect(useViewStore.getState().activeRightPane).toBe("code");
		expect(useViewStore.getState().jumpContext).toEqual({
			functionName: "OnBoot",
			variantIndex: 0,
			filePath: "ghost/master/dic01_Base.txt",
			startLine: 1,
			endLine: 3,
		});
		expect(useFileTreeStore.getState().selectedNodeId).toBe("ghost/master/dic01_Base.txt");
		expect(useFileContentStore.getState().highlightRange).toEqual({ startLine: 1, endLine: 3 });
	});

	it("複数バリアント時に統一UIを表示し、切り替えで会話内容が変わる", () => {
		const parseResult: ParseResult = {
			shioriType: "satori",
			functions: [
				{
					name: "OnBoot",
					condition: null,
					filePath: "ghost/master/dic01_Base.txt",
					startLine: 1,
					endLine: 6,
					dialogues: [
						{
							tokens: [makeToken("charSwitch", "\\0", "0"), makeToken("text", "first", "first")],
							startLine: 2,
							endLine: 2,
							rawText: "first",
						},
						{
							tokens: [makeToken("charSwitch", "\\0", "0"), makeToken("text", "second", "second")],
							startLine: 4,
							endLine: 4,
							rawText: "second",
						},
					],
				},
			],
			meta: null,
			diagnostics: [],
		};

		useParseStore.getState().succeedParse(parseResult);
		useCatalogStore.getState().selectFunction("OnBoot");

		render(<ConversationPreview />);

		expect(screen.getByLabelText("前のバリアント")).toBeInTheDocument();
		expect(screen.getByLabelText("バリアントを選択")).toBeInTheDocument();
		expect(screen.getByLabelText("次のバリアント")).toBeInTheDocument();
		expect(screen.getByText("1 / 2")).toBeInTheDocument();
		expect(screen.getByText("first")).toBeInTheDocument();

		fireEvent.click(screen.getByLabelText("次のバリアント"));

		expect(screen.getByText("2 / 2")).toBeInTheDocument();
		expect(screen.getByText("second")).toBeInTheDocument();
		expect(useViewStore.getState().variantIndexByFunction.get("OnBoot")).toBe(1);
	});
});
