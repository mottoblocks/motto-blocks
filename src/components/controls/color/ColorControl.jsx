import { Button, ColorIndicator, ColorPalette, Dropdown } from "@wordpress/components";
import { __experimentalUseMultipleOriginColorsAndGradients as useMultipleOriginColorsAndGradients } from "@wordpress/block-editor";
import { __ } from "@wordpress/i18n";
import { withMottoPopupClass } from "@components/ui/popup-class-name";

export const ColorControl = ({
	label,
	colorValue,
	onChange,
	colors,
	disableCustomColors,
	mapColorValueForInput = (next) => next,
	mapColorValueForOutput = (next) => next,
	enableAlpha = false,
	asDropdown = false,
	dropdownLabel,
	dropdownClassName = "motto-color-gradient-dropdown",
	toggleClassName = "motto-color-gradient-swatch-button",
	disabled = false,
}) => {
	const usePaletteSources =
		typeof useMultipleOriginColorsAndGradients === "function"
			? useMultipleOriginColorsAndGradients
			: () => ({});
	const paletteSources = usePaletteSources();
	const resolvedColors = Array.isArray(colors)
		? colors
		: Array.isArray(paletteSources?.colors)
			? paletteSources.colors
			: undefined;
	const resolvedDisableCustomColors =
		typeof disableCustomColors === "boolean"
			? disableCustomColors
			: paletteSources?.disableCustomColors;
	const resolvedColor =
		typeof colorValue === "string" && colorValue.trim() !== ""
			? mapColorValueForInput(colorValue) || colorValue
			: "";
	const swatchColor = resolvedColor || undefined;
	const ariaLabel = dropdownLabel || label || __("Color", "motto-blocks");

	const control = (
		<ColorPalette
			value={resolvedColor}
			colors={resolvedColors}
			disableCustomColors={resolvedDisableCustomColors}
			enableAlpha={enableAlpha}
			onChange={(nextColor) =>
				onChange?.(nextColor ? mapColorValueForOutput(nextColor) : undefined)
			}
		/>
	);

	if (!asDropdown) {
		return <div className="motto-color-control">{control}</div>;
	}

	return (
		<div className="motto-color-control">
			<Dropdown
				className={dropdownClassName}
				popoverProps={{
					placement: "left-start",
					offset: 12,
					shift: true,
					className: withMottoPopupClass("motto-color-dropdown-popup"),
				}}
				renderToggle={({ isOpen, onToggle }) => (
					<Button
						variant={isOpen ? "primary" : "secondary"}
						className={toggleClassName}
						onClick={onToggle}
						disabled={disabled}
						aria-expanded={isOpen}
						aria-label={ariaLabel}
						title={ariaLabel}
					>
						<ColorIndicator
							className="motto-color-gradient-swatch"
							colorValue={swatchColor}
						/>
					</Button>
				)}
				renderContent={() => control}
			/>
		</div>
	);
};
