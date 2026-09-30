/**
 * MottoUnitControl
 *
 * Drop-in replacement for WP's __experimentalUnitControl that adds:
 * - Sensible default unit set (px | em | rem | % | vw | vh)
 * - "CSS" as the last unit option (always)
 * - When CSS mode is active, the inline area shows a read-only overlay; clicking it
 *   opens a popup with a draft RawControl clone (free-form CSS with autocomplete) that
 *   only commits on Confirm — closing without confirming discards the draft
 * - Per-instance state: localUnit, lastCssValue, lastNonCssValue
 *
 * API is intentionally close to UnitControl so callers can switch easily.
 * Extra props:
 *   variableSuggestions  {Array<{label,value,meta}>}  CSS custom-prop list override
 *   onUnitChange         fires for ALL unit changes, including "css"
 */
import { __experimentalUnitControl as UnitControl, Button, Popover } from "@wordpress/components";
import { createPortal, useEffect, useMemo, useRef, useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { Check } from "lucide-react";
import {
	CSS_UNIT,
	VAR_UNIT,
	ensureVarUnitLast,
	getCompatibleExitVarValue,
	isCssExpressionValue,
	isCssKeywordValue,
} from "../../primitives/var-unit-utils.js";

const isCssLike = (v) => isCssExpressionValue(v) || isCssKeywordValue(v);
import { RawControl } from "../RawControl.jsx";
import { withMottoPopupClass } from "../../ui/popup-class-name.js";

export const MOTTO_DEFAULT_UNITS = [
	{ value: "px", label: "px" },
	{ value: "em", label: "em" },
	{ value: "rem", label: "rem" },
	{ value: "%", label: "%" },
	{ value: "vw", label: "vw" },
	{ value: "vh", label: "vh" },
	{ value: "dvw", label: "dvw" },
	{ value: "dvh", label: "dvh" },
];

const normalizeUnitOption = (unit) => {
	if (!unit || typeof unit !== "object") return unit;
	const value = String(unit.value ?? "");
	if (value !== "") return unit;
	return {
		...unit,
		label: String(unit.label ?? "").trim() || "N",
	};
};

const isSelectAllShortcut = (event) =>
	(event.metaKey || event.ctrlKey) && String(event.key || "").toLowerCase() === "a";

const isEditableTarget = (target) => {
	if (!target) return false;
	if (target.isContentEditable) return true;
	const tagName = String(target.tagName || "").toLowerCase();
	return tagName === "input" || tagName === "textarea";
};

export const MottoUnitControl = ({
	value,
	units,
	onChange,
	onUnitChange,
	emitOnUnitChange = true,
	enableVarUnit = true,
	disabled,
	...rest
}) => {
	const rawValue = String(value ?? "");

	const resolvedUnits = useMemo(() => {
		const base = Array.isArray(units) && units.length > 0 ? units : MOTTO_DEFAULT_UNITS;
		const normalizedBase = base.map(normalizeUnitOption);
		return enableVarUnit ? ensureVarUnitLast(normalizedBase) : normalizedBase;
	}, [units, enableVarUnit]);

	// localUnit is only set when we need to override WP UnitControl's derived unit:
	// - CSS_UNIT when CSS mode is active
	// - undefined otherwise (let WP derive from value)
	const [localUnit, setLocalUnit] = useState(() => (isCssLike(rawValue) ? CSS_UNIT : undefined));
	// Temporary non-css display value used right after leaving CSS mode while the
	// parent-controlled value is still catching up.
	const [displayValueOverride, setDisplayValueOverride] = useState(null);
	const lastCssValueRef = useRef(isCssLike(rawValue) ? rawValue : "");
	// Stores the last clean (non-css) value so we can restore it when leaving CSS mode.
	const lastNonCssValueRef = useRef(isCssLike(rawValue) ? "" : rawValue);
	// Ref copy of isCssMode: updated synchronously in handleUnitChange so the
	// onChange guard doesn't miss the WP-internal call that fires during the same event.
	const isCssModeRef = useRef(isCssLike(rawValue));
	// When leaving CSS mode, WP UnitControl may emit one stale echo. Ignore it.
	const exitingCssValueRef = useRef("");
	const wrapRef = useRef(null);
	const [inputContainerEl, setInputContainerEl] = useState(null);
	// Popup editor for CSS-mode: the inline area shows a read-only overlay;
	// editing happens in a Popover on a local draft, committed only on Confirm.
	const overlayButtonRef = useRef(null);
	const [isPopupOpen, setIsPopupOpen] = useState(false);
	const [draftValue, setDraftValue] = useState("");

	const isCssMode = enableVarUnit && localUnit === CSS_UNIT;

	const handleKeyDownCapture = (event) => {
		if (!isSelectAllShortcut(event)) return;
		if (!isEditableTarget(event.target)) return;
		event.stopPropagation();
	};

	// Sync when an external change (undo/redo, device switch) produces a CSS expression
	// while our local state hasn't caught up yet.
	useEffect(() => {
		const current = String(value ?? "");
		if (!isCssLike(current) && current !== "") {
			lastNonCssValueRef.current = current;
		}
		if (displayValueOverride !== null) {
			setDisplayValueOverride(null);
		}
		if (exitingCssValueRef.current && !isCssLike(current) && current !== "") {
			exitingCssValueRef.current = "";
		}
		if (isCssLike(current) && localUnit !== CSS_UNIT && !exitingCssValueRef.current) {
			lastCssValueRef.current = current;
			setLocalUnit(CSS_UNIT);
		}
	}, [value]); // eslint-disable-line react-hooks/exhaustive-deps

	const handleUnitChange = (nextUnit) => {
		const u = String(nextUnit || "")
			.trim()
			.toLowerCase();
		// Normalize legacy "var" unit selections to CSS_UNIT
		const normalizedUnit = u === VAR_UNIT ? CSS_UNIT : u;

		if (normalizedUnit === CSS_UNIT) {
			const currentCleanValue =
				displayValueOverride !== null ? displayValueOverride : rawValue;
			// A bare unit with no digits (e.g. "px") isn't a value — it's what WP
			// UnitControl echoes back when the numeric field is empty and a unit is
			// merely selected. Parsing custom found nothing there, so CSS mode must
			// not inherit it either; treat it the same as a genuinely empty value.
			const isBareUnitArtifact = /^[a-z%]+$/i.test(currentCleanValue);
			if (!isCssExpressionValue(currentCleanValue) && !isBareUnitArtifact) {
				lastNonCssValueRef.current = currentCleanValue;
				// Seed the raw textarea with the current value so entering CSS mode
				// starts from something editable/extendable (e.g. "1.5rem" the user
				// can turn into calc(1.5rem + 10px)) instead of an empty field. Only
				// when there's no css value already remembered, so toggling back and
				// forth doesn't clobber something the user already typed.
				if (!lastCssValueRef.current) lastCssValueRef.current = currentCleanValue;
			}
			isCssModeRef.current = true;
			setLocalUnit(CSS_UNIT);
			setDisplayValueOverride(null);
			// Restore the last CSS value immediately so the parent is up to date.
			if (emitOnUnitChange && lastCssValueRef.current) onChange?.(lastCssValueRef.current);
		} else {
			const wasCss = localUnit === CSS_UNIT;
			if (wasCss && isCssExpressionValue(rawValue)) {
				exitingCssValueRef.current = rawValue;
			}
			isCssModeRef.current = false;
			setLocalUnit(undefined);
			const restoreValue = wasCss
				? getCompatibleExitVarValue({
						selectedUnit: normalizedUnit,
						lastNonVarValue: lastNonCssValueRef.current,
						lastVarValue: lastCssValueRef.current,
					})
				: "";
			setDisplayValueOverride(wasCss ? restoreValue : null);
			if (emitOnUnitChange && wasCss) {
				onChange?.(restoreValue);
			}
		}
		onUnitChange?.(normalizedUnit);
	};

	// Close on click outside (for the RawControl autocomplete)
	// handled internally by RawControl's AutocompleteList

	// Synthetic value: "1css" forces WP UnitControl to display "CSS" in its unit select
	// while our RawControl overlay covers the number input.
	const effectiveRawValue = displayValueOverride !== null ? displayValueOverride : rawValue;
	const unitControlValue = isCssMode ? `1${CSS_UNIT}` : effectiveRawValue;

	useEffect(() => {
		const nextContainer =
			wrapRef.current?.querySelector(".components-input-control__container") || null;
		setInputContainerEl((current) => (current === nextContainer ? current : nextContainer));
	}, [isCssMode, unitControlValue]);

	// Close the popup (without committing) when CSS mode is left some other way.
	useEffect(() => {
		if (!isCssMode) setIsPopupOpen(false);
	}, [isCssMode]);

	const cssDisplayValue = isCssLike(rawValue) ? rawValue : lastCssValueRef.current;

	const openCssPopup = () => {
		if (disabled) return;
		setDraftValue(cssDisplayValue);
		setIsPopupOpen(true);
	};

	const discardCssPopup = () => setIsPopupOpen(false);

	const confirmCssPopup = () => {
		lastCssValueRef.current = draftValue;
		setIsPopupOpen(false);
		onChange?.(draftValue);
	};

	const handlePopupInputKeyDown = (event) => {
		if (event.key !== "Escape") return;
		event.stopPropagation();
		discardCssPopup();
	};

	// In numeric mode, stop a typed unit character from landing in the type="number"
	// input — that leaves its internal state dirty/empty and, because the numeric
	// quantity is unchanged across a unit switch (e.g. 99px → 99em), WP never
	// re-syncs it, so the field stays visually blank. Mirror core: move focus to the
	// unit <select> before the character enters, letting its native typeahead resolve
	// the unit (including multi-char units like "rem"). Disabled in CSS mode, where
	// the field is a free-form textarea and letters are valid input.
	const handleNumericKeyDown = (event) => {
		rest.onKeyDown?.(event);
		if (isCssMode) return;
		const key = event.key;
		if (!key || key.length !== 1 || !/[a-z%]/i.test(key)) return;
		const select = wrapRef.current?.querySelector("select");
		if (select && document.activeElement !== select) {
			select.focus();
		}
	};

	return (
		<div
			ref={wrapRef}
			className={`motto-unit-control${isCssMode ? " is-css-mode" : ""}`}
			onKeyDownCapture={handleKeyDownCapture}
		>
			<UnitControl
				{...rest}
				value={unitControlValue}
				units={resolvedUnits}
				onKeyDown={handleNumericKeyDown}
				onUnitChange={handleUnitChange}
				onChange={(nextValue) => {
					if (isCssModeRef.current) return;
					const v = String(nextValue ?? "");
					const exitingCssValue = exitingCssValueRef.current;
					if (exitingCssValue) {
						const lastP = v.lastIndexOf(")");
						const cleanedEcho =
							lastP >= 0 && lastP < v.length - 1 ? v.slice(0, lastP + 1) : v;
						if (v === exitingCssValue || cleanedEcho === exitingCssValue) {
							return;
						}
						exitingCssValueRef.current = "";
					}
					// Hard guard: never emit a malformed css-unit value
					if (/^\d*\.?\d*css$/i.test(v) && !isCssExpressionValue(v)) return;
					// Auto-enter CSS mode when a CSS expression is typed into the numeric field
					const lastP = v.lastIndexOf(")");
					if (lastP >= 0 && lastP < v.length - 1) {
						const after = v.slice(lastP + 1).trim();
						if (
							/^(px|em|rem|%|vw|vh|vmin|vmax|ch|ex|cm|mm|in|pt|pc|fr)$/i.test(after)
						) {
							const cleaned = v.slice(0, lastP + 1);
							if (isCssExpressionValue(cleaned)) {
								lastNonCssValueRef.current = "";
								lastCssValueRef.current = cleaned;
								isCssModeRef.current = true;
								setLocalUnit(CSS_UNIT);
								onChange?.(cleaned);
								onUnitChange?.(CSS_UNIT);
								return;
							}
						}
					}
					onChange?.(v);
				}}
				disabled={disabled}
			/>

			{isCssMode && inputContainerEl
				? createPortal(
						<button
							type="button"
							ref={overlayButtonRef}
							className="motto-unit-css-mode-overlay"
							aria-haspopup="dialog"
							aria-expanded={isPopupOpen}
							aria-label={__("Edit CSS value", "motto-blocks")}
							onClick={openCssPopup}
							disabled={disabled}
						>
							<span className="motto-unit-css-mode-overlay-value">
								{cssDisplayValue}
							</span>
						</button>,
						inputContainerEl
					)
				: null}

			{isPopupOpen && overlayButtonRef.current ? (
				<Popover
					anchor={overlayButtonRef.current}
					placement="bottom-start"
					flip={true}
					shift={true}
					resize={false}
					offset={8}
					focusOnMount="firstElement"
					className={withMottoPopupClass("motto-unit-css-popup")}
					onFocusOutside={discardCssPopup}
					onClose={discardCssPopup}
				>
					<div
						role="dialog"
						aria-label={__("Edit CSS value", "motto-blocks")}
						className="motto-unit-css-popup-content"
					>
						<RawControl
							value={draftValue}
							onChange={setDraftValue}
							className="motto-unit-css-popup-input"
							popoverClassName="motto-unit-css-popup-raw-popup"
							onKeyDown={handlePopupInputKeyDown}
							disabled={disabled}
						/>
						<Button
							variant="primary"
							className="motto-ui-button is-icon-only motto-unit-css-popup-confirm"
							onClick={confirmCssPopup}
							aria-label={__("Confirm", "motto-blocks")}
							title={__("Confirm", "motto-blocks")}
						>
							<Check size={14} />
						</Button>
					</div>
				</Popover>
			) : null}
		</div>
	);
};
