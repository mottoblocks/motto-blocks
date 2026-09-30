import { useEffect, useRef } from "@wordpress/element";
import { SpacingControl } from "./SpacingControl";
import {
	mergeSpacingPairToCss,
	mergeSpacingPatchToCss,
	parseSpacingPairForControl,
	parseSpacingSidesForControl,
} from "../utils/spacing-value-utils";

const isPairSides = (sides) =>
	Array.isArray(sides) &&
	sides.length === 2 &&
	sides.every((side) => side === "start" || side === "end");

const resolveSides = (config) => {
	if (Array.isArray(config?.sides) && config.sides.length > 0) return config.sides;
	return config?.allowSplit ? ["top", "right", "bottom", "left"] : ["vertical", "horizontal"];
};

export const SpacingMultipleControl = ({
	value,
	onChange,
	config = null,
	spacingSizes = [],
	label = "",
}) => {
	const currentValueRef = useRef(value);
	useEffect(() => {
		currentValueRef.current = value;
	}, [value]);

	const sides = resolveSides(config);
	const isPair = isPairSides(sides);
	const spacingValues = isPair
		? parseSpacingPairForControl(value)
		: parseSpacingSidesForControl(value);

	return (
		<div className="motto-spacing-multiple-control">
			<SpacingControl
				label={label}
				showSideInLabel={false}
				sides={sides}
				axis={config?.axis}
				values={spacingValues}
				spacingSizes={spacingSizes}
				hasAutoValue={Boolean(config?.hasAutoValue)}
				allowNegativeValue={Boolean(config?.allowNegativeValue)}
				initialUnit={String(config?.initialUnit || "").trim()}
				defaultMode={config?.defaultMode === "custom" ? "custom" : "preset"}
				onChange={(patch) => {
					const nextValue = isPair
						? mergeSpacingPairToCss(currentValueRef.current, patch, spacingSizes)
						: mergeSpacingPatchToCss(currentValueRef.current, patch, spacingSizes);
					currentValueRef.current = nextValue;
					onChange(nextValue);
				}}
			/>
		</div>
	);
};
