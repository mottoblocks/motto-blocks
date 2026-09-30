import { describe, expect, it } from "vitest";

import { resolveNumericUnitOptions, resolveNumericUnitValue } from "./NumericUnitField.utils.js";

describe("resolveNumericUnitOptions", () => {
	it("keeps explicit unitless options so N can be rendered", () => {
		expect(
			resolveNumericUnitOptions([
				{ value: "", label: "N" },
				{ value: "em", label: "em" },
			])
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ value: "", label: "N" }),
				expect.objectContaining({ value: "em", label: "em" }),
			])
		);
	});
});

describe("resolveNumericUnitValue", () => {
	it("preserves a parsed unitless value when the config allows it", () => {
		expect(
			resolveNumericUnitValue({
				hasUnits: true,
				resolvedUnits: [
					{ value: "", label: "N" },
					{ value: "em", label: "em" },
				],
				parsedUnit: "",
				initialUnit: "em",
			})
		).toBe("");
	});

	it("falls back to the configured initial unit when the parsed unit is unsupported", () => {
		expect(
			resolveNumericUnitValue({
				hasUnits: true,
				resolvedUnits: [
					{ value: "", label: "N" },
					{ value: "em", label: "em" },
				],
				parsedUnit: "px",
				initialUnit: "em",
			})
		).toBe("em");
	});
});
