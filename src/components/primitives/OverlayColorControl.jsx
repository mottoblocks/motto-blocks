import { RangeControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { ColorControl } from "@components/controls/color/ColorControl.jsx";
import { ColorGradientControl } from "@components/controls/color/ColorGradientControl.jsx";

const toNumberOrFallback = (value, fallback) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

export const OverlayColorControl = ({
	label,
	value,
	onChange,
	onReset,
	min = 0,
	max = 1,
	step = 0.05,
	colorValue,
	onColorChange,
	gradientValue,
	onGradientChange,
	allowGradient = true,
	colorLabel,
	disabled = false,
}) => {
	const resolvedLabel = String(label || "").trim() || __("Overlay", "motto-blocks");
	const rowLabel = colorLabel || __("Background", "motto-blocks");
	return (
		<div className="motto-overlay-color-control motto-grid gap-sm">
			<span className="motto-label">{resolvedLabel}</span>
			<div className="motto-flex align-center gap-md">
				<div className="flex-1 motto-field">
					<RangeControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={resolvedLabel}
						hideLabelFromVision
						value={toNumberOrFallback(value, min)}
						onChange={(nextValue) => {
							const parsed = Number(nextValue);
							onChange?.(Number.isFinite(parsed) ? parsed : min);
						}}
						min={min}
						max={max}
						step={step}
						allowReset={typeof onReset === "function"}
						onReset={onReset}
						disabled={disabled}
					/>
				</div>
				<div className="flex-none">
					{allowGradient ? (
						<ColorGradientControl
							asDropdown
							label={rowLabel}
							colorValue={colorValue}
							gradientValue={gradientValue}
							onColorChange={onColorChange}
							onGradientChange={onGradientChange}
							disabled={disabled}
							dropdownClassName="motto-overlay-color-control__dropdown"
							toggleClassName="motto-color-gradient-swatch-button"
						/>
					) : (
						<ColorControl
							asDropdown
							label={rowLabel}
							colorValue={colorValue}
							onChange={onColorChange}
							disabled={disabled}
							dropdownClassName="motto-overlay-color-control__dropdown"
							toggleClassName="motto-color-gradient-swatch-button"
						/>
					)}
				</div>
			</div>
		</div>
	);
};
