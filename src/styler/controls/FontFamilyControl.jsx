import { ComboboxControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { useEffect, useMemo, useState } from "@wordpress/element";

const SYSTEM_FONT_STACKS = [
	{ label: __("Sans Serif", "motto-blocks"), value: "sans-serif" },
	{ label: __("Serif", "motto-blocks"), value: "serif" },
	{ label: __("Monospace", "motto-blocks"), value: "monospace" },
	{ label: __("System UI", "motto-blocks"), value: "system-ui" },
	{ label: __("Cursive", "motto-blocks"), value: "cursive" },
	{ label: __("Fantasy", "motto-blocks"), value: "fantasy" },
	{ label: __("Inherit", "motto-blocks"), value: "inherit" },
	{ label: __("Initial", "motto-blocks"), value: "initial" },
	{ label: __("Unset", "motto-blocks"), value: "unset" },
];

const normalizeIncomingValue = (rawValue) => {
	const value = String(rawValue || "").trim();
	if (!value) return "";
	const tokenMatch = value.match(/^var:preset\|font-family\|([a-z0-9-]+)$/i);
	if (tokenMatch && tokenMatch[1]) {
		return `var(--wp--preset--font-family--${tokenMatch[1]})`;
	}
	return value;
};

const themeFontToOption = (font) => {
	const slug = String(font?.slug || "").trim();
	const label = String(font?.name || slug || "").trim();
	const family = String(font?.fontFamily || font?.family || font?.value || "").trim();
	if (!slug && !family) return null;
	const presetVar = slug
		? family
			? `var(--wp--preset--font-family--${slug}, ${family})`
			: `var(--wp--preset--font-family--${slug})`
		: "";
	return {
		label: label || family || slug,
		value: presetVar || family,
	};
};

export const FontFamilyControl = ({
	value,
	onChange,
	fontFamilies = [],
	disableCustomFontFamilies = false,
	fontFamilyToPresetVar = (next) => next,
}) => {
	const normalizedValue = normalizeIncomingValue(value);
	const [draft, setDraft] = useState(normalizedValue);

	useEffect(() => {
		setDraft(normalizedValue);
	}, [normalizedValue]);

	const options = useMemo(() => {
		const seen = new Set();
		const next = [];
		(Array.isArray(fontFamilies) ? fontFamilies : []).forEach((font) => {
			const option = themeFontToOption(font);
			if (!option) return;
			if (seen.has(option.value)) return;
			seen.add(option.value);
			next.push(option);
		});
		SYSTEM_FONT_STACKS.forEach((option) => {
			if (seen.has(option.value)) return;
			seen.add(option.value);
			next.push(option);
		});
		if (normalizedValue && !seen.has(normalizedValue)) {
			next.unshift({ label: normalizedValue, value: normalizedValue });
		}
		return next;
	}, [fontFamilies, normalizedValue]);

	const commitValue = (nextValue) => {
		const next = fontFamilyToPresetVar(normalizeIncomingValue(nextValue));
		setDraft(next);
		onChange(next);
	};

	return (
		<div className="motto-font-family-control">
			<ComboboxControl
				className="motto-select motto-font-family-combobox"
				label={__("Font family", "motto-blocks")}
				value={draft}
				options={options}
				onChange={(next) => {
					if (next === undefined || next === null) {
						commitValue("");
						return;
					}
					commitValue(next);
				}}
				onFilterValueChange={(next) => {
					if (disableCustomFontFamilies) return;
					const typed = fontFamilyToPresetVar(String(next || ""));
					setDraft(typed);
					onChange(typed);
				}}
				allowReset
			/>
		</div>
	);
};
