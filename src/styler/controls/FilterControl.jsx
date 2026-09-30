import {
	Button,
	ColorPalette,
	SelectControl,
	__experimentalUnitControl as UnitControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { Plus, Trash } from "lucide-react";
import { NumericUnitField, getRangeStepByUnit } from "@components";
import {
	toPaletteColors,
	toPaletteVisualValue,
	toStoredColorValue,
} from "../utils/color-palette-utils";
import { isColorKeyword, isColorToken, tokenizeCssValue } from "../utils/css-value-utils.js";
import { useCssFunctionListEntries } from "../hooks/use-css-function-list-entries";

const FILTER_TYPES = [
	{
		key: "blur",
		label: __("Blur", "motto-blocks"),
		unit: "px",
		units: ["px", "em", "rem", "%", "vw", "vh"],
		min: 0,
		max: 100,
		step: 1,
	},
	{
		key: "brightness",
		label: __("Brightness", "motto-blocks"),
		unit: "%",
		min: 0,
		max: 200,
		step: 1,
	},
	{
		key: "contrast",
		label: __("Contrast", "motto-blocks"),
		unit: "%",
		min: 0,
		max: 200,
		step: 1,
	},
	{
		key: "saturate",
		label: __("Saturate", "motto-blocks"),
		unit: "%",
		min: 0,
		max: 300,
		step: 1,
	},
	{ key: "opacity", label: __("Opacity", "motto-blocks"), unit: "%", min: 0, max: 100, step: 1 },
	{
		key: "grayscale",
		label: __("Grayscale", "motto-blocks"),
		unit: "%",
		min: 0,
		max: 100,
		step: 1,
	},
	{ key: "invert", label: __("Invert", "motto-blocks"), unit: "%", min: 0, max: 100, step: 1 },
	{ key: "sepia", label: __("Sepia", "motto-blocks"), unit: "%", min: 0, max: 100, step: 1 },
	{
		key: "hue-rotate",
		label: __("Hue Rotate", "motto-blocks"),
		unit: "deg",
		units: ["deg", "rad", "grad", "turn"],
		min: 0,
		max: 360,
		step: 1,
	},
	{ key: "drop-shadow", label: __("Drop Shadow", "motto-blocks") },
];

const DROP_SHADOW_UNITS = ["px", "em", "rem", "%", "vw", "vh"];
const DEFAULT_DROP_SHADOW = {
	offsetX: "4px",
	offsetY: "4px",
	blur: "8px",
	color: "rgba(0,0,0,.2)",
};

const getDefaultFilterValue = (cfg) => {
	if (!cfg) return "";
	const base = Number.isFinite(Number(cfg.min)) ? Number(cfg.min) : 0;
	return cfg.unit ? `${base}${cfg.unit}` : String(base);
};

const parseDropShadow = (raw) => {
	const tokens = tokenizeCssValue(raw);
	const result = { offsetX: "", offsetY: "", blur: "", color: "" };
	const parts = [];
	tokens.forEach((token) => {
		if (isColorToken(token) || isColorKeyword(token)) {
			result.color = token;
			return;
		}
		parts.push(token);
	});
	result.offsetX = parts[0] || "";
	result.offsetY = parts[1] || "";
	result.blur = parts[2] || "";
	return result;
};

const buildDropShadow = ({ offsetX, offsetY, blur, color }) =>
	[offsetX, offsetY, blur, color]
		.map((v) => String(v || "").trim())
		.filter(Boolean)
		.join(" ");

const parseFilterArgs = (args, cfg) =>
	cfg.key === "drop-shadow" ? { dropShadow: parseDropShadow(args) } : { value: args };

const buildFilterArgs = (entry, cfg) =>
	cfg.key === "drop-shadow"
		? buildDropShadow(entry.dropShadow || {})
		: String(entry?.value || "").trim();

const createFilterEntryFields = (cfg) =>
	cfg.key === "drop-shadow"
		? { dropShadow: { ...DEFAULT_DROP_SHADOW } }
		: { value: getDefaultFilterValue(cfg) };

export const FilterControl = ({
	value,
	onChange,
	themeColors = [],
	disableCustomColors = false,
	colorToPresetVar = (next) => next,
}) => {
	const paletteColors = toPaletteColors(themeColors);
	const dropShadowUnits = DROP_SHADOW_UNITS.map((unit) => ({
		value: unit,
		label: unit,
		step: getRangeStepByUnit(unit, 1),
	}));

	const { entries, typeMap, getAvailableTypes, updateEntry, addEntry, removeEntry } =
		useCssFunctionListEntries({
			value,
			onChange,
			types: FILTER_TYPES,
			idPrefix: "filter",
			normalizeType: (type) => type.toLowerCase(),
			parseArgs: parseFilterArgs,
			buildArgs: buildFilterArgs,
			createEntryFields: createFilterEntryFields,
		});

	const addFilter = () => addEntry();

	return (
		<div className="motto-filter-control motto-grid gap-sm">
			{entries.map((entry) => {
				const cfg = typeMap[entry.type] || typeMap.blur;
				const rowOptions = getAvailableTypes(entry.id).map((item) => ({
					label: item.label,
					value: item.key,
				}));
				const isDropShadow = entry.type === "drop-shadow";
				const val = entry.value ?? "";

				return (
					<div className="motto-grid gap-sm motto-filter-row" key={entry.id}>
						<div className="motto-flex align-center gap-sm">
							<SelectControl
								className="motto-select flex-1"
								aria-label={__("Filter type", "motto-blocks")}
								value={entry.type}
								options={rowOptions}
								onChange={(nextType) => {
									const nextCfg = typeMap[nextType] || typeMap.blur;
									updateEntry(entry.id, {
										type: nextCfg.key,
										...createFilterEntryFields(nextCfg),
									});
								}}
							/>
							<Button
								variant="tertiary"
								className="motto-ui-button is-icon-only is-destructive"
								onClick={() => removeEntry(entry.id)}
								aria-label={__("Delete filter", "motto-blocks")}
								title={__("Delete filter", "motto-blocks")}
							>
								<Trash size={14} aria-hidden="true" />
							</Button>
						</div>
						<div className="motto-filter-edit-value">
							{isDropShadow ? (
								<div className="motto-filter-shadow">
									<div className="motto-grid cols-3 gap-sm">
										<UnitControl
											label={__("X", "motto-blocks")}
											value={entry.dropShadow?.offsetX || ""}
											units={dropShadowUnits}
											onChange={(next) =>
												updateEntry(entry.id, {
													dropShadow: {
														...entry.dropShadow,
														offsetX: next == null ? "" : String(next),
													},
												})
											}
										/>
										<UnitControl
											label={__("Y", "motto-blocks")}
											value={entry.dropShadow?.offsetY || ""}
											units={dropShadowUnits}
											onChange={(next) =>
												updateEntry(entry.id, {
													dropShadow: {
														...entry.dropShadow,
														offsetY: next == null ? "" : String(next),
													},
												})
											}
										/>
										<UnitControl
											label={__("Blur", "motto-blocks")}
											value={entry.dropShadow?.blur || ""}
											units={dropShadowUnits}
											onChange={(next) =>
												updateEntry(entry.id, {
													dropShadow: {
														...entry.dropShadow,
														blur: next == null ? "" : String(next),
													},
												})
											}
										/>
									</div>
									<ColorPalette
										value={toPaletteVisualValue(
											entry.dropShadow?.color || "",
											paletteColors
										)}
										colors={paletteColors}
										disableCustomColors={disableCustomColors}
										enableAlpha
										onChange={(nextColor) =>
											updateEntry(entry.id, {
												dropShadow: {
													...entry.dropShadow,
													color: nextColor
														? toStoredColorValue(
																nextColor,
																colorToPresetVar
															)
														: "",
												},
											})
										}
									/>
								</div>
							) : (
								<NumericUnitField
									value={String(val || "")}
									onChange={(next) =>
										updateEntry(entry.id, { value: String(next || "") })
									}
									min={cfg.min}
									max={cfg.max}
									step={cfg.step}
									unit={cfg.unit}
									initialUnit={cfg.unit}
									units={cfg.units}
								/>
							)}
						</div>
					</div>
				);
			})}

			<Button
				variant="secondary"
				className="motto-ui-button"
				onClick={addFilter}
				disabled={entries.length >= FILTER_TYPES.length}
			>
				<Plus size={14} aria-hidden="true" />
				{__("Add filter", "motto-blocks")}
			</Button>
		</div>
	);
};
