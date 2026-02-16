import { buildBranchGraph } from "@/lib/analyzers/build-branch-graph";
import type { DicFunction, SakuraScriptToken } from "@/types";
import { describe, expect, it } from "vitest";

function token(tokenType: SakuraScriptToken["tokenType"], value: string): SakuraScriptToken {
	return { tokenType, raw: value, value, offset: 0 };
}

function makeFn(
	name: string,
	tokens: SakuraScriptToken[] = [],
	filePath = "test.dic",
): DicFunction {
	return {
		name,
		filePath,
		startLine: 1,
		endLine: 10,
		dialogues: tokens.length > 0 ? [{ tokens, startLine: 1, endLine: 10, rawText: "" }] : [],
	};
}

describe("buildBranchGraph", () => {
	it("空配列を渡すと空のノード・エッジを返す", () => {
		const { nodes, edges } = buildBranchGraph([]);
		expect(nodes).toEqual([]);
		expect(edges).toEqual([]);
	});

	it("ダイアログなしの関数からノードを生成する", () => {
		const { nodes, edges } = buildBranchGraph([makeFn("OnBoot")]);
		expect(nodes).toHaveLength(1);
		expect(nodes[0].id).toBe("OnBoot");
		expect(nodes[0].data.label).toBe("OnBoot");
		expect(nodes[0].data.preview).toBe("");
		expect(edges).toEqual([]);
	});

	it("テキストトークンからプレビューテキストを生成する", () => {
		const tokens = [token("text", "Hello"), token("text", " World")];
		const { nodes } = buildBranchGraph([makeFn("OnBoot", tokens)]);
		expect(nodes[0].data.preview).toBe("Hello World");
	});

	it("50文字を超えるプレビューを切り捨てる", () => {
		const longText = "a".repeat(60);
		const tokens = [token("text", longText)];
		const { nodes } = buildBranchGraph([makeFn("OnBoot", tokens)]);
		expect(nodes[0].data.preview).toBe(`${"a".repeat(50)}...`);
	});

	it("choice トークンからエッジを生成する", () => {
		const fnA = makeFn("FnA", [token("choice", "Yes,FnB")]);
		const fnB = makeFn("FnB");
		const { edges } = buildBranchGraph([fnA, fnB]);
		expect(edges).toHaveLength(1);
		expect(edges[0].source).toBe("FnA");
		expect(edges[0].target).toBe("FnB");
		expect(edges[0].type).toBe("branchEdge");
		expect(edges[0].data?.edgeType).toBe("choice");
		expect(edges[0].data?.label).toBe("Yes");
	});

	it("raise トークンからエッジを生成する", () => {
		const fnA = makeFn("FnA", [token("raise", "OnEvent,param1")]);
		const fnB = makeFn("OnEvent");
		const { edges } = buildBranchGraph([fnA, fnB]);
		expect(edges).toHaveLength(1);
		expect(edges[0].source).toBe("FnA");
		expect(edges[0].target).toBe("OnEvent");
		expect(edges[0].type).toBe("branchEdge");
		expect(edges[0].data?.edgeType).toBe("raise");
		expect(edges[0].data?.label).toBe("OnEvent");
	});

	it("ターゲットが存在しない場合エッジをスキップする", () => {
		const fnA = makeFn("FnA", [token("choice", "Yes,NonExistent")]);
		const { edges } = buildBranchGraph([fnA]);
		expect(edges).toEqual([]);
	});

	it("空の value の場合エッジをスキップする", () => {
		const fnA = makeFn("FnA", [token("choice", "")]);
		const { edges } = buildBranchGraph([fnA]);
		expect(edges).toEqual([]);
	});

	it("3要素以上の choice value を処理する", () => {
		const fnA = makeFn("FnA", [token("choice", "Yes,FnB,extra")]);
		const fnB = makeFn("FnB");
		const { edges } = buildBranchGraph([fnA, fnB]);
		expect(edges).toHaveLength(1);
		expect(edges[0].data?.label).toBe("Yes");
		expect(edges[0].target).toBe("FnB");
	});

	it("同名関数のダイアログを結合する", () => {
		const fn1 = makeFn("OnBoot", [token("text", "Hello")], "file1.dic");
		const fn2 = makeFn("OnBoot", [token("text", "World")], "file2.dic");
		const { nodes } = buildBranchGraph([fn1, fn2]);
		expect(nodes).toHaveLength(1);
		expect(nodes[0].data.preview).toBe("Hello");
	});

	it("同一ソース・ターゲット・タイプの重複エッジに異なるIDを付与する", () => {
		const fnA = makeFn("FnA", [token("choice", "Yes,FnB"), token("choice", "No,FnB")]);
		const fnB = makeFn("FnB");
		const { edges } = buildBranchGraph([fnA, fnB]);
		expect(edges).toHaveLength(2);
		expect(edges[0].id).toBe("FnA-choice-FnB-0");
		expect(edges[1].id).toBe("FnA-choice-FnB-1");
	});

	it("ノードの type は branchNode である", () => {
		const { nodes } = buildBranchGraph([makeFn("OnBoot")]);
		expect(nodes[0].type).toBe("branchNode");
	});

	it("ノードの初期位置は { x: 0, y: 0 } である", () => {
		const { nodes } = buildBranchGraph([makeFn("OnBoot")]);
		expect(nodes[0].position).toEqual({ x: 0, y: 0 });
	});
});
