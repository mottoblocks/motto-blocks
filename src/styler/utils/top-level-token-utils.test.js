import { describe, expect, it } from "vitest";
import { expandFourValueShorthand, stripTrailingImportant } from "./top-level-token-utils";

describe("stripTrailingImportant", () => {
	it("strips a trailing !important, tolerating internal whitespace and case", () => {
		expect(stripTrailingImportant("10px 20px !important")).toBe("10px 20px");
		expect(stripTrailingImportant("16px!important")).toBe("16px");
		expect(stripTrailingImportant("16px ! important")).toBe("16px");
		expect(stripTrailingImportant("16px !IMPORTANT")).toBe("16px");
	});

	it("leaves values without !important untouched", () => {
		expect(stripTrailingImportant("10px 20px")).toBe("10px 20px");
		expect(stripTrailingImportant("")).toBe("");
	});

	it("handles non-string input safely", () => {
		expect(stripTrailingImportant(undefined)).toBe("");
		expect(stripTrailingImportant(null)).toBe("");
	});
});

describe("expandFourValueShorthand", () => {
	it("expands the CSS box-shorthand 1/2/3/4-value rule", () => {
		expect(expandFourValueShorthand(["a"])).toEqual(["a", "a", "a", "a"]);
		expect(expandFourValueShorthand(["a", "b"])).toEqual(["a", "b", "a", "b"]);
		expect(expandFourValueShorthand(["a", "b", "c"])).toEqual(["a", "b", "c", "b"]);
		expect(expandFourValueShorthand(["a", "b", "c", "d"])).toEqual(["a", "b", "c", "d"]);
	});

	it("treats an empty list like a single empty value", () => {
		expect(expandFourValueShorthand([])).toEqual(["", "", "", ""]);
	});
});
