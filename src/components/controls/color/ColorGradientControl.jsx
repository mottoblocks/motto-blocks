import { Dropdown, Button, ColorIndicator } from "@wordpress/components";
import {
	__experimentalColorGradientControl as WPColorGradientControl,
	__experimentalUseMultipleOriginColorsAndGradients as useMultipleOriginColorsAndGradients,
} from "@wordpress/block-editor";
import { __ } from "@wordpress/i18n";
import { useRef } from "@wordpress/element";
import { withMottoPopupClass } from "@components/ui/popup-class-name";

export const ColorGradientControl = ({
	label,
	colorValue,
	gradientValue,
	onColorChange,
	onGradientChange,
	colors,
	gradients,
	disableCustomColors,
	disableCustomGradients,
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
	const resolvedGradients = Array.isArray(gradients)
		? gradients
		: Array.isArray(paletteSources?.gradients)
			? paletteSources.gradients
			: undefined;
	const resolvedDisableCustomColors =
		typeof disableCustomColors === "boolean"
			? disableCustomColors
			: paletteSources?.disableCustomColors;
	const resolvedDisableCustomGradients =
		typeof disableCustomGradients === "boolean"
			? disableCustomGradients
			: paletteSources?.disableCustomGradients;
	const resolvedColor =
		typeof colorValue === "string" && colorValue.trim() !== ""
			? mapColorValueForInput(colorValue) || colorValue
			: undefined;
	const resolvedGradient =
		typeof gradientValue === "string" && gradientValue.trim() !== ""
			? gradientValue
			: undefined;
	const skippingNextColorReset = useRef(false);
	const skippingNextGradientReset = useRef(false);
	const swatchColor = resolvedGradient || resolvedColor || undefined;
	const ariaLabel = dropdownLabel || label || __("Background", "motto-blocks");

	if (typeof WPColorGradientControl !== "function") {
		return null;
	}

	const control = (
		<WPColorGradientControl
			label={label}
			colorValue={resolvedColor}
			gradientValue={resolvedGradient}
			onColorChange={(nextColor) => {
				if (!nextColor && skippingNextColorReset.current) {
					skippingNextColorReset.current = false;
					return;
				}
				if (nextColor) {
					skippingNextGradientReset.current = true;
				}
				onColorChange?.(nextColor ? mapColorValueForOutput(nextColor) : undefined);
			}}
			onGradientChange={(nextGradient) => {
				if (!nextGradient && skippingNextGradientReset.current) {
					skippingNextGradientReset.current = false;
					return;
				}
				if (nextGradient) {
					skippingNextColorReset.current = true;
				}
				onGradientChange?.(nextGradient || undefined);
			}}
			enableAlpha={enableAlpha}
			colors={resolvedColors}
			gradients={resolvedGradients}
			disableCustomColors={resolvedDisableCustomColors}
			disableCustomGradients={resolvedDisableCustomGradients}
			__experimentalIsRenderedInSidebar={!asDropdown}
		/>
	);

	if (!asDropdown) {
		return <div className="motto-color-gradient-control">{control}</div>;
	}

	return (
		<div className="motto-color-gradient-control">
			<Dropdown
				className={dropdownClassName}
				popoverProps={{
					placement: "left-start",
					offset: 12,
					shift: true,
					className: withMottoPopupClass("motto-color-gradient-dropdown-popup"),
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
