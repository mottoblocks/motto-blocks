import { useSettings } from "@wordpress/block-editor";
import { __experimentalUseCustomUnits as useCustomUnits } from "@wordpress/components";
import { useMemo, useRef, useState } from "@wordpress/element";
import { __, _x, sprintf } from "@wordpress/i18n";
import {
	iconCornersAll,
	iconCornerTopLeft,
	iconCornerTopRight,
	iconCornerBottomRight,
	iconCornerBottomLeft,
} from "../utils/core-icon-nodes.jsx";
import { normalizeUnitStep } from "@components/primitives/range-unit-steps.js";
import {
	BORDER_RADIUS_VIEW_ALL as VIEW_ALL,
	BORDER_RADIUS_VIEW_CUSTOM as VIEW_CUSTOM,
	buildBorderRadiusValue as buildRadiusValue,
	getBorderRadiusInitialView as getInitialView,
	parseBorderRadiusValue as parseRadiusValue,
} from "../utils/border-radius-value-utils.js";
import { toSpacingCssValue } from "../utils/spacing-value-utils";
import { buildSpacingSizes } from "../utils/spacing-sizes-utils";
import { MODE_CUSTOM, MODE_PRESET, useSlotValueMode } from "../hooks/use-slot-value-mode.js";
import {
	clearSlotMemory,
	readSlotMemory,
	resolveDisplayFallback,
	writeSlotMemory,
} from "../utils/value-mode.js";
import { PresetValueRow } from "./PresetValueRow.jsx";
import { LinkToggleButton } from "./LinkToggleButton.jsx";

const ALL_CORNERS = ["topLeft", "topRight", "bottomRight", "bottomLeft"];
// Every corner identity the control can render (keys the per-corner view state).
const CORNER_KEYS = [...ALL_CORNERS, VIEW_ALL];
const DEFAULT_UNITS = ["px", "em", "rem", "%", "dvw", "dvh"];
const VIEW_CORNERS = VIEW_CUSTOM; // All corners vs individual corners

const CORNER_LABELS = {
	all: __("All corners", "motto-blocks"),
	topLeft: __("Top Left", "motto-blocks"),
	topRight: __("Top Right", "motto-blocks"),
	bottomRight: __("Bottom Right", "motto-blocks"),
	bottomLeft: __("Bottom Left", "motto-blocks"),
};

const CORNER_ICONS = {
	all: iconCornersAll,
	topLeft: iconCornerTopLeft,
	topRight: iconCornerTopRight,
	bottomRight: iconCornerBottomRight,
	bottomLeft: iconCornerBottomLeft,
};

// Representative value for a corner; the "all" row maps onto the first set corner.
const getCornerValue = (parsed, corner) => {
	if (corner === VIEW_ALL) {
		return (
			parsed?.topLeft || parsed?.topRight || parsed?.bottomRight || parsed?.bottomLeft || ""
		);
	}
	return parsed?.[corner] ?? "";
};

const buildAriaLabel = (corner, typeLabel) => {
	const cornerLabel = CORNER_LABELS[corner] || "";
	const type = String(typeLabel || "");
	return sprintf(_x("%1$s %2$s", "border radius", "motto-blocks"), cornerLabel, type).trim();
};

export const BorderRadiusControl = ({
	value,
	onChange,
	label = "",
	units,
	initialUnit = "",
	spacingSizes = [],
	onMouseOver,
	onMouseOut,
	defaultMode = "preset",
}) => {
	const [availableUnits] = useSettings("spacing.units");
	const resolvedUnits = useCustomUnits({
		availableUnits:
			Array.isArray(units) && units.length > 0 ? units : availableUnits || DEFAULT_UNITS,
	});

	const parsedValues = useMemo(() => parseRadiusValue(value), [value]);
	const presetSizes = buildSpacingSizes(spacingSizes);
	const hasPresets = presetSizes.length > 1;

	const [view, setView] = useState(() => getInitialView(value));

	const [modeByCorner, setModeByCorner] = useSlotValueMode(
		CORNER_KEYS,
		parsedValues,
		getCornerValue,
		defaultMode
	);
	// Ephemeral, popup-lifetime-only memory of the last value seen per mode per
	// corner — never written to the block attribute. See SpacingControl for the
	// full rationale; identical contract, shared via value-mode.js.
	const [memoryByCorner, setMemoryByCorner] = useState({});

	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;

	const unitOptions = (Array.isArray(resolvedUnits) ? resolvedUnits : [])
		.map((unit) => {
			const rawValue = String(unit?.value || unit || "").trim();
			const parsedUnit = rawValue.toLowerCase();
			if (!parsedUnit) return null;
			return {
				value: parsedUnit,
				label: String(unit?.label || rawValue),
				default: Boolean(unit?.default),
				step: normalizeUnitStep(unit?.step),
			};
		})
		.filter(Boolean);

	const normalizedInitialUnit = (() => {
		const raw = String(initialUnit || "")
			.trim()
			.toLowerCase();
		if (!raw) return "";
		return unitOptions.some((option) => option.value === raw) ? raw : "";
	})();

	const presetMarks = presetSizes.slice(1, presetSizes.length - 1).map((_, idx) => ({
		value: idx + 1,
		label: undefined,
	}));

	// Merge a per-corner patch into the current value and emit the CSS shorthand.
	const emitCornerPatch = (targetCorners, nextValue) => {
		const merged = { ...parsedValues };
		targetCorners.forEach((corner) => {
			merged[corner] = nextValue;
		});
		const cssNext = {};
		ALL_CORNERS.forEach((corner) => {
			cssNext[corner] = toSpacingCssValue(merged[corner] || "", spacingSizes) || "0";
		});
		onChangeRef.current?.(buildRadiusValue(cssNext));
	};

	const handleCornerFocus = () => onMouseOver?.();
	const handleCornerBlur = () => onMouseOut?.();

	const renderCornerControl = (corner, rawValue, targetCorners = [corner]) => {
		const rawCornerValue = String(
			rawValue === undefined || rawValue === null ? "" : rawValue
		).trim();
		const emit = (nextValue) => {
			const trimmedNext = String(nextValue ?? "").trim();
			setMemoryByCorner((prev) => {
				if (!trimmedNext) return clearSlotMemory(prev, corner);
				return writeSlotMemory(
					writeSlotMemory(prev, corner, rawCornerValue),
					corner,
					trimmedNext
				);
			});
			emitCornerPatch(targetCorners, nextValue);
		};
		const mode =
			!hasPresets && modeByCorner[corner] === MODE_PRESET
				? MODE_CUSTOM
				: modeByCorner[corner];
		const displayValue = readSlotMemory(
			memoryByCorner,
			corner,
			mode,
			resolveDisplayFallback(mode, rawCornerValue)
		);
		const ariaLabel = buildAriaLabel(corner, label || __("Border Radius", "motto-blocks"));
		const cornerIcon = CORNER_ICONS[corner] || null;

		return (
			<div
				key={`motto-border-radius-${corner}`}
				className="motto-spacing-sizes-control__wrapper motto-flex align-center gap-md"
			>
				<PresetValueRow
					icon={cornerIcon}
					ariaLabel={ariaLabel}
					rawValue={displayValue}
					mode={mode}
					hasPresets={hasPresets}
					unitOptions={unitOptions}
					spacingSizes={spacingSizes}
					presetSizes={presetSizes}
					presetMarks={presetMarks}
					minimumCustomValue={0}
					normalizedInitialUnit={normalizedInitialUnit}
					onMouseOver={onMouseOver}
					onMouseOut={onMouseOut}
					onFocus={handleCornerFocus}
					onBlur={handleCornerBlur}
					onChange={emit}
					onModeChange={(nextMode) =>
						setModeByCorner((prev) => ({ ...prev, [corner]: nextMode }))
					}
					onToggleCustom={() =>
						setModeByCorner((prev) => ({
							...prev,
							[corner]: mode === MODE_PRESET ? MODE_CUSTOM : MODE_PRESET,
						}))
					}
				/>
			</div>
		);
	};

	let renderControls;
	if (view === VIEW_ALL) {
		const allValue = getCornerValue(parsedValues, VIEW_ALL);
		renderControls = renderCornerControl(VIEW_ALL, allValue, ALL_CORNERS);
	} else {
		renderControls = ALL_CORNERS.map((corner) =>
			renderCornerControl(corner, parsedValues[corner])
		);
	}

	return (
		<fieldset className="motto-border-radius-control motto-spacing-sizes-control">
			<div className="motto-border-radius-control__header motto-spacing-sizes-control__header">
				<legend className="motto-label">
					{label || __("Border Radius", "motto-blocks")}
				</legend>
				<LinkToggleButton
					isLinked={view === VIEW_ALL}
					linkedLabel={__("Link corners", "motto-blocks")}
					unlinkedLabel={__("Unlink corners", "motto-blocks")}
					className="motto-border-radius-control__link-toggle"
					onClick={() => {
						if (view === VIEW_ALL) {
							setView(VIEW_CORNERS);
							return;
						}
						emitCornerPatch(ALL_CORNERS, getCornerValue(parsedValues, VIEW_ALL));
						setView(VIEW_ALL);
					}}
				/>
			</div>
			<div className="motto-border-radius-control__body motto-spacing-sizes-control__body motto-flex-rows">
				{renderControls}
			</div>
		</fieldset>
	);
};
