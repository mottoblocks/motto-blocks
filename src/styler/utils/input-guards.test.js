import { describe, expect, it } from "vitest";

import { hasMixedCssWideKeywordValue, isValidCssRuleName } from "./input-guards";

describe("isValidCssRuleName", () => {
	it("accepts standard CSS properties even when they are not in the reduced suggestion list", () => {
		expect(isValidCssRuleName("word-break")).toBe(true);
	});

	it("accepts CSS custom properties", () => {
		expect(isValidCssRuleName("--motto-local-var")).toBe(true);
	});

	it("rejects invalid CSS property syntax", () => {
		expect(isValidCssRuleName("123bad-prop")).toBe(false);
		expect(isValidCssRuleName("bad prop")).toBe(false);
	});

	it("accepts valid MDN properties even when they are not in the reduced suggestions list", () => {
		expect(isValidCssRuleName("word-break")).toBe(true);
		expect(isValidCssRuleName("padding-inline")).toBe(true);
	});

	it("rejects unknown standard properties even if they match the syntax", () => {
		expect(isValidCssRuleName("word-breax")).toBe(false);
	});
});

describe("hasMixedCssWideKeywordValue", () => {
	it("flags CSS-wide keywords mixed with other top-level tokens", () => {
		expect(hasMixedCssWideKeywordValue("35px inherit")).toBe(true);
		expect(hasMixedCssWideKeywordValue("1em unset 2em")).toBe(true);
	});

	it("does not flag a CSS-wide keyword used as the whole value", () => {
		expect(hasMixedCssWideKeywordValue("inherit")).toBe(false);
	});

	it("does not flag CSS-wide keywords inside function arguments", () => {
		expect(hasMixedCssWideKeywordValue("var(--space, inherit)")).toBe(false);
	});
});
