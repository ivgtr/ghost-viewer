import { parseYayaDic } from "@/lib/parsers/yaya";
import { describe, expect, it } from "vitest";

describe("YAYA Parser - Edge Cases", () => {
	it("should parse elseif with _in_ operator", () => {
		const code = `OnTest
{
	if reference[0] == "test" {
		"first"
	}
	elseif "[新]" _in_ reference[0] {
		"second"
	}
	else {
		"third"
	}
}`;
		const result = parseYayaDic(code, "test.dic");
		expect(result.length).toBe(1);
		expect(result[0].name).toBe("OnTest");
	});

	it("should parse simple function with tuple", () => {
		const code = `OnTest
{
	_array = (value, IARRAY)
	"hello"
}`;
		const result = parseYayaDic(code, "test.dic");
		expect(result.length).toBe(1);
		expect(result[0].dialogues.length).toBe(1);
	});

	it("should parse array append operator ,=", () => {
		const code = `OnTest
{
	_array = IARRAY
	_array ,= "item1"
	_array ,= "item2"
	"done"
}`;
		const result = parseYayaDic(code, "test.dic");
		expect(result.length).toBe(1);
	});

	it("should parse := style assignment operators", () => {
		const code = `OnTest
{
	_value := 1
	_value +:= 2
	_value -:= 1
}`;
		const result = parseYayaDic(code, "test.dic");
		expect(result.length).toBe(1);
	});

	it("should parse !_in_ operator", () => {
		const code = `OnTest
{
	if "x" !_in_ reference[0] {
		"ng"
	}
}`;
		const result = parseYayaDic(code, "test.dic");
		expect(result.length).toBe(1);
	});

	it("should parse for statement without parentheses", () => {
		const code = `OnTest
{
	for _i = 0 ; _i < 10 ; _i++ {
		"loop"
	}
}`;
		const result = parseYayaDic(code, "test.dic");
		expect(result.length).toBe(1);
	});

	it("should parse semicolon separated statements", () => {
		const code = `OnTest
{
	_a = 1; _b = 2;
	;
	"ok"
}`;
		const result = parseYayaDic(code, "test.dic");
		expect(result.length).toBe(1);
		expect(result[0].dialogues.length).toBe(1);
	});

	it("should parse for statement with single separator body", () => {
		const code = `OnTest
{
	for _i = 0 ; _i < 2 ; _i++ --
}`;
		const result = parseYayaDic(code, "test.dic");
		expect(result.length).toBe(1);
	});

	it("should parse foreach statement with semicolon style", () => {
		const code = `OnTest
{
	foreach reference ; _ref {
		_ref
	}
}`;
		const result = parseYayaDic(code, "test.dic");
		expect(result.length).toBe(1);
	});

	it("should parse case statement with when clause", () => {
		const code = `OnTest
{
	case reference[5] {
		when "up" {
			"ok"
		}
	}
}`;
		const result = parseYayaDic(code, "test.dic");
		expect(result.length).toBe(1);
	});

	it("should parse standalone when with multiple conditions", () => {
		const code = `OnTest
{
	when "A","B" {
		"ok"
	}
}`;
		const result = parseYayaDic(code, "test.dic");
		expect(result.length).toBe(1);
	});

	it("should parse switch with implicit case list", () => {
		const code = `OnTest
{
	switch GETTIME[3] {
		"Sun"
		"Mon"
	}
}`;
		const result = parseYayaDic(code, "test.dic");
		expect(result.length).toBe(1);
	});

	it("should parse switch-case-when-others chain", () => {
		const code = `OnTest
{
	switch GETTIME[3] {
		case "Mon" {
			when "Mon","Tue" {
				"a"
			}
		}
		others {
			"b"
		}
	}
}`;
		const result = parseYayaDic(code, "test.dic");
		expect(result.length).toBe(1);
	});

	it("should parse single-quote heredoc", () => {
		const code = `OnTest
{
	<<'
hello
'>>
}`;
		const result = parseYayaDic(code, "test.dic");
		expect(result.length).toBe(1);
		expect(result[0].dialogues.length).toBe(1);
	});

	it("should parse double-quote heredoc", () => {
		const code = `OnTest
{
	<<"
hello
">>
}`;
		const result = parseYayaDic(code, "test.dic");
		expect(result.length).toBe(1);
		expect(result[0].dialogues.length).toBe(1);
	});
});
