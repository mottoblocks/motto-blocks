import {
	__experimentalNumberControl as NumberControl,
	__experimentalParseQuantityAndUnitFromRawValue as parseQuantityAndUnitFromRawValue,
	RangeControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { useEffect, useMemo, useState } from "@wordpress/element";
import { getRangeShiftStepByUnit, getRangeStepByUnit } from "./range-unit-steps.js";
import { VAR_UNIT, isVarFunctionValue } from "./var-unit-utils.js";
import { MottoUnitControl } from "../controls/units/MottoUnitControl.jsx";
import { resolveNumericUnitOptions, resolveNumericUnitValue } from "./NumericUnitField.utils.js";

const toStringValue = (value) => (value === undefined || value === null ? "" : String(value));

const toUnitValue = (unit) =>
	String(unit || "")
		.trim()
		.toLowerCase();

export const NumericUnitField = ({
	value,
	onChange,
	min,
	max,
	step,
	shiftStep,
	unit = "",
	initialUnit = "",
	units,
	onUnitChange,
	label = "",
	hideLabelFromVision = true,
	disabled = false,
	showSlider = true,
	/**
	 * When true, appends "var" to the unit list and enables the var picker.
	 */
	enableVarUnit = true,
	inputProps,
	onMouseOver,
	onMouseOut,
	onFocus,
	onBlur,
}) => {
	const hasUnits = Array.isArray(units) && units.length > 0;
	const resolvedUnits = useMemo(() => resolveNumericUnitOptions(units, step), [step, units]);

	const rawValue = toStringValue(value);
	const [parsedQuantityRaw, parsedUnitRaw] = parseQuantityAndUnitFromRawValue(rawValue);
	const parsedQuantity = Number(parsedQuantityRaw);
	const parsedUnit = toUnitValue(parsedUnitRaw);
	const hasFixedUnit = toUnitValue(unit) !== "";
	const resolvedUnit = resolveNumericUnitValue({
		unit,
		hasUnits,
		resolvedUnits,
		parsedUnit,
		initialUnit,
	});
	const numericValue = Number.isFinite(parsedQuantity) ? parsedQuantity : Number.NaN;
	const sliderValue = Number.isFinite(numericValue) ? numericValue : undefined;
	const resolvedStep = useMemo(
		() => getRangeStepByUnit(resolvedUnit, step ?? 1),
		[resolvedUnit, step]
	);
	const resolvedShiftStep = useMemo(
		() =>
			Number.isFinite(Number(shiftStep))
				? Number(shiftStep)
				: getRangeShiftStepByUnit(resolvedUnit, resolvedStep),
		[resolvedStep, resolvedUnit, shiftStep]
	);
	const resolvedAriaLabel = String(label || "").trim() || __("Value", "motto-blocks");
	const resolvedNumberInputValue = hasUnits
		? rawValue
		: hasFixedUnit
			? toStringValue(parsedQuantityRaw)
			: rawValue;

	// Tracks the current unit to decide slider visibility.
	// Must be useState (not useRef) so switching to var immediately hides the slider
	// even before a token is selected (before onChange fires and rawValue changes).
	const [currentUnit, setCurrentUnit] = useState(
		enableVarUnit && isVarFunctionValue(rawValue) ? VAR_UNIT : resolvedUnit
	);

	// Sync: if external value becomes non-var (undo/redo) while currentUnit is var, reset.
	useEffect(() => {
		if (!enableVarUnit) return;
		if (currentUnit === VAR_UNIT && rawValue !== "" && !isVarFunctionValue(rawValue)) {
			setCurrentUnit(resolvedUnit);
		}
	}, [rawValue]); // eslint-disable-line react-hooks/exhaustive-deps

	const isVarMode = enableVarUnit && (currentUnit === VAR_UNIT || isVarFunctionValue(rawValue));

	const sharedInputProps = {
		...inputProps,
		className: "motto-input",
		label,
		hideLabelFromVision,
		min,
		max,
		disabled,
		onMouseOver,
		onMouseOut,
		onFocus,
		onBlur,
	};

	return (
		<div className="motto-flex align-center gap-md">
			{hasUnits ? (
				<MottoUnitControl
					{...sharedInputProps}
					value={rawValue}
					aria-label={resolvedAriaLabel}
					units={resolvedUnits}
					enableVarUnit={enableVarUnit}
					onUnitChange={(nextUnit) => {
						setCurrentUnit(nextUnit);
						if (onUnitChange) onUnitChange(nextUnit);
					}}
					onChange={(nextValue) => onChange(toStringValue(nextValue))}
				/>
			) : (
				<div className="motto-prop-input">
					<NumberControl
						{...sharedInputProps}
						value={resolvedNumberInputValue}
						step={resolvedStep}
						onChange={(nextValue) => {
							const nextStringValue = toStringValue(nextValue).trim();
							if (!nextStringValue) {
								onChange("");
								return;
							}
							onChange(
								hasFixedUnit ? `${nextStringValue}${resolvedUnit}` : nextStringValue
							);
						}}
					/>
					{resolvedUnit ? (
						<span className="motto-control-unit">{resolvedUnit}</span>
					) : null}
				</div>
			)}
			{showSlider && !isVarMode ? (
				<RangeControl
					className="motto-control-slider"
					value={sliderValue}
					min={min}
					max={max}
					step={resolvedStep}
					shiftStep={resolvedShiftStep}
					withInputField={false}
					label={label}
					hideLabelFromVision={hideLabelFromVision}
					disabled={disabled}
					onMouseOver={onMouseOver}
					onMouseOut={onMouseOut}
					onFocus={onFocus}
					onBlur={onBlur}
					onChange={(nextNumber) => {
						const numeric = Number(nextNumber);
						if (!Number.isFinite(numeric)) return;
						onChange(resolvedUnit ? `${numeric}${resolvedUnit}` : String(numeric));
					}}
				/>
			) : null}
		</div>
	);
};
