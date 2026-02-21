import { ConversationPreview } from "@/components/conversation-preview/ConversationPreview";
import { useCatalogStore } from "@/stores/catalog-store";
import { useFileContentStore } from "@/stores/file-content-store";
import { useFileTreeStore } from "@/stores/file-tree-store";
import { useGhostStore } from "@/stores/ghost-store";
import { useParseStore } from "@/stores/parse-store";
import { useSurfaceStore } from "@/stores/surface-store";
import { useViewStore } from "@/stores/view-store";
import type { GhostMeta, ParseResult, SakuraScriptToken } from "@/types";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
		useSurfaceStore.getState().reset();
		useViewStore.getState().reset();
		initializeSurfaceStore();
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

	it("イベント選択時に各scopeの最初の s[N] で自動同期する", async () => {
		const parseResult: ParseResult = {
			shioriType: "satori",
			functions: [
				{
					name: "OnBoot",
					condition: null,
					filePath: "ghost/master/dic01_Base.txt",
					startLine: 1,
					endLine: 4,
					dialogues: [
						{
							tokens: [
								makeToken("charSwitch", "\\0", "0"),
								makeToken("surface", "\\s[0]", "0"),
								makeToken("surface", "\\s[5]", "5"),
								makeToken("charSwitch", "\\1", "1"),
								makeToken("surface", "\\s[10]", "10"),
							],
							startLine: 2,
							endLine: 3,
							rawText: "\\0\\s[0]\\s[5]\\1\\s[10]",
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

		await waitFor(() => {
			expect(useSurfaceStore.getState().currentSurfaceByScope.get(0)).toBe(0);
			expect(useSurfaceStore.getState().currentSurfaceByScope.get(1)).toBe(10);
		});
	});

	it("\\p[2] 後の \\s[N] クリックで secondaryScopeId が 2 に切り替わりサーフェスが更新される", async () => {
		useSurfaceStore.setState({
			availableSecondaryScopeIds: [1, 2],
		});
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
							tokens: [
								makeToken("charSwitch", "\\0", "0"),
								makeToken("surface", "\\s[0]", "0"),
								makeToken("text", "こんにちは", "こんにちは"),
								makeToken("charSwitch", "\\p[2]", "2"),
								makeToken("surface", "\\s[5]", "5"),
								makeToken("text", "やあ", "やあ"),
							],
							startLine: 2,
							endLine: 5,
							rawText: "\\0\\s[0]こんにちは\\p[2]\\s[5]やあ",
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

		await waitFor(() => {
			expect(useSurfaceStore.getState().currentSurfaceByScope.get(0)).toBe(0);
		});

		fireEvent.click(screen.getByRole("button", { name: "s[5]" }));
		expect(useSurfaceStore.getState().secondaryScopeId).toBe(2);
		expect(useSurfaceStore.getState().currentSurfaceByScope.get(2)).toBe(5);
	});

	it("バリアント切替で自動再同期し、手動クリックで即時切替できる", async () => {
		const parseResult: ParseResult = {
			shioriType: "satori",
			functions: [
				{
					name: "OnBoot",
					condition: null,
					filePath: "ghost/master/dic01_Base.txt",
					startLine: 1,
					endLine: 8,
					dialogues: [
						{
							tokens: [
								makeToken("charSwitch", "\\0", "0"),
								makeToken("surface", "\\s[0]", "0"),
								makeToken("surface", "\\s[20]", "20"),
							],
							startLine: 2,
							endLine: 3,
							rawText: "\\0\\s[0]\\s[20]",
						},
						{
							tokens: [makeToken("charSwitch", "\\0", "0"), makeToken("surface", "\\s[10]", "10")],
							startLine: 5,
							endLine: 5,
							rawText: "\\0\\s[10]",
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

		await waitFor(() => {
			expect(useSurfaceStore.getState().currentSurfaceByScope.get(0)).toBe(0);
		});

		fireEvent.click(screen.getByRole("button", { name: "s[20]" }));
		expect(useSurfaceStore.getState().currentSurfaceByScope.get(0)).toBe(20);

		fireEvent.click(screen.getByLabelText("次のバリアント"));
		await waitFor(() => {
			expect(useSurfaceStore.getState().currentSurfaceByScope.get(0)).toBe(10);
		});
	});
});

function initializeSurfaceStore(): void {
	const fileContents = new Map<string, ArrayBuffer>([
		["shell/master/surface0.png", createPngHeaderBuffer(200, 320)],
		["shell/master/surface5.png", createPngHeaderBuffer(200, 320)],
		["shell/master/surface10.png", createPngHeaderBuffer(180, 240)],
		["shell/master/surface20.png", createPngHeaderBuffer(220, 280)],
	]);
	useFileContentStore.getState().setFileContents(fileContents);

	useSurfaceStore.getState().initialize({
		catalog: [
			{
				shellName: "master",
				assets: [
					{ id: 0, shellName: "master", pngPath: "shell/master/surface0.png", pnaPath: null },
					{ id: 5, shellName: "master", pngPath: "shell/master/surface5.png", pnaPath: null },
					{ id: 10, shellName: "master", pngPath: "shell/master/surface10.png", pnaPath: null },
					{ id: 20, shellName: "master", pngPath: "shell/master/surface20.png", pnaPath: null },
				],
			},
		],
		initialShellName: "master",
		definitionsByShell: new Map([
			[
				"master",
				new Map([
					[0, { id: 0, elements: [], animations: [], regions: [] }],
					[5, { id: 5, elements: [], animations: [], regions: [] }],
					[10, { id: 10, elements: [], animations: [], regions: [] }],
					[20, { id: 20, elements: [], animations: [], regions: [] }],
				]),
			],
		]),
		aliasMapByShell: new Map(),
		diagnostics: [],
		ghostDescriptProperties: {},
		rng: () => 0,
	});
}

function createPngHeaderBuffer(width: number, height: number): ArrayBuffer {
	const bytes = new Uint8Array(24);
	bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
	bytes.set([0x00, 0x00, 0x00, 0x0d], 8);
	bytes.set([0x49, 0x48, 0x44, 0x52], 12);
	const view = new DataView(bytes.buffer);
	view.setUint32(16, width);
	view.setUint32(20, height);
	return bytes.buffer;
}
