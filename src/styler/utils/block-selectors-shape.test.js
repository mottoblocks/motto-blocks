import { describe, expect, it, vi } from "vitest";

import {
	normalizeBlockSelectorsByBreakpoint,
	normalizeBlockSelectorsSelectorList,
	SELECTOR_TOKEN,
	resolveInnerSelectorTemplate,
	sanitizeResolvedSelectorForValidation,
	validateInnerSelectorTemplate,
} from "./block-selectors-shape";

describe("resolveInnerSelectorTemplate", () => {
	it("replaces the block placeholder with the provided selector", () => {
		expect(resolveInnerSelectorTemplate(`${SELECTOR_TOKEN} :where(a)`, ".motto-preview")).toBe(
			".motto-preview :where(a)"
		);
	});
});

describe("validateInnerSelectorTemplate", () => {
	it("rejects templates without the block placeholder", () => {
		expect(
			validateInnerSelectorTemplate(":where(a)", { validateResolvedSelector: vi.fn() })
		).toEqual({
			isValid: false,
			reason: "missing-token",
			resolvedSelector: "",
		});
	});

	it("passes the resolved selector to the final validator", () => {
		const validateResolvedSelector = vi.fn(() => true);
		const result = validateInnerSelectorTemplate(`${SELECTOR_TOKEN}:hover`, {
			baseSelector: ".motto-preview",
			validateResolvedSelector,
		});

		expect(result).toEqual({
			isValid: true,
			reason: "",
			resolvedSelector: ".motto-preview:hover",
		});
		expect(validateResolvedSelector).toHaveBeenCalledWith(".motto-preview:hover");
	});

	it("reports invalid selectors after placeholder resolution", () => {
		expect(
			validateInnerSelectorTemplate(`${SELECTOR_TOKEN}::`, {
				validateResolvedSelector: () => false,
			})
		).toEqual({
			isValid: false,
			reason: "invalid-selector",
			resolvedSelector: ".motto-block-selector-preview::",
		});
	});

	it("sanitizes pseudo-elements for validation without changing the saved selector", () => {
		expect(
			sanitizeResolvedSelectorForValidation(
				".motto-block-selector-preview :is(.motto-list-item__bullet,.motto-list-item::marker)"
			)
		).toBe(".motto-block-selector-preview :is(.motto-list-item__bullet,.motto-list-item)");
		expect(
			sanitizeResolvedSelectorForValidation(
				".motto-block-selector-preview .motto-list-item__bullet, .motto-block-selector-preview .motto-list-item::marker"
			)
		).toBe(
			".motto-block-selector-preview .motto-list-item__bullet, .motto-block-selector-preview .motto-list-item"
		);
	});

	it("accepts selector lists with ::marker when sanitized validation passes", () => {
		const supports = vi.fn(
			(value) =>
				value ===
				"selector(.motto-block-selector-preview :is(.motto-list-item__bullet,.motto-list-item))"
		);
		const previousCss = globalThis.CSS;
		globalThis.CSS = { supports };

		try {
			expect(
				validateInnerSelectorTemplate(
					`${SELECTOR_TOKEN} :is(.motto-list-item__bullet,.motto-list-item::marker)`
				)
			).toEqual({
				isValid: true,
				reason: "",
				resolvedSelector:
					".motto-block-selector-preview :is(.motto-list-item__bullet,.motto-list-item::marker)",
			});
		} finally {
			globalThis.CSS = previousCss;
		}
	});
});

describe("normalizeBlockSelectorsSelectorList", () => {
	it("reuses one generated stable id for the same selector across breakpoints", () => {
		const byBreakpoint = normalizeBlockSelectorsByBreakpoint([
			{
				selector: `${SELECTOR_TOKEN} .child`,
				label: "Child",
				css: {
					desktop: [{ name: "color", value: "red" }],
					tablet: [{ name: "color", value: "blue" }],
				},
			},
		]);

		expect(byBreakpoint.desktop[0].id).toBeTruthy();
		expect(byBreakpoint.desktop[0].id).toBe(byBreakpoint.tablet[0].id);
	});

	it("preserves duplicate selectors when rows have different stable ids", () => {
		const result = normalizeBlockSelectorsSelectorList({
			desktop: [
				{
					id: "sub-1",
					label: "Item",
					selector: `${SELECTOR_TOKEN} .child`,
					css: [{ name: "color", value: "red" }],
				},
				{
					id: "sub-2",
					label: "Item Copy",
					selector: `${SELECTOR_TOKEN} .child`,
					css: [{ name: "color", value: "blue" }],
				},
			],
		});

		expect(result).toHaveLength(2);
		expect(result[0]).toMatchObject({
			id: "sub-1",
			label: "Item",
			description: "",
			selector: `${SELECTOR_TOKEN} .child`,
			css: {
				desktop: [{ name: "color", value: "red" }],
				tablet: [],
				landscapePhone: [],
				phone: [],
			},
		});
		expect(result[1]).toMatchObject({
			id: "sub-2",
			label: "Item Copy",
			description: "",
			selector: `${SELECTOR_TOKEN} .child`,
			css: {
				desktop: [{ name: "color", value: "blue" }],
				tablet: [],
				landscapePhone: [],
				phone: [],
			},
		});
		expect(result[0].css.desktop[0].id).toMatch(/^motto-selector-row-sub-1-desktop-/);
		expect(result[1].css.desktop[0].id).toMatch(/^motto-selector-row-sub-2-desktop-/);
	});
});
