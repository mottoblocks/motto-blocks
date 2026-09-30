import { describe, expect, it } from "vitest";

import { getDefaultCssRules } from "./styler-css-property-registry";
import { stylerCssValueOptions } from "./styler-css-value-options";

describe("styler css property contracts", () => {
	it("includes object-position in the curated suggestions list", () => {
		expect(getDefaultCssRules()).toContain("object-position");
	});

	it("includes transition in the curated suggestions list", () => {
		expect(getDefaultCssRules()).toContain("transition");
	});

	it("includes logical spacing properties used by the spacing controls in suggestions", () => {
		expect(getDefaultCssRules()).toEqual(
			expect.arrayContaining([
				"margin-inline",
				"margin-block",
				"padding-inline",
				"padding-block",
				"margin-inline-start",
				"margin-inline-end",
				"padding-inline-start",
				"padding-inline-end",
			])
		);
	});

	it("provides value options for object-position", () => {
		expect(stylerCssValueOptions["object-position"]).toMatchObject({
			type: "enum",
		});
		expect(stylerCssValueOptions["object-position"]?.options).toHaveLength(9);
	});
});
