import { AlignmentMatrixControl, BaseControl } from "@wordpress/components";

export const NINE_POINT_POSITIONS = [
	"top-left",
	"top-center",
	"top-right",
	"center-left",
	"center-center",
	"center-right",
	"bottom-left",
	"bottom-center",
	"bottom-right",
];

export const ALIGNMENT_MATRIX_TO_NINE_POINT_POSITION = {
	"top left": "top-left",
	"top center": "top-center",
	"top right": "top-right",
	"center left": "center-left",
	"center center": "center-center",
	"center right": "center-right",
	"bottom left": "bottom-left",
	"bottom center": "bottom-center",
	"bottom right": "bottom-right",
};

export const NINE_POINT_POSITION_TO_ALIGNMENT_MATRIX = {
	"top-left": "top left",
	"top-center": "top center",
	"top-right": "top right",
	"center-left": "center left",
	"center-center": "center center",
	"center-right": "center right",
	"bottom-left": "bottom left",
	"bottom-center": "bottom center",
	"bottom-right": "bottom right",
};

export function normalizeNinePointPosition(value, fallback = "center-center") {
	return NINE_POINT_POSITIONS.includes(value) ? value : fallback;
}

export function alignmentMatrixValueToNinePointPosition(value, fallback = "center-center") {
	const normalizedFallback = normalizeNinePointPosition(fallback);
	return ALIGNMENT_MATRIX_TO_NINE_POINT_POSITION[value] || normalizedFallback;
}

export function ninePointPositionToAlignmentMatrixValue(value, fallback = "center-center") {
	const normalizedValue = normalizeNinePointPosition(value, fallback);
	const normalizedFallback = normalizeNinePointPosition(fallback);

	return (
		NINE_POINT_POSITION_TO_ALIGNMENT_MATRIX[normalizedValue] ||
		NINE_POINT_POSITION_TO_ALIGNMENT_MATRIX[normalizedFallback]
	);
}

export function AlignmentMatrixPositionControl({
	label,
	value,
	onChange,
	fallback = "center-center",
}) {
	return (
		<div className="motto-alignment-matrix-position-control">
			<BaseControl label={label}>
				<AlignmentMatrixControl
					value={ninePointPositionToAlignmentMatrixValue(value, fallback)}
					onChange={(nextValue) => {
						if (nextValue && typeof onChange === "function") {
							onChange(alignmentMatrixValueToNinePointPosition(nextValue, fallback));
						}
					}}
				/>
			</BaseControl>
		</div>
	);
}
