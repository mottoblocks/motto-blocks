import { describe, expect, it } from "vitest";

import { sanitizeInlineSvgStyleCss, SVG_ALLOWED_TAGS } from "./inline-svg-sanitizer.js";

describe("inline SVG style sanitizer", () => {
	it("keeps structural tags and attributes required by clipped SVG exports", () => {
		expect(SVG_ALLOWED_TAGS.g.has("clip-path")).toBe(true);
		expect(SVG_ALLOWED_TAGS.defs).toBeDefined();
		expect(SVG_ALLOWED_TAGS.clippath.has("id")).toBe(true);
		expect(SVG_ALLOWED_TAGS.rect.has("fill")).toBe(true);
	});

	it("keeps animation CSS used inside SVG style tags", () => {
		const css = `
			.orbit { animation: spin 2s linear infinite; transform-origin: center; }
			@keyframes spin {
				from { transform: rotate(0deg); opacity: .5; }
				to { transform: rotate(360deg); opacity: 1; }
			}
		`;

		expect(sanitizeInlineSvgStyleCss(css)).toContain("@keyframes spin");
		expect(sanitizeInlineSvgStyleCss(css)).toContain("animation: spin 2s linear infinite");
	});

	it.each([
		"@import 'https://example.com/a.css';",
		".x { fill: url(#grad); }",
		".x { background: javascript:alert(1); }",
	])("rejects unsafe CSS: %s", (css) => {
		expect(sanitizeInlineSvgStyleCss(css)).toBe("");
	});
});
