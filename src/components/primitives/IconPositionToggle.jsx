import {
	BaseControl,
	Button,
	__experimentalToggleGroupControl as ExperimentalToggleGroupControl,
	__experimentalToggleGroupControlOption as ExperimentalToggleGroupControlOption,
	ToggleGroupControl,
	ToggleGroupControlOption,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";

const SafeToggleGroupControl = ToggleGroupControl || ExperimentalToggleGroupControl;
const SafeToggleGroupControlOption =
	ToggleGroupControlOption || ExperimentalToggleGroupControlOption;

const normalize = (value) => (value === "right" ? "right" : "left");

export function IconPositionToggle({ value, onChange, label }) {
	const resolvedLabel = label || __("Icon Position", "motto-blocks");
	const resolvedValue = normalize(value);

	if (!SafeToggleGroupControl || !SafeToggleGroupControlOption) {
		return (
			<BaseControl label={resolvedLabel}>
				<div className="motto-section-actions">
					<Button
						variant={resolvedValue === "left" ? "primary" : "secondary"}
						isPressed={resolvedValue === "left"}
						className="motto-ui-button"
						onClick={() => onChange("left")}
					>
						{__("Before", "motto-blocks")}
					</Button>
					<Button
						variant={resolvedValue === "right" ? "primary" : "secondary"}
						isPressed={resolvedValue === "right"}
						className="motto-ui-button"
						onClick={() => onChange("right")}
					>
						{__("After", "motto-blocks")}
					</Button>
				</div>
			</BaseControl>
		);
	}

	return (
		<SafeToggleGroupControl
			label={resolvedLabel}
			value={resolvedValue}
			className="motto-toggle-group"
			isBlock
			onChange={(nextValue) => {
				if (nextValue) onChange(normalize(nextValue));
			}}
		>
			<SafeToggleGroupControlOption
				value="left"
				label={__("Before", "motto-blocks")}
				className="motto-ui-button"
			/>
			<SafeToggleGroupControlOption
				value="right"
				label={__("After", "motto-blocks")}
				className="motto-ui-button"
			/>
		</SafeToggleGroupControl>
	);
}
