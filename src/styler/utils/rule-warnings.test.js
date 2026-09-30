import { describe, expect, it } from "vitest";

import { getStylerRuleWarnings } from "./rule-warnings";

describe("getStylerRuleWarnings", () => {
	it("warns for duplicate rule names", () => {
		const warnings = getStylerRuleWarnings({
			ruleName: "color",
			cssNameCounts: new Map([["color", 2]]),
		});

		expect(warnings.duplicateWarning).toBe("This rule appears more than once.");
	});

	it("warns for block spacing conflicts only on active conflict props", () => {
		expect(
			getStylerRuleWarnings({
				ruleName: "gap",
				blockSpacingEnabled: true,
			}).blockSpacingConflictWarning
		).toBe("This rule may conflict with Block Spacing.");

		expect(
			getStylerRuleWarnings({
				ruleName: "margin",
				blockSpacingEnabled: true,
			}).blockSpacingConflictWarning
		).toBe("");
	});

	it("warns when required dependency values are missing", () => {
		const warnings = getStylerRuleWarnings({
			ruleName: "justify-content",
			requires: [{ prop: "display", values: ["flex", "grid"] }],
			cssValuesByProp: new Map([["display", ["block"]]]),
		});

		expect(warnings.dependencyWarning).toBe("Requires display: flex | grid");
	});
});
