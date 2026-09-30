import { describe, expect, it } from "vitest";

import { stylerCssValueOptions } from "./styler-css-value-options";

// Resolves a representative property key the same way use-prop-value-config.js's
// getPropConfig does — merging every pattern whose regex matches, in array order —
// rather than comparing `match` strings verbatim, so a var/real-prop pair sharing
// one merged pattern entry (see the __patterns dedupe) doesn't break this test.
const findPatternFor = (key) => {
	const patterns = Array.isArray(stylerCssValueOptions.__patterns)
		? stylerCssValueOptions.__patterns
		: [];
	let resolved = null;
	patterns.forEach((entry) => {
		let regex = null;
		try {
			regex = new RegExp(entry?.match, "i");
		} catch {
			regex = null;
		}
		if (!regex?.test(key)) return;
		const { match: _match, ...config } = entry;
		resolved = { ...resolved, ...config };
	});
	return resolved;
};

describe("styler css value options", () => {
	it("exposes a unitless N option for line-height custom properties", () => {
		expect(findPatternFor("--line-height")).toMatchObject({
			type: "length",
			initialUnit: "",
			units: expect.arrayContaining([{ value: "", label: "N" }]),
		});
	});

	it("exposes a unitless N option for line-height standard properties", () => {
		expect(findPatternFor("line-height")).toMatchObject({
			type: "length",
			initialUnit: "",
			units: expect.arrayContaining([{ value: "", label: "N" }]),
		});
	});

	it("allows negative custom spacing values for margin properties", () => {
		expect(findPatternFor("margin")).toMatchObject({
			type: "spacing-multiple",
			allowNegativeValue: true,
		});
		expect(findPatternFor("margin-top")).toMatchObject({
			type: "spacing-single",
			allowNegativeValue: true,
		});
	});
});
