import { describe, expect, it } from "vitest";

import {
	getCoreFontSizePresetMatch,
	normalizePresetSlug,
	toCoreFontSizePresetVar,
	toCorePresetValueByType,
	toCoreSpacingPresetVar,
	toSpacingPresetToken,
} from "./core-preset-values.js";

const spacingSizes = [
	{ slug: "40", size: "1rem", name: "M" },
	{ slug: "50", size: "2rem", name: "L" },
];

describe("toCoreSpacingPresetVar", () => {
	it("normalizes numeric-alpha spacing slugs when creating preset tokens", () => {
		expect(toSpacingPresetToken("4xl")).toBe("var:preset|spacing|4-xl");
	});

	it("keeps plain custom spacing values even when they match a preset fallback", () => {
		expect(toCoreSpacingPresetVar("1rem", spacingSizes)).toBe("1rem");
	});

	it("resolves explicit spacing preset tokens to the shared preset var contract", () => {
		expect(toCoreSpacingPresetVar("var:preset|spacing|40", spacingSizes)).toBe(
			"var(--wp--preset--spacing--40, 1rem)"
		);
	});

	it("normalizes numeric-alpha spacing slugs to WordPress preset var format", () => {
		expect(
			toCoreSpacingPresetVar("var:preset|spacing|2xl", [{ slug: "2xl", size: "2rem" }])
		).toBe("var(--wp--preset--spacing--2-xl, 2rem)");
	});
});

describe("toCorePresetValueByType", () => {
	it("only resolves explicit preset values inside spacing-multiple payloads", () => {
		expect(
			toCorePresetValueByType({
				value: "1rem var:preset|spacing|50",
				type: "spacing-multiple",
				spacingSizes,
			})
		).toBe("1rem var(--wp--preset--spacing--50, 2rem)");
	});

	it("keeps non-spacing domains matching by raw value", () => {
		expect(
			toCoreFontSizePresetVar("16px", [{ slug: "small", size: "16px", name: "Small" }])
		).toBe("var(--wp--preset--font-size--small, 16px)");
	});

	it("normalizes numeric-alpha font-size slugs to shared preset var format", () => {
		expect(normalizePresetSlug("5xl")).toBe("5-xl");
		expect(
			toCoreFontSizePresetVar("var:preset|font-size|5xl", [
				{ slug: "5xl", size: "3.75rem", name: "5XL" },
			])
		).toBe("var(--wp--preset--font-size--5-xl, 3.75rem)");
	});

	it("matches font-size presets only from explicit preset values", () => {
		const fontSizes = [{ slug: "small", size: "16px", name: "Small" }];
		expect(
			getCoreFontSizePresetMatch("var(--wp--preset--font-size--small, 16px)", fontSizes)
		).toMatchObject({
			slug: "small",
			size: "16px",
		});
		expect(getCoreFontSizePresetMatch("16px", fontSizes)).toBe(null);
	});
});
