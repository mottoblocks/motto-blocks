import { FontSizePicker } from "@wordpress/components";
import { normalizePresetSlug } from "../utils/core-preset-values.js";

export const FontSizeControl = ({
	value,
	onChange,
	fontSizes = [],
	disableCustomFontSizes = false,
	fontSizeToPresetVar = (next) => next,
}) => {
	const toVisualValue = (currentValue) => {
		const current = String(currentValue || "").trim();
		if (!current) return "";

		const varMatch = current.match(
			/^var\(--wp--preset--font-size--([a-z0-9-]+)(?:\s*,[\s\S]+)?\)$/i
		);
		const tokenMatch = current.match(/^var:preset\|font-size\|([a-z0-9-]+)$/i);
		const slug = normalizePresetSlug(
			(varMatch && varMatch[1]) || (tokenMatch && tokenMatch[1]) || ""
		);
		if (!slug) return current;

		const matched = (Array.isArray(fontSizes) ? fontSizes : []).find(
			(size) => normalizePresetSlug(size?.slug) === slug
		);
		if (!matched) return current;
		return matched.size || matched.value || current;
	};

	return (
		<div className="motto-font-size-control">
			<FontSizePicker
				value={toVisualValue(value)}
				fontSizes={fontSizes}
				disableCustomFontSizes={disableCustomFontSizes}
				onChange={(next, selectedFontSize) =>
					onChange(fontSizeToPresetVar(selectedFontSize || next))
				}
			/>
		</div>
	);
};
