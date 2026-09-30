import {
	Button,
	Icon,
	RangeControl,
	__experimentalParseQuantityAndUnitFromRawValue as parseQuantityAndUnitFromRawValue,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { iconSettings } from "../utils/core-icon-nodes.jsx";
import {
	getUnitConfig,
	getRangeShiftStepByUnit,
	normalizeUnitStep,
} from "@components/primitives/range-unit-steps.js";
import {
	categorizeSpacingValue,
	getSpacingCustomValueFromPreset,
	getSpacingPresetSlug,
	isRawSpacingPresetToken,
	toSpacingPresetOptionValue,
} from "../utils/spacing-value-utils";
import { MODE_CSS, MODE_CUSTOM, MODE_PRESET } from "../utils/value-mode.js";
import { isCssExpressionValue, isCssKeywordValue } from "@components/primitives/var-unit-utils.js";
import { MottoUnitControl } from "@components/controls/units/MottoUnitControl.jsx";

const getSliderIndexForPresetValue = (rawValue, presetSizes) => {
	const slug = parseFloat(rawValue) === 0 ? "0" : getSpacingPresetSlug(rawValue);
	if (!slug) return Number.NaN;
	const idx = presetSizes.findIndex((entry) => String(entry?.slug || "") === slug);
	return idx >= 0 ? idx : Number.NaN;
};

/**
 * One preset/custom value row: an icon, a size editor (preset slider, or a
 * unit-aware custom input + slider), and the toggle between the two. Shared
 * by SpacingControl and BorderRadiusControl — both size a single CSS length
 * for one "slot" (side/corner/axis) the same way core's PresetInputControl
 * does, plus Motto's CSS-expression layer via MottoUnitControl.
 */
export const PresetValueRow = ({
	icon,
	ariaLabel,
	rawValue,
	mode,
	hasPresets,
	isAuto = false,
	unitOptions,
	spacingSizes,
	presetSizes,
	presetMarks,
	minimumCustomValue = 0,
	allowNegativeValue = false,
	normalizedInitialUnit = "",
	inputProps,
	onMouseOver,
	onMouseOut,
	onFocus,
	onBlur,
	onChange,
	onModeChange,
	onToggleCustom,
}) => {
	const kind = categorizeSpacingValue(rawValue).kind;
	const isPreset = kind === "preset";
	// `mode` is fully controlled by the parent (SpacingControl/BorderRadiusControl,
	// via useSlotValueMode) — this row owns no state of its own beyond what's
	// passed in. The parent only re-derives it from the value's shape at the
	// moments that make sense (mount, fresh non-preset external value); while a
	// mode stays open, typing here never feeds back into which mode is shown,
	// so an in-progress edit (e.g. "10p" mid-keystroke) can't kick the row out
	// of css mode — see useSlotValueMode's own contract for the read side.
	const isCustom = mode !== MODE_PRESET;
	const isCssValue = mode === MODE_CSS;

	// Core parity: presets resolve to their concrete size for the custom editor;
	// quantity + unit are always derived from the value (single source, no
	// per-unit shadow state). "auto" blanks the quantity like a CSS value would.
	const resolvedForCustom = isPreset
		? String(getSpacingCustomValueFromPreset(rawValue, spacingSizes) ?? "")
		: rawValue;
	const [parsedQuantity, parsedUnitRaw] = parseQuantityAndUnitFromRawValue(
		isCssValue || isAuto ? "" : resolvedForCustom
	);
	const parsedUnit = String(parsedUnitRaw || "")
		.trim()
		.toLowerCase();
	const computedUnit = parsedUnit || normalizedInitialUnit || unitOptions[0]?.value || "px";
	// Value fed to the unit control: raw for CSS, recomposed [quantity+unit] otherwise
	// (mirrors core's `[parsedQuantity, computedUnit].join("")`). Motto's internal
	// `var:preset|spacing|X` marker is never valid CSS, so entering css mode
	// straight from a slider-selected preset seeds the textarea with the same
	// resolved size the plain custom editor would show (not the raw token). A
	// real CSS var() the user already typed/selected (isPreset but not a raw
	// token) is left untouched.
	const unitControlValue = isCssValue
		? isRawSpacingPresetToken(rawValue)
			? resolvedForCustom
			: rawValue
		: [Number.isFinite(parsedQuantity) ? parsedQuantity : "", computedUnit].join("");

	const sliderIndex = getSliderIndexForPresetValue(rawValue, presetSizes);
	const selectedUnitOption = unitOptions.find((option) => option.value === computedUnit);
	const safeUnit = isCssValue ? "px" : computedUnit;
	const unitConfigBase = getUnitConfig(safeUnit);
	const unitStep = normalizeUnitStep(selectedUnitOption?.step) ?? unitConfigBase.step;
	const unitConfig = {
		max: unitConfigBase.max,
		step: unitStep,
		shiftStep: getRangeShiftStepByUnit(safeUnit, unitStep),
	};
	const customInputMin = allowNegativeValue ? undefined : minimumCustomValue;
	const customSliderValue = Number.isFinite(Number(parsedQuantity))
		? Math.max(minimumCustomValue, Number(parsedQuantity))
		: minimumCustomValue;

	const getPresetTooltipContent = (nextIndex) => {
		const index = Number(nextIndex);
		if (!Number.isFinite(index)) return "";
		return String(presetSizes[index]?.name || "");
	};

	return (
		<>
			{icon ? (
				<span className="motto-control-icon" aria-hidden="true">
					<Icon icon={icon} size={24} />
				</span>
			) : null}
			{isCustom ? (
				<div className="motto-flex gap-md motto-spacing-control">
					<MottoUnitControl
						{...inputProps}
						className="motto-spacing-sizes-control__custom-value-input"
						value={unitControlValue}
						label={ariaLabel}
						hideLabelFromVision
						units={unitOptions}
						emitOnUnitChange={false}
						min={customInputMin}
						step={unitConfig.step}
						inputProps={{ ...(inputProps || {}), step: unitConfig.step }}
						disabled={isAuto}
						onMouseOver={onMouseOver}
						onMouseOut={onMouseOut}
						onFocus={onFocus}
						onBlur={onBlur}
						onUnitChange={(nextUnit) => {
							const isCssUnit =
								String(nextUnit || "")
									.trim()
									.toLowerCase() === "css";
							onModeChange?.(isCssUnit ? MODE_CSS : MODE_CUSTOM);
						}}
						onChange={(nextValue) => {
							const trimmed = String(nextValue ?? "").trim();
							if (isCssValue) {
								// Free-form CSS textarea: commit every keystroke like any other
								// controlled text field. It must reflect partial, in-progress
								// expressions (e.g. "var(--" while still typing), so it cannot
								// be filtered the way the numeric field's onChange is below.
								onChange(trimmed);
								return;
							}
							// Core parity (handleCustomValueChange): only commit numeric or
							// real CSS values. Empty strings, bare units ("em") and partial
							// input are ignored so they never wipe the stored value.
							if (
								!Number.isNaN(parseFloat(trimmed)) ||
								isCssExpressionValue(trimmed) ||
								isCssKeywordValue(trimmed)
							) {
								onChange(trimmed);
							}
						}}
					/>
					{!isCssValue ? (
						<RangeControl
							className="motto-control-slider motto-spacing-sizes-control__custom-value-range"
							value={customSliderValue}
							min={minimumCustomValue}
							max={unitConfig.max}
							step={unitConfig.step}
							shiftStep={unitConfig.shiftStep}
							withInputField={false}
							label={ariaLabel}
							hideLabelFromVision
							disabled={isAuto}
							onMouseOver={onMouseOver}
							onMouseOut={onMouseOut}
							onFocus={onFocus}
							onBlur={onBlur}
							onChange={(nextNumber) => {
								const numeric = Number(nextNumber);
								if (!Number.isFinite(numeric)) return;
								onChange(`${numeric}${computedUnit}`);
							}}
						/>
					) : null}
				</div>
			) : (
				<RangeControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					className="motto-spacing-sizes-control__range-control"
					value={Number.isFinite(sliderIndex) ? sliderIndex : 0}
					min={0}
					max={Math.max(0, presetSizes.length - 1)}
					marks={presetMarks}
					renderTooltipContent={getPresetTooltipContent}
					withInputField={false}
					label={ariaLabel}
					hideLabelFromVision
					disabled={isAuto}
					onMouseOver={onMouseOver}
					onMouseOut={onMouseOut}
					onFocus={onFocus}
					onBlur={onBlur}
					onChange={(nextIndex) => {
						const index = Number(nextIndex);
						if (!Number.isFinite(index)) return;
						const selected = presetSizes[index];
						onChange(toSpacingPresetOptionValue(String(selected?.slug || "0")));
					}}
				/>
			)}
			{hasPresets ? (
				<Button
					variant="tertiary"
					className="motto-spacing-sizes-control__custom-toggle motto-ui-button is-icon-only"
					aria-pressed={isCustom}
					disabled={isAuto}
					aria-label={
						isCustom
							? __("Use size preset", "motto-blocks")
							: __("Set custom size", "motto-blocks")
					}
					title={
						isCustom
							? __("Use size preset", "motto-blocks")
							: __("Set custom size", "motto-blocks")
					}
					onClick={onToggleCustom}
				>
					<Icon icon={iconSettings} />
				</Button>
			) : null}
		</>
	);
};
