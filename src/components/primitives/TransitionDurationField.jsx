import { __ } from "@wordpress/i18n";
import { NumericUnitField } from "./NumericUnitField.jsx";

const DURATION_UNITS = [
	{ value: "ms", label: "ms" },
	{ value: "s", label: "s" },
];

export const TransitionDurationField = ({ value, onChange, label, min = 0 }) => {
	const resolvedLabel = label ?? __("Duration", "motto-blocks");
	return (
		<div className="motto-transition-field-row">
			<span className="motto-label">{resolvedLabel}</span>
			<div className="flex-1">
				<NumericUnitField
					value={value ?? ""}
					onChange={onChange}
					label={resolvedLabel}
					hideLabelFromVision
					units={DURATION_UNITS}
					min={min}
					showSlider={false}
				/>
			</div>
		</div>
	);
};
