import { useSettings } from "@wordpress/block-editor";
import {
	ToggleControl,
	__experimentalUseCustomUnits as useCustomUnits,
} from "@wordpress/components";
import { useMemo, useRef, useState } from "@wordpress/element";
import { __, _x, sprintf } from "@wordpress/i18n";
import {
	iconSidesAll,
	iconSidesBottom,
	iconSidesHorizontal,
	iconSidesLeft,
	iconSidesRight,
	iconSidesTop,
	iconSidesVertical,
} from "../utils/core-icon-nodes.jsx";
import { normalizeUnitStep } from "@components/primitives/range-unit-steps.js";
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

const ALL_SIDES = ["top", "right", "bottom", "left"];
const SIDE_ALL = "all";
// Logical start/end pair sides — a single axis split into its two ends.
const PAIR_SIDES = ["start", "end"];
// Every side identity the control can render (used to key per-side view state).
const SIDE_KEYS = [
	"top",
	"right",
	"bottom",
	"left",
	SIDE_ALL,
	"vertical",
	"horizontal",
	"start",
	"end",
];
const DEFAULT_VALUES = { top: undefined, right: undefined, bottom: undefined, left: undefined };
const DEFAULT_UNITS = ["px", "em", "rem", "dvw", "dvh"];
const REQUIRED_UNITS = ["dvw", "dvh"];
const VIEW_AXIAL = "axial";
const VIEW_SIDES = "sides";
const SIDE_LABELS = {
	all: __("All", "motto-blocks"),
	top: __("Top", "motto-blocks"),
	right: __("Right", "motto-blocks"),
	bottom: __("Bottom", "motto-blocks"),
	left: __("Left", "motto-blocks"),
	vertical: __("Vertical", "motto-blocks"),
	horizontal: __("Horizontal", "motto-blocks"),
	start: __("Start", "motto-blocks"),
	end: __("End", "motto-blocks"),
};

const SIDE_ICONS = {
	all: iconSidesAll,
	top: iconSidesTop,
	right: iconSidesRight,
	bottom: iconSidesBottom,
	left: iconSidesLeft,
	vertical: iconSidesVertical,
	horizontal: iconSidesHorizontal,
};

const isPairSides = (sides) =>
	Array.isArray(sides) &&
	sides.length === 2 &&
	sides.every((side) => side === "start" || side === "end");

// Linked start/end pairs collapse to the axial view when both ends match (or are
// empty); a mismatch opens the split view so neither end is silently rewritten.
const getInitialPairView = (values = {}) => {
	const start = String(values?.start ?? "").trim();
	const end = String(values?.end ?? "").trim();
	if (!start && !end) return VIEW_AXIAL;
	return start === end ? VIEW_AXIAL : VIEW_SIDES;
};

const hasAxisSupport = (sides, axis) => {
	if (!Array.isArray(sides) || sides.length === 0) return false;
	const hasHorizontalSupport =
		sides.includes("horizontal") || (sides.includes("left") && sides.includes("right"));
	const hasVerticalSupport =
		sides.includes("vertical") || (sides.includes("top") && sides.includes("bottom"));
	if (axis === "horizontal") return hasHorizontalSupport;
	if (axis === "vertical") return hasVerticalSupport;
	return hasHorizontalSupport || hasVerticalSupport;
};

const hasBalancedSidesSupport = (sides = []) => {
	const counts = { top: 0, right: 0, bottom: 0, left: 0 };
	sides.forEach((side) => {
		if (counts[side] !== undefined) counts[side] += 1;
	});
	return (counts.top + counts.bottom) % 2 === 0 && (counts.left + counts.right) % 2 === 0;
};

const getInitialView = (values = {}, sides) => {
	const { top, right, bottom, left } = values || {};
	const sideValues = [top, right, bottom, left].filter(Boolean);
	const hasMatchingAxialValues = top === bottom && left === right && (!!top || !!left);
	const hasNoValuesAndBalancedSides = sideValues.length === 0 && hasBalancedSidesSupport(sides);
	const hasOnlyAxialSides =
		Array.isArray(sides) &&
		sides.includes("horizontal") &&
		sides.includes("vertical") &&
		sides.length === 2;

	if (hasAxisSupport(sides) && (hasMatchingAxialValues || hasNoValuesAndBalancedSides)) {
		return VIEW_AXIAL;
	}

	if (hasOnlyAxialSides && sideValues.length === 1) {
		let resolvedSide;
		Object.entries(values || {}).some(([key, value]) => {
			resolvedSide = key;
			return value !== undefined;
		});
		return resolvedSide || VIEW_AXIAL;
	}

	if (Array.isArray(sides) && sides.length === 1 && sideValues.length === 0) {
		return sides[0];
	}

	return VIEW_SIDES;
};

const normalizeSides = (sides) => {
	const source = Array.isArray(sides) && sides.length > 0 ? sides : ALL_SIDES;
	return source.filter(
		(side) =>
			side === "horizontal" ||
			side === "vertical" ||
			side === "start" ||
			side === "end" ||
			side === SIDE_ALL ||
			ALL_SIDES.includes(side)
	);
};

const ensureRequiredUnits = (sourceUnits) => {
	const normalizedUnits =
		Array.isArray(sourceUnits) && sourceUnits.length > 0 ? [...sourceUnits] : DEFAULT_UNITS;
	const seen = new Set(
		normalizedUnits
			.map((unit) =>
				String(unit?.value || unit || "")
					.trim()
					.toLowerCase()
			)
			.filter(Boolean)
	);

	REQUIRED_UNITS.forEach((unit) => {
		if (!seen.has(unit)) {
			normalizedUnits.push(unit);
		}
	});

	return normalizedUnits;
};

// Representative value for a control side, mapping axial/all rows onto the
// underlying top/left keys just like the render pass does.
const getSideValue = (values, side) => {
	if (side === SIDE_ALL) {
		return values?.all ?? values?.top ?? values?.right ?? values?.bottom ?? values?.left ?? "";
	}
	if (side === "vertical") return values?.top ?? "";
	if (side === "horizontal") return values?.left ?? "";
	return values?.[side] ?? "";
};

const buildAriaLabel = (side, typeLabel, showSideInLabel) => {
	const sideLabel = showSideInLabel ? SIDE_LABELS[side] || "" : "";
	const type = showSideInLabel ? String(typeLabel || "").toLowerCase() : String(typeLabel || "");
	return sprintf(_x("%1$s %2$s", "spacing", "motto-blocks"), sideLabel, type).trim();
};

export const SpacingControl = ({
	inputProps,
	label = "",
	minimumCustomValue = 0,
	onChange,
	onMouseOut,
	onMouseOver,
	showSideInLabel = true,
	sides = ALL_SIDES,
	axis,
	values,
	spacingSizes = [],
	hasAutoValue = false,
	allowNegativeValue = false,
	units,
	initialUnit = "",
	iconSide,
	allowLinkedSides = true,
	defaultMode = "preset",
}) => {
	const [availableUnits] = useSettings("spacing.units");
	const availableSpacingUnits = useMemo(
		() =>
			ensureRequiredUnits(Array.isArray(units) && units.length > 0 ? units : availableUnits),
		[availableUnits, units]
	);
	const resolvedUnits = useCustomUnits({
		availableUnits: availableSpacingUnits,
	});

	const normalizedSides = normalizeSides(sides);
	const inputValues = useMemo(
		() => ({ ...DEFAULT_VALUES, ...(values && typeof values === "object" ? values : {}) }),
		[values]
	);
	const presetSizes = buildSpacingSizes(spacingSizes);
	// A preset UI only makes sense when there is more than the implicit "none" entry.
	const hasPresets = presetSizes.length > 1;
	const hasOneSide = normalizedSides.length === 1;
	const hasOnlyAxialSides =
		normalizedSides.includes("horizontal") &&
		normalizedSides.includes("vertical") &&
		normalizedSides.length === 2;
	const isPair = isPairSides(normalizedSides);
	// A logical pair collapses to one control whose glyph names the axis.
	const pairAxisSide = axis === "inline" ? "horizontal" : "vertical";

	const [view, setView] = useState(() => {
		if (hasOneSide) return normalizedSides[0];
		if (isPair) return getInitialPairView(inputValues);
		if (hasOnlyAxialSides) return VIEW_AXIAL;
		if (!allowLinkedSides) return VIEW_SIDES;
		return getInitialView(inputValues, normalizedSides);
	});

	const [modeBySide, setModeBySide] = useSlotValueMode(
		SIDE_KEYS,
		inputValues,
		getSideValue,
		defaultMode
	);
	// Ephemeral, popup-lifetime-only memory of the last value seen per mode per
	// side — never written to the block attribute. Lets switching preset/custom/
	// css show what was last there instead of a resolved placeholder or blank
	// editor; gone as soon as this control unmounts (popup closes).
	const [memoryBySide, setMemoryBySide] = useState({});

	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;
	// Remembers the last non-auto value per side so turning "auto" off can restore it.
	const lastNonAutoRef = useRef({});

	// Base unit options from WP settings — MottoUnitControl appends the CSS unit.
	const unitOptions = (Array.isArray(resolvedUnits) ? resolvedUnits : [])
		.map((unit) => {
			const rawValue = String(unit?.value || unit || "").trim();
			const value = rawValue.toLowerCase();
			if (!value) return null;
			return {
				value,
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

	const emitSidePatch = (targetSides, fallbackSide, nextValue) => {
		const patch = {};
		const targets = Array.isArray(targetSides) ? targetSides : [fallbackSide];
		targets.forEach((target) => {
			patch[target] = nextValue;
		});
		onChangeRef.current?.(patch);
	};

	const handleSideFocus = () => onMouseOver?.();
	const handleSideBlur = () => onMouseOut?.();

	const renderSideControl = (side, value, targetSides = [side], iconKey = side) => {
		const rawSideValue = String(value === undefined || value === null ? "" : value).trim();
		const emit = (nextValue) => {
			const trimmedNext = String(nextValue ?? "").trim();
			setMemoryBySide((prev) => {
				if (!trimmedNext) return clearSlotMemory(prev, side);
				// Capture the value about to be replaced (under its own kind) before
				// overwriting it, so switching back to that mode later — even without
				// ever having explicitly edited it — restores it instead of falling
				// through to a resolved/blank placeholder.
				return writeSlotMemory(
					writeSlotMemory(prev, side, rawSideValue),
					side,
					trimmedNext
				);
			});
			emitSidePatch(targetSides, side, nextValue);
		};

		const isAuto = hasAutoValue && rawSideValue === "auto";
		if (!isAuto && rawSideValue) lastNonAutoRef.current[side] = rawSideValue;

		// Preset editor is only available when there are presets to show; otherwise
		// force whichever non-preset mode the value actually detected as (custom or css).
		const mode =
			!hasPresets && modeBySide[side] === MODE_PRESET ? MODE_CUSTOM : modeBySide[side];
		const displayValue = readSlotMemory(
			memoryBySide,
			side,
			mode,
			resolveDisplayFallback(mode, rawSideValue)
		);
		const ariaLabel = buildAriaLabel(side, label, showSideInLabel);
		const singleSideIconKey =
			normalizedSides.length === 1 && typeof iconSide === "string"
				? iconSide.trim().toLowerCase()
				: String(iconKey || side || "")
						.trim()
						.toLowerCase();
		const SideIcon =
			singleSideIconKey === "none" ? null : SIDE_ICONS[singleSideIconKey] || null;

		const rowContent = (
			<PresetValueRow
				icon={SideIcon}
				ariaLabel={ariaLabel}
				rawValue={displayValue}
				mode={mode}
				hasPresets={hasPresets}
				isAuto={isAuto}
				unitOptions={unitOptions}
				spacingSizes={spacingSizes}
				presetSizes={presetSizes}
				presetMarks={presetMarks}
				minimumCustomValue={minimumCustomValue}
				allowNegativeValue={allowNegativeValue}
				normalizedInitialUnit={normalizedInitialUnit}
				inputProps={inputProps}
				onMouseOver={onMouseOver}
				onMouseOut={onMouseOut}
				onFocus={handleSideFocus}
				onBlur={handleSideBlur}
				onChange={emit}
				onModeChange={(nextMode) =>
					setModeBySide((prev) => ({ ...prev, [side]: nextMode }))
				}
				onToggleCustom={() =>
					setModeBySide((prev) => ({
						...prev,
						[side]: mode === MODE_PRESET ? MODE_CUSTOM : MODE_PRESET,
					}))
				}
			/>
		);

		return (
			<div
				key={`motto-spacing-${side}`}
				className={`motto-spacing-sizes-control__wrapper${hasAutoValue ? " motto-flex-col" : " motto-flex align-center"} gap-md`}
			>
				{hasAutoValue ? (
					<>
						<div className="motto-flex align-center gap-md">{rowContent}</div>
						<ToggleControl
							__nextHasNoMarginBottom
							label={__("Auto", "motto-blocks")}
							checked={isAuto}
							onChange={(next) => {
								if (next) {
									emit("auto");
									return;
								}
								emit(lastNonAutoRef.current[side] ?? "");
							}}
						/>
					</>
				) : (
					rowContent
				)}
			</div>
		);
	};

	let renderControls;
	if (isPair) {
		// Split view highlights the axis-appropriate physical edge: block →
		// top/bottom, inline → left/right (start before end in LTR).
		const pairIconKeys =
			axis === "inline" ? { start: "left", end: "right" } : { start: "top", end: "bottom" };
		renderControls =
			view === VIEW_AXIAL
				? renderSideControl(
						pairAxisSide,
						inputValues.start ?? inputValues.end ?? "",
						PAIR_SIDES
					)
				: PAIR_SIDES.map((side) =>
						renderSideControl(side, inputValues[side], [side], pairIconKeys[side])
					);
	} else if (view === VIEW_AXIAL) {
		const supportsVertical =
			normalizedSides.includes("vertical") ||
			(normalizedSides.includes("top") && normalizedSides.includes("bottom"));
		const supportsHorizontal =
			normalizedSides.includes("horizontal") ||
			(normalizedSides.includes("left") && normalizedSides.includes("right"));
		renderControls = (
			<>
				{supportsVertical
					? renderSideControl("vertical", inputValues.top, ["top", "bottom"])
					: null}
				{supportsHorizontal
					? renderSideControl("horizontal", inputValues.left, ["left", "right"])
					: null}
			</>
		);
	} else if (view === SIDE_ALL) {
		const allValue =
			inputValues.all ??
			inputValues.top ??
			inputValues.right ??
			inputValues.bottom ??
			inputValues.left ??
			"";
		renderControls = renderSideControl(SIDE_ALL, allValue, [SIDE_ALL]);
	} else if (view === VIEW_SIDES) {
		renderControls = (
			<>
				{ALL_SIDES.filter((side) => normalizedSides.includes(side)).map((side) =>
					renderSideControl(side, inputValues[side])
				)}
			</>
		);
	} else {
		renderControls = renderSideControl(view, inputValues[view]);
	}

	const sideLabel =
		showSideInLabel && (ALL_SIDES.includes(view) || view === SIDE_ALL)
			? SIDE_LABELS[view] || ""
			: "";
	const visualLabel = sprintf(
		_x("%1$s %2$s", "spacing", "motto-blocks"),
		String(label || "").trim(),
		sideLabel
	).trim();

	return (
		<fieldset className="motto-spacing-sizes-control">
			{visualLabel ? (
				<div className="motto-spacing-sizes-control__header">
					<legend className="motto-label">{visualLabel}</legend>
					{allowLinkedSides && !hasOneSide && !hasOnlyAxialSides ? (
						<LinkToggleButton
							isLinked={view === VIEW_AXIAL}
							linkedLabel={__("Link sides", "motto-blocks")}
							unlinkedLabel={__("Unlink sides", "motto-blocks")}
							className="motto-spacing-sizes-control__link-toggle"
							onClick={() => setView(view === VIEW_AXIAL ? VIEW_SIDES : VIEW_AXIAL)}
						/>
					) : null}
				</div>
			) : null}
			<div className="motto-spacing-sizes-control__body motto-flex-rows">
				{renderControls}
			</div>
		</fieldset>
	);
};
