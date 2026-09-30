import { ToggleControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { useRef } from "@wordpress/element";
import clsx from "clsx";
import { NumericUnitField } from "../../primitives/NumericUnitField.jsx";

const toStringValue = (value) => (value === undefined || value === null ? "" : String(value));

export const MottoNumberControl = ({
	value,
	onChange,
	label = "",
	step,
	min,
	max,
	showSlider = false,
	hasAutoValue = false,
	autoValueLabel,
	unit = "",
	initialUnit = "",
	units,
}) => {
	const lastNumberValueRef = useRef("");
	const rawValue = toStringValue(value);
	const isAuto = hasAutoValue && rawValue.trim() === "auto";
	const controlValue = isAuto ? "" : rawValue;

	return (
		<div className="motto-number-control">
			{hasAutoValue ? (
				<div
					className={clsx(
						showSlider ? "motto-flex-col gap-md" : "motto-flex align-center gap-sm"
					)}
				>
					<NumericUnitField
						value={controlValue}
						onChange={(next) => {
							const nextValue = toStringValue(next);
							if (nextValue !== "") {
								lastNumberValueRef.current = nextValue;
							}
							onChange(nextValue);
						}}
						min={min}
						max={max}
						step={step}
						unit={unit}
						initialUnit={initialUnit}
						units={units}
						label={label}
						disabled={isAuto}
						showSlider={showSlider}
					/>

					<ToggleControl
						__nextHasNoMarginBottom
						label={autoValueLabel || __("Auto", "motto-blocks")}
						checked={isAuto}
						onChange={(checked) => {
							if (checked) {
								const current = rawValue.trim();
								if (current && current !== "auto") {
									lastNumberValueRef.current = current;
								}
								onChange("auto");
								return;
							}
							onChange(lastNumberValueRef.current || "");
						}}
					/>
				</div>
			) : (
				<NumericUnitField
					value={controlValue}
					onChange={(next) => {
						const nextValue = toStringValue(next);
						if (nextValue !== "") {
							lastNumberValueRef.current = nextValue;
						}
						onChange(nextValue);
					}}
					min={min}
					max={max}
					step={step}
					unit={unit}
					initialUnit={initialUnit}
					units={units}
					label={label}
					disabled={isAuto}
					showSlider={showSlider}
				/>
			)}
		</div>
	);
};
