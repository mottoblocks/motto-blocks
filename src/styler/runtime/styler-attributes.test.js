import { describe, expect, it, vi } from "vitest";

vi.mock("@wordpress/blocks", () => ({ createBlock: vi.fn(), serialize: vi.fn() }));

import { defaultMottoStyler } from "../data/default-motto-styler";
import {
	STYLER_ATTRIBUTE_KEY,
	persistStylerAttributes,
	resolveRawStylerAttributes,
} from "./styler-attributes";

describe("resolveRawStylerAttributes", () => {
	it("returns mottoStyler when it has real content", () => {
		const stylerValue = {
			css: { desktop: [{ name: "color", value: "red" }] },
		};

		expect(resolveRawStylerAttributes({ [STYLER_ATTRIBUTE_KEY]: stylerValue })).toEqual(
			stylerValue
		);
	});

	it("treats blockSpacing as meaningful content", () => {
		const stylerValue = {
			blockSpacing: {
				enabled: true,
				values: { desktop: "2rem" },
			},
		};

		expect(resolveRawStylerAttributes({ [STYLER_ATTRIBUTE_KEY]: stylerValue })).toEqual(
			stylerValue
		);
	});

	it("returns default styler when mottoStyler is absent or truly empty object", () => {
		expect(resolveRawStylerAttributes({})).toEqual(defaultMottoStyler);
		expect(resolveRawStylerAttributes({ [STYLER_ATTRIBUTE_KEY]: {} })).toEqual(
			defaultMottoStyler
		);
	});
});

describe("persistStylerAttributes", () => {
	it("writes only to mottoStyler key", () => {
		const setAttributes = vi.fn();
		const nextValue = {
			css: { desktop: [{ name: "display", value: "flex" }] },
		};

		persistStylerAttributes(setAttributes, nextValue);

		expect(setAttributes).toHaveBeenCalledTimes(1);
		expect(setAttributes).toHaveBeenCalledWith({
			[STYLER_ATTRIBUTE_KEY]: nextValue,
		});
	});

	it("canonicalizes selector data into blockSelectors and drops legacy selector keys", () => {
		const setAttributes = vi.fn();
		const nextValue = {
			css: { desktop: [{ name: "display", value: "flex" }] },
			innerSelectors: [
				{
					id: "sub-1",
					selector: "&{BLOCK} .child",
					css: {
						desktop: [{ name: "color", value: "red" }],
					},
				},
			],
			selectors: [{ selector: ".legacy-should-be-dropped", css: { desktop: [] } }],
		};

		persistStylerAttributes(setAttributes, nextValue);

		expect(setAttributes).toHaveBeenCalledTimes(1);
		const payload = setAttributes.mock.calls[0][0];
		expect(payload).toMatchObject({
			[STYLER_ATTRIBUTE_KEY]: {
				css: { desktop: [{ name: "display", value: "flex" }] },
				blockSelectors: [
					{
						id: "sub-1",
						selector: "&{BLOCK} .child",
						label: "",
						description: "",
						css: {
							desktop: [{ name: "color", value: "red" }],
							tablet: [],
							landscapePhone: [],
							phone: [],
						},
					},
				],
			},
		});
		expect(payload[STYLER_ATTRIBUTE_KEY].blockSelectors[0].css.desktop[0].id).toMatch(
			/^motto-selector-row-sub-1-desktop-/
		);
	});

	it("preserves id on css rows before persisting", () => {
		const setAttributes = vi.fn();
		persistStylerAttributes(setAttributes, {
			css: { desktop: [{ name: "display", value: "flex", id: "motto-main-row-desktop-1" }] },
		});
		const payload = setAttributes.mock.calls[0][0];
		expect(payload[STYLER_ATTRIBUTE_KEY].css.desktop[0]).toEqual({
			name: "display",
			value: "flex",
			id: "motto-main-row-desktop-1",
		});
	});

	it("falls back to default styler shape for invalid payloads", () => {
		const setAttributes = vi.fn();

		persistStylerAttributes(setAttributes, null);

		expect(setAttributes).toHaveBeenCalledWith({
			[STYLER_ATTRIBUTE_KEY]: defaultMottoStyler,
		});
	});
});
