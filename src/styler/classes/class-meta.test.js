import { describe, expect, it } from "vitest";

import { CLASS_META_STYLER_KEY, resolveClassMetaStyler } from "./class-meta";

describe("resolveClassMetaStyler", () => {
	it("returns styler value when it has real content", () => {
		const next = { css: { desktop: [{ name: "color", value: "red" }] } };
		expect(resolveClassMetaStyler({ [CLASS_META_STYLER_KEY]: next })).toEqual(next);
	});

	it("returns null when key is absent or truly empty object", () => {
		expect(resolveClassMetaStyler({})).toBeNull();
		expect(resolveClassMetaStyler({ [CLASS_META_STYLER_KEY]: {} })).toBeNull();
	});
});
