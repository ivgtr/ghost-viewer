import { ConversationPreview } from "@/components/conversation-preview/ConversationPreview";
import { useCatalogStore } from "@/stores/catalog-store";
import { useFileContentStore } from "@/stores/file-content-store";
import { useFileTreeStore } from "@/stores/file-tree-store";
import { useGhostStore } from "@/stores/ghost-store";
import { useParseStore } from "@/stores/parse-store";
import type { GhostMeta, ParseResult, SakuraScriptToken } from "@/types";
import { cleanup, render, screen } from "@testing-library/react";
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
});
