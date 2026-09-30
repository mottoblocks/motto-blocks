import { SpacingControl } from "./SpacingControl";
import { toSpacingControlToken, toSpacingCssValue } from "../utils/spacing-value-utils";

const SIDE_NONE = "none";
const SIDE_ALL = "all";
const VALID_SIDES = ["top", "right", "bottom", "left", "none"];

export const SpacingSingleControl = ({
	value,
	onChange,
	hasAutoValue = false,
	allowNegativeValue = false,
	label = "",
	side = SIDE_NONE,
	spacingSizes = [],
	initialUnit = "",
	defaultMode = "preset",
}) => {
	const sideRaw = String(side || "")
		.trim()
		.toLowerCase();
	const normalizedSide = VALID_SIDES.includes(sideRaw) ? sideRaw : SIDE_NONE;
	const controlSide = normalizedSide === SIDE_NONE ? SIDE_ALL : normalizedSide;
	const controlLabel = String(label || "").trim();
	const normalizedValue = toSpacingControlToken(value);

	return (
		<div
			className={`motto-spacing-single-control${normalizedSide === SIDE_NONE ? " is-side-none" : ""}`}
		>
			<SpacingControl
				key={`motto-${controlSide}`}
				label={controlLabel}
				showSideInLabel={false}
				sides={[controlSide]}
				iconSide={normalizedSide}
				values={{ [controlSide]: normalizedValue }}
				spacingSizes={spacingSizes}
				initialUnit={initialUnit}
				defaultMode={defaultMode}
				hasAutoValue={hasAutoValue}
				allowNegativeValue={allowNegativeValue}
				onChange={(next) => {
					onChange(toSpacingCssValue(next?.[controlSide] ?? "", spacingSizes));
				}}
			/>
		</div>
	);
};
