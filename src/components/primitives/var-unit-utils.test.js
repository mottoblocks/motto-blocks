import { describe, expect, it } from "vitest";

import {
	extractNonVarUnit,
	extractVarFallback,
	getCompatibleExitVarValue,
} from "./var-unit-utils.js";

describe("extractVarFallback", () => {
	it("keeps nested fallback functions intact", () => {
		expect(extractVarFallback("var(--spacing, clamp(1rem, 2vw, 2rem))")).toBe(
			"clamp(1rem, 2vw, 2rem)"
		);
	});
});

describe("extractNonVarUnit", () => {
	it("extracts units from plain numeric values", () => {
		expect(extractNonVarUnit("12px")).toBe("px");
		expect(extractNonVarUnit(".5rem")).toBe("rem");
	});

	it("ignores var() values and unitless values", () => {
		expect(extractNonVarUnit("var(--token, 1rem)")).toBe("");
		expect(extractNonVarUnit("0")).toBe("");
	});
});

describe("getCompatibleExitVarValue", () => {
	it("restores the last non-var value when its unit matches the selected unit", () => {
		expect(
			getCompatibleExitVarValue({
				selectedUnit: "rem",
				lastNonVarValue: "2rem",
				lastVarValue: "var(--token, 1rem)",
			})
		).toBe("2rem");
	});

	it("falls back to the var() fallback when its unit matches the selected unit", () => {
		expect(
			getCompatibleExitVarValue({
				selectedUnit: "rem",
				lastNonVarValue: "12px",
				lastVarValue: "var(--token, 1rem)",
			})
		).toBe("1rem");
	});

	it("returns an empty value when no candidate matches the selected unit", () => {
		expect(
			getCompatibleExitVarValue({
				selectedUnit: "rem",
				lastNonVarValue: "12px",
				lastVarValue: "var(--token, 1em)",
			})
		).toBe("");
	});
});
