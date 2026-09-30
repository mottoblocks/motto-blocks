import { describe, expect, it } from "vitest";
import {
	getSpacingCustomValueFromPreset,
	getSpacingPresetSlug,
	getSpacingPresetValueFromCustomValue,
	categorizeSpacingValue,
	mergeSpacingPairToCss,
	mergeSpacingPatchToCss,
	parseSpacingPairForControl,
	parseSpacingSidesForControl,
	stringifySpacingPairToCss,
	stringifySpacingSidesToCss,
	toSpacingPresetOptionValue,
} from "./spacing-value-utils";

describe("spacing-value-utils", () => {
	it("preserves vertical auto without turning the horizontal axis auto", () => {
		const cssValue = mergeSpacingPatchToCss("", { top: "auto", bottom: "auto" });

		expect(cssValue).toBe("auto 0");
		expect(parseSpacingSidesForControl(cssValue)).toEqual({
			top: "auto",
			right: "0",
			bottom: "auto",
			left: "0",
		});
	});

	it("preserves horizontal auto without turning the vertical axis auto", () => {
		const cssValue = mergeSpacingPatchToCss("", { left: "auto", right: "auto" });

		expect(cssValue).toBe("0 auto");
		expect(parseSpacingSidesForControl(cssValue)).toEqual({
			top: "0",
			right: "auto",
			bottom: "0",
			left: "auto",
		});
	});

	it("uses zero placeholders when only one axis has a value", () => {
		expect(
			stringifySpacingSidesToCss({
				top: "12px",
				right: "",
				bottom: "12px",
				left: "",
			})
		).toBe("12px 0");
	});

	it("normalizes numeric-alpha spacing preset slugs for tokens and var() values", () => {
		expect(getSpacingPresetSlug("var:preset|spacing|2xl")).toBe("2-xl");
		expect(getSpacingPresetSlug("var(--wp--preset--spacing--2xl, 2rem)")).toBe("2-xl");
		expect(toSpacingPresetOptionValue("2xl")).toBe("var:preset|spacing|2-xl");
	});

	it("matches spacing preset size by normalized slug variants", () => {
		expect(
			getSpacingCustomValueFromPreset("var:preset|spacing|2-xl", [
				{ slug: "2xl", size: "2rem" },
			])
		).toBe("2rem");
	});

	it("normalizes slug when mapping custom values back to spacing preset tokens", () => {
		expect(getSpacingPresetValueFromCustomValue("2rem", [{ slug: "4xl", size: "2rem" }])).toBe(
			"var:preset|spacing|4-xl"
		);
	});

	it("classifies CSS keywords as css values for slot-based controls", () => {
		expect(categorizeSpacingValue("inherit")).toEqual({ kind: "css", unit: "css" });
		expect(categorizeSpacingValue("initial")).toEqual({ kind: "css", unit: "css" });
	});

	it("expands a one-value logical shorthand onto both ends", () => {
		expect(parseSpacingPairForControl("16px")).toEqual({ start: "16px", end: "16px" });
		expect(parseSpacingPairForControl("")).toEqual({ start: "", end: "" });
	});

	it("splits a two-value logical shorthand into start/end", () => {
		expect(parseSpacingPairForControl("10px 20px")).toEqual({ start: "10px", end: "20px" });
	});

	it("collapses matching ends and pads a missing end with zero", () => {
		expect(stringifySpacingPairToCss({ start: "8px", end: "8px" })).toBe("8px");
		expect(stringifySpacingPairToCss({ start: "10px", end: "20px" })).toBe("10px 20px");
		expect(stringifySpacingPairToCss({ start: "12px", end: "" })).toBe("12px 0");
		expect(stringifySpacingPairToCss({ start: "", end: "" })).toBe("");
	});

	it("merges a single-end patch into the stored logical shorthand", () => {
		expect(mergeSpacingPairToCss("10px 20px", { end: "8px" })).toBe("10px 8px");
		expect(mergeSpacingPairToCss("10px 20px", { start: "8px", end: "8px" })).toBe("8px");
	});

	it("preserves numeric and CSS keyword axes in two-value shorthands", () => {
		expect(parseSpacingSidesForControl("35px inherit")).toEqual({
			top: "35px",
			right: "inherit",
			bottom: "35px",
			left: "inherit",
		});
		expect(mergeSpacingPatchToCss("35px inherit", { top: "40px", bottom: "40px" })).toBe(
			"40px inherit"
		);
	});

	it("strips a trailing !important before splitting into sides instead of misreading it as a value", () => {
		expect(parseSpacingSidesForControl("10px 20px !important")).toEqual({
			top: "10px",
			right: "20px",
			bottom: "10px",
			left: "20px",
		});
		expect(parseSpacingSidesForControl("10px 20px 5px 0 !important")).toEqual({
			top: "10px",
			right: "20px",
			bottom: "5px",
			left: "0",
		});
		expect(parseSpacingSidesForControl("16px!important")).toEqual({
			top: "16px",
			right: "16px",
			bottom: "16px",
			left: "16px",
		});
		expect(parseSpacingPairForControl("10px 20px !important")).toEqual({
			start: "10px",
			end: "20px",
		});
	});

	it("drops !important once a side is edited through the visual control", () => {
		expect(mergeSpacingPatchToCss("10px 20px !important", { top: "40px" })).toBe(
			"40px 20px 10px"
		);
	});
});
