import { __experimentalUnitControl as UnitControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { useEffect, useMemo, useState } from "@wordpress/element";
import { ColorControl, LayerTabs } from "@components";
import {
	toPaletteColors,
	toPaletteVisualValue,
	toStoredColorValue,
} from "../utils/color-palette-utils";
import { isColorKeyword, isColorToken, tokenizeCssValue } from "../utils/css-value-utils.js";
import { reorderArrayItem } from "../utils/array-utils";

const parseBoxShadow = (raw) => {
	const tokens = tokenizeCssValue(raw);
	const result = { inset: false, offsetX: "", offsetY: "", blur: "", spread: "", color: "" };
	const parts = [];
	tokens.forEach((token) => {
		if (token.toLowerCase() === "inset") {
			result.inset = true;
			return;
		}
		if (isColorToken(token) || isColorKeyword(token)) {
			result.color = token;
			return;
		}
		parts.push(token);
	});
	result.offsetX = parts[0] || "";
	result.offsetY = parts[1] || "";
	result.blur = parts[2] || "";
	result.spread = parts[3] || "";
	return result;
};

const splitShadows = (raw) => {
	const value = String(raw || "").trim();
	if (!value) return [];
	const parts = [];
	let current = "";
	let depth = 0;
	for (let i = 0; i < value.length; i += 1) {
		const char = value[i];
		if (char === "(") depth += 1;
		if (char === ")") depth = Math.max(0, depth - 1);
		if (depth === 0 && char === ",") {
			if (current.trim()) parts.push(current.trim());
			current = "";
			continue;
		}
		current += char;
	}
	if (current.trim()) parts.push(current.trim());
	return parts;
};

const parseBoxShadowList = (raw, fallback = "") => {
	const shadows = splitShadows(raw);
	if (shadows.length === 0 && fallback) return [parseBoxShadow(fallback)];
	return shadows.map((shadow) => parseBoxShadow(shadow));
};

const buildBoxShadow = ({ inset, offsetX, offsetY, blur, spread, color }) => {
	const out = [];
	if (inset) out.push("inset");
	if (offsetX) out.push(offsetX);
	if (offsetY) out.push(offsetY);
	if (blur) out.push(blur);
	if (spread) out.push(spread);
	if (color) out.push(color);
	return out.join(" ").trim();
};

const buildBoxShadowList = (list) =>
	(Array.isArray(list) ? list : [])
		.map((item) => buildBoxShadow(item))
		.filter((value) => String(value || "").trim() !== "")
		.join(", ");

const UNITS = [
	{ value: "px", label: "px" },
	{ value: "em", label: "em" },
	{ value: "rem", label: "rem" },
	{ value: "%", label: "%" },
	{ value: "vw", label: "vw" },
	{ value: "vh", label: "vh" },
	{ value: "dvw", label: "dvw" },
	{ value: "dvh", label: "dvh" },
];

export const BoxShadowControl = ({
	value,
	onChange,
	defaultValue = "",
	themeColors = [],
	disableCustomColors = false,
	colorToPresetVar = (next) => next,
}) => {
	const paletteColors = toPaletteColors(themeColors);
	const fallbackValue = String(defaultValue || "").trim();
	const effectiveValue = String(value || "").trim() ? value : fallbackValue;
	const shadows = useMemo(
		() => parseBoxShadowList(effectiveValue, fallbackValue),
		[effectiveValue, fallbackValue]
	);
	const [activeIndex, setActiveIndex] = useState(0);

	useEffect(() => {
		if (activeIndex < shadows.length) return;
		setActiveIndex(Math.max(0, shadows.length - 1));
	}, [activeIndex, shadows.length]);

	const updateShadow = (index, patch) => {
		const current = parseBoxShadowList(effectiveValue, fallbackValue);
		if (!current[index]) return;
		const next = current.map((item, idx) => (idx === index ? { ...item, ...patch } : item));
		onChange(buildBoxShadowList(next));
	};

	const addShadow = () => {
		const next = [...parseBoxShadowList(effectiveValue, fallbackValue)];
		const base = fallbackValue || "0 0 0 0 rgba(0,0,0,.1)";
		next.push(parseBoxShadow(base));
		onChange(buildBoxShadowList(next));
		setActiveIndex(next.length - 1);
	};

	const removeShadow = (index) => {
		const current = parseBoxShadowList(effectiveValue, fallbackValue);
		onChange(buildBoxShadowList(current.filter((_, idx) => idx !== index)));
	};

	const duplicateShadow = (index) => {
		const current = parseBoxShadowList(effectiveValue, fallbackValue);
		const source = current[index];
		if (!source) return;
		const next = [...current];
		next.splice(index + 1, 0, { ...source });
		onChange(buildBoxShadowList(next));
		setActiveIndex(index + 1);
	};

	const reorderShadows = (fromIndex, toIndex) => {
		const current = parseBoxShadowList(effectiveValue, fallbackValue);
		if (!current[fromIndex] || !Number.isFinite(toIndex)) return;
		const next = reorderArrayItem(current, fromIndex, toIndex);
		onChange(buildBoxShadowList(next));
		setActiveIndex(Math.max(0, Math.min(next.length - 1, toIndex)));
	};

	const activeShadow = shadows[activeIndex] || shadows[0] || null;
	const activeShadowIndex = shadows[activeIndex] ? activeIndex : 0;

	return (
		<div className="motto-box-shadow-control">
			<div className="motto-box-shadow-fields">
				<LayerTabs
					items={shadows}
					activeIndex={activeShadowIndex}
					onActiveChange={setActiveIndex}
					onAdd={addShadow}
					onDuplicate={duplicateShadow}
					onRemove={removeShadow}
					onReorder={reorderShadows}
					getItemLabel={(_item, index) => `${__("Shadow", "motto-blocks")} ${index + 1}`}
					ariaLabel={__("Shadows", "motto-blocks")}
					addAriaLabel={__("Add shadow", "motto-blocks")}
					duplicateAriaLabel={__("Duplicate shadow", "motto-blocks")}
					removeAriaLabel={__("Remove shadow", "motto-blocks")}
					className="motto-box-shadow-tabs"
					tabBehavior={{ allowNoTabs: false }}
				/>
				{activeShadow ? (
					<div className="motto-box-shadow-panel">
						<div className="motto-grid cols-2 gap-sm">
							<UnitControl
								label={__("X", "motto-blocks")}
								value={activeShadow.offsetX || ""}
								units={UNITS}
								onChange={(val) =>
									updateShadow(activeShadowIndex, {
										offsetX: val == null ? "" : String(val),
									})
								}
							/>
							<UnitControl
								label={__("Y", "motto-blocks")}
								value={activeShadow.offsetY || ""}
								units={UNITS}
								onChange={(val) =>
									updateShadow(activeShadowIndex, {
										offsetY: val == null ? "" : String(val),
									})
								}
							/>
							<UnitControl
								label={__("Blur", "motto-blocks")}
								value={activeShadow.blur || ""}
								units={UNITS}
								onChange={(val) =>
									updateShadow(activeShadowIndex, {
										blur: val == null ? "" : String(val),
									})
								}
							/>
							<UnitControl
								label={__("Spread", "motto-blocks")}
								value={activeShadow.spread || ""}
								units={UNITS}
								onChange={(val) =>
									updateShadow(activeShadowIndex, {
										spread: val == null ? "" : String(val),
									})
								}
							/>
						</div>
						<div className="motto-box-shadow-color-row motto-flex align-center gap-sm justify-between">
							<span className="motto-label">{__("Color", "motto-blocks")}</span>
							<ColorControl
								asDropdown
								label=""
								dropdownLabel={__("Edit shadow color", "motto-blocks")}
								colorValue={activeShadow.color}
								onChange={(next) =>
									updateShadow(activeShadowIndex, { color: next })
								}
								colors={paletteColors}
								disableCustomColors={disableCustomColors}
								enableAlpha
								mapColorValueForInput={(next) =>
									toPaletteVisualValue(next, paletteColors)
								}
								mapColorValueForOutput={(next) =>
									toStoredColorValue(next, colorToPresetVar)
								}
							/>
						</div>
					</div>
				) : null}
			</div>
		</div>
	);
};
