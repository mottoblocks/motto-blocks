import { __ } from "@wordpress/i18n";
import { normalizeSpacingPresetSlug } from "./core-preset-values.js";

export const buildSpacingSizes = (spacingSizes) => {
	const seen = new Set();
	const list = [{ name: __("None", "motto-blocks"), slug: "0", size: 0 }];
	seen.add("0");
	(Array.isArray(spacingSizes) ? spacingSizes : []).forEach((entry) => {
		const slug = normalizeSpacingPresetSlug(entry?.slug);
		if (!slug || seen.has(slug)) return;
		seen.add(slug);
		list.push({
			name: String(entry?.name || slug),
			slug,
			size: entry?.size,
		});
	});
	return list;
};
