import { useMemo, useRef, useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { MottoNumberControl } from "@components";
import {
	SCALE_VIEW_LINKED as VIEW_LINKED,
	SCALE_VIEW_SPLIT as VIEW_SPLIT,
	buildScaleValue,
	getScaleInitialView,
	parseScaleValue,
} from "../utils/scale-value-utils.js";
import { LinkToggleButton } from "./LinkToggleButton.jsx";

const AXES = ["x", "y"];

const AXIS_LABELS = {
	x: __("Scale X", "motto-blocks"),
	y: __("Scale Y", "motto-blocks"),
};

export const ScaleControl = ({ value, onChange, label = "", min = -10, max = 10, step = 0.01 }) => {
	const parsedValues = useMemo(() => parseScaleValue(value), [value]);
	const [view, setView] = useState(() => getScaleInitialView(value));

	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;

	const emitScalePatch = (targetAxes, nextValue) => {
		const merged = { ...parsedValues };
		targetAxes.forEach((axis) => {
			merged[axis] = nextValue;
		});
		onChangeRef.current?.(buildScaleValue(merged));
	};

	const renderAxisControl = (key, rawValue, targetAxes) => (
		<div
			className="motto-scale-control__field motto-flex-col flex-1 gap-xs"
			key={`motto-scale-${key}`}
		>
			{view === VIEW_SPLIT ? <span className="motto-label">{AXIS_LABELS[key]}</span> : null}
			<MottoNumberControl
				value={rawValue || ""}
				onChange={(nextValue) => emitScalePatch(targetAxes, nextValue)}
				min={min}
				max={max}
				step={step}
				showSlider
			/>
		</div>
	);

	const renderControls =
		view === VIEW_LINKED
			? renderAxisControl("all", parsedValues.x, AXES)
			: AXES.map((axis) => renderAxisControl(axis, parsedValues[axis], [axis]));

	return (
		<fieldset className="motto-scale-control motto-spacing-sizes-control">
			<div className="motto-scale-control__header motto-spacing-sizes-control__header">
				<legend className="motto-label">{label || __("Scale", "motto-blocks")}</legend>
				<LinkToggleButton
					isLinked={view === VIEW_LINKED}
					linkedLabel={__("Link X/Y", "motto-blocks")}
					unlinkedLabel={__("Unlink X/Y", "motto-blocks")}
					className="motto-scale-control__link-toggle"
					onClick={() => {
						if (view === VIEW_LINKED) {
							setView(VIEW_SPLIT);
							return;
						}
						emitScalePatch(AXES, parsedValues.x || "1");
						setView(VIEW_LINKED);
					}}
				/>
			</div>
			<div className="motto-scale-control__body motto-grid gap-sm align-end">
				{renderControls}
			</div>
		</fieldset>
	);
};
