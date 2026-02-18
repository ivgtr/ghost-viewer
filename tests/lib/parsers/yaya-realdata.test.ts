import { readFileSync } from "node:fs";
import { parseYayaDic } from "@/lib/parsers/yaya";
import { describe, expect, it } from "vitest";

describe("YAYA Parser - Real Data", () => {
	const realDataSample = `OnFirstBoot
{
	if SHIORI3FW.Status != 'Run' {
		username = "ユーザーさん"
	}
	mikireflag = 0
	"\\t\\u\\s[10]\\h\\s[5]はじめまして！\\e"
}

OnBoot
{
	if reference[6] == "halt" {
		OnBoot_Halt
	}
	else {
		_date = STRFORM("$02d$02d",GETTIME[1],GETTIME[2])
		_script = ""
	}
	_script
}

OnClose
{
	"さようなら"
}`;

	it("should parse OnFirstBoot with nested if statement", () => {
		const result = parseYayaDic(realDataSample, "test.dic");
		expect(result.length).toBeGreaterThan(0);

		const onFirstBoot = result.find((fn) => fn.name === "OnFirstBoot");
		expect(onFirstBoot).toBeDefined();
		expect(onFirstBoot?.dialogues.length).toBeGreaterThan(0);
	});

	it("should parse OnBoot with if-else statement", () => {
		const result = parseYayaDic(realDataSample, "test.dic");

		const onBoot = result.find((fn) => fn.name === "OnBoot");
		expect(onBoot).toBeDefined();
	});

	it("should parse OnClose", () => {
		const result = parseYayaDic(realDataSample, "test.dic");

		const onClose = result.find((fn) => fn.name === "OnClose");
		expect(onClose).toBeDefined();
		expect(onClose?.dialogues.length).toBe(1);
	});

	it("should parse Style B function definition (function name on separate line from {)", () => {
		const result = parseYayaDic(realDataSample, "test.dic");

		// All three functions use Style B
		expect(result.some((fn) => fn.name === "OnFirstBoot")).toBe(true);
		expect(result.some((fn) => fn.name === "OnBoot")).toBe(true);
		expect(result.some((fn) => fn.name === "OnClose")).toBe(true);
	});

	it("should handle BOM prefixed content", () => {
		const bomContent = `\uFEFF${realDataSample}`;
		const result = parseYayaDic(bomContent, "test.dic");

		expect(result.length).toBeGreaterThan(0);
		expect(result.find((fn) => fn.name === "OnFirstBoot")).toBeDefined();
	});

	describe("browser error regression snippets", () => {
		it("should parse semicolon and colon snippets", () => {
			const code = `OnTest
{
	_a = 1; _b = 2;
	_flag := 1
	_type : config
}`;
			const result = parseYayaDic(code, "ghost/master/aya_etc.dic");
			expect(result.length).toBe(1);
		});

		it("should parse comma index and assign snippets", () => {
			const code = `OnTest
{
	_v = reference[0,1]
	_v = GETTIME[3]
}`;
			const result = parseYayaDic(code, "ghost/master/aya_menu.dic");
			expect(result.length).toBe(1);
		});
	});

	describe("emily4 specific regressions", () => {
		it("OnChoiceSelect_INTRODUCE_NAZO heredoc should keep sakura-script escapes", () => {
			const code = `OnChoiceSelect_INTRODUCE_NAZO
{
	<<"
	\\u\\s[-1]\\0\\s[4]ふー、ゴミ出し終わりっと…\\w5…\\w5\\w9\\nなんでこんなにゴミが出るかなぁ。\\w9\\s[3]\\nちょっと我慢しないとなぁ。\\w9\\e
	==========
	\\u\\s[10]\\0\\s[0]…\\w5…\\w5と言うわけで、変な子がいたんだよ。\\w9\\w9\\e
	">>
}`;
			const result = parseYayaDic(code, "ghost/master/aya_menu.dic");
			const target = result.find((fn) => fn.name === "OnChoiceSelect_INTRODUCE_NAZO");

			expect(target).toBeDefined();
			const dialogues = target?.dialogues ?? [];
			expect(dialogues.length).toBe(2);

			expect(dialogues[0]?.rawText.startsWith("\\u\\s[-1]\\0\\s[4]")).toBe(true);
			expect(dialogues[0]?.rawText.startsWith("us[-1]0s[4]")).toBe(false);
			expect(dialogues[0]?.tokens.some((t) => t.tokenType === "charSwitch")).toBe(true);
			expect(dialogues[0]?.tokens.some((t) => t.tokenType === "surface")).toBe(true);
			expect(dialogues[0]?.rawText.includes("==========")).toBe(false);
			expect(dialogues[1]?.rawText.includes("==========")).toBe(false);
			expect((dialogues[0]?.startLine ?? 0) < (dialogues[1]?.startLine ?? 0)).toBe(true);
		});

		it("OnCommunicate_Hand should parse :eval=: as non-visible directive", () => {
			const code = `OnCommunicate_Hand
{
	if '動作検証' _in_ reference[1] {
		"\\u\\s[10]\\h\\s[7]動作検証は間に合ってますっ！\\w9\\w9\\p2\\s[203]え～、\\w5俺もやだよ。:eval=:StartCommunicate(reference[0])"
	}
}`;
			const result = parseYayaDic(code, "ghost/master/aya_communicate_normal.dic");
			const target = result.find((fn) => fn.name === "OnCommunicate_Hand");

			expect(target).toBeDefined();
			expect(target?.dialogues.length).toBeGreaterThan(0);

			const dialogue = target?.dialogues[0];
			const visibleText = dialogue?.tokens
				.filter((token) => token.tokenType === "text")
				.map((token) => token.value)
				.join("");

			expect(visibleText?.includes(":eval=:")).toBe(false);
			expect(dialogue?.tokens.some((token) => token.tokenType === "directive")).toBe(true);
		});

		it("hyphen separator line in heredoc should split dialogues", () => {
			const code = `OnMouseStyle
{
	<<"
	\\0lineA\\e
	------------
	\\1lineB\\e
	">>
}`;
			const result = parseYayaDic(code, "ghost/master/aya_mouse.dic");
			const target = result.find((fn) => fn.name === "OnMouseStyle");
			const dialogues = target?.dialogues ?? [];

			expect(dialogues.length).toBe(2);
			expect(dialogues[0]?.rawText.includes("\\0lineA")).toBe(true);
			expect(dialogues[1]?.rawText.includes("\\1lineB")).toBe(true);
			expect(dialogues.some((dialogue) => dialogue.rawText.includes("------------"))).toBe(false);
		});
	});

	describe("emily4.nar aya_bootend.dic", () => {
		it("should parse actual emily4 dictionary file", async () => {
			// Read the pre-extracted file
			const dicPath = ".tmp/aya_bootend.dic";
			let content: string;

			try {
				content = readFileSync(dicPath, "utf-8");
			} catch {
				// Skip if file doesn't exist
				return;
			}

			// Remove BOM if present
			const cleanContent = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;

			// Test parsing in chunks to find the problematic area
			const lines = cleanContent.split("\n");
			const testChunks = [
				{ start: 0, end: 100 },
				{ start: 0, end: 200 },
				{ start: 0, end: 300 },
				{ start: 0, end: lines.length },
			];

			for (const chunk of testChunks) {
				const partialContent = lines.slice(chunk.start, chunk.end).join("\n");
				try {
					parseYayaDic(partialContent, "test.dic");
				} catch (e) {
					if (chunk.end === lines.length) {
						throw e;
					}
				}
			}

			const result = parseYayaDic(cleanContent, "ghost/master/aya_bootend.dic");

			// Should find OnFirstBoot
			const onFirstBoot = result.find((fn) => fn.name === "OnFirstBoot");
			expect(onFirstBoot).toBeDefined();
			expect(onFirstBoot?.dialogues.length).toBeGreaterThan(0);

			// Should find OnBoot
			const onBoot = result.find((fn) => fn.name === "OnBoot");
			expect(onBoot).toBeDefined();
		});
	});
});
