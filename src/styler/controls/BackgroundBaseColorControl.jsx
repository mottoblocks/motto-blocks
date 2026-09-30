import { __ } from "@wordpress/i18n";
import { ColorControl } from "@components";
import {
	toPaletteColors,
	toPaletteVisualValue,
	toStoredColorValue,
} from "../utils/color-palette-utils";

export const BackgroundBaseColorControl = ({
	value,
	onChange,
	themeColors = [],
	disableCustomColors = false,
	colorToPresetVar = (next) => next,
	label = __("Base color", "motto-blocks"),
	editAriaLabel = __("Edit base color", "motto-blocks"),
}) => {
	const paletteColors = toPaletteColors(themeColors);
	const visualValue = toPaletteVisualValue(value, paletteColors);

	return (
		<div className="motto-background-base-color-control">
			<div className="motto-background-base-color-control__label">{label}</div>
			<ColorControl
				asDropdown
				label=""
				dropdownLabel={editAriaLabel}
				colorValue={value}
				onChange={onChange}
				colors={paletteColors}
				disableCustomColors={disableCustomColors}
				mapColorValueForInput={(next) => toPaletteVisualValue(next, paletteColors)}
				mapColorValueForOutput={(next) => toStoredColorValue(next, colorToPresetVar)}
				swatchColorValue={visualValue || value || undefined}
				toggleVariant="tertiary"
				toggleClassName="motto-color-picker motto-background-base-color-control__trigger"
			/>
		</div>
	);
};
