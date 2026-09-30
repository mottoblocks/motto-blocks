import { SelectControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { useState, useEffect } from "@wordpress/element";
import { PlainTextField } from "./PlainTextField.jsx";

export const TRANSITION_EASING_PRESETS = [
	// Standard CSS
	{ value: "ease", label: __("Ease", "motto-blocks") },
	{ value: "linear", label: __("Linear", "motto-blocks") },
	{ value: "ease-in", label: __("Ease In", "motto-blocks") },
	{ value: "ease-out", label: __("Ease Out", "motto-blocks") },
	{ value: "ease-in-out", label: __("Ease In Out", "motto-blocks") },
	{ value: "step-start", label: __("Step Start", "motto-blocks") },
	{ value: "step-end", label: __("Step End", "motto-blocks") },
	// Back (overshoot)
	{ value: "cubic-bezier(0.36, 0, 0.66, -0.56)", label: __("Ease In Back", "motto-blocks") },
	{ value: "cubic-bezier(0.34, 1.56, 0.64, 1)", label: __("Ease Out Back", "motto-blocks") },
	{
		value: "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
		label: __("Ease In Out Back", "motto-blocks"),
	},
	// Expo
	{ value: "cubic-bezier(0.7, 0, 0.84, 0)", label: __("Ease In Expo", "motto-blocks") },
	{ value: "cubic-bezier(0.16, 1, 0.3, 1)", label: __("Ease Out Expo", "motto-blocks") },
	{
		value: "cubic-bezier(0.87, 0, 0.13, 1)",
		label: __("Ease In Out Expo", "motto-blocks"),
	},
	// Elastic (cubic-bezier approximation)
	{
		value: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
		label: __("Ease Out Elastic", "motto-blocks"),
	},
	{
		value: "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
		label: __("Ease In Out Elastic", "motto-blocks"),
	},
	// Circ
	{ value: "cubic-bezier(0.55, 0, 1, 0.45)", label: __("Ease In Circ", "motto-blocks") },
	{ value: "cubic-bezier(0, 0.55, 0.45, 1)", label: __("Ease Out Circ", "motto-blocks") },
	{
		value: "cubic-bezier(0.85, 0, 0.15, 1)",
		label: __("Ease In Out Circ", "motto-blocks"),
	},
	// Custom sentinel
	{ value: "__custom__", label: __("Custom…", "motto-blocks") },
];

const PRESET_VALUE_SET = new Set(
	TRANSITION_EASING_PRESETS.filter((p) => p.value !== "__custom__").map((p) => p.value)
);

const isCustomValue = (val) => Boolean(val) && !PRESET_VALUE_SET.has(val);

export const TransitionEasingField = ({ value, onChange, label }) => {
	const [isCustomMode, setIsCustomMode] = useState(() => isCustomValue(value));

	// Sync when value changes externally (undo/redo, preset selected from outside)
	useEffect(() => {
		if (isCustomValue(value)) {
			setIsCustomMode(true);
		} else if (value) {
			setIsCustomMode(false);
		}
	}, [value]);

	const selectValue = isCustomMode ? "__custom__" : value || "ease";

	const handleSelectChange = (next) => {
		if (next === "__custom__") {
			setIsCustomMode(true);
			// Don't call onChange — wait for the text field
		} else {
			setIsCustomMode(false);
			onChange(next);
		}
	};

	const resolvedLabel = label ?? __("Easing", "motto-blocks");

	return (
		<div className="motto-transition-field-row motto-transition-easing-field">
			<span className="motto-label">{resolvedLabel}</span>
			<div className="flex-1">
				<SelectControl
					aria-label={resolvedLabel}
					value={selectValue}
					options={TRANSITION_EASING_PRESETS}
					onChange={handleSelectChange}
				/>
				{isCustomMode ? (
					<PlainTextField
						label={__("Custom easing", "motto-blocks")}
						hideLabelFromVision
						value={value}
						onChange={onChange}
						className="motto-input"
						placeholder="cubic-bezier(…)"
					/>
				) : null}
			</div>
		</div>
	);
};
