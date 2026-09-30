import { Button, SelectControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { Plus, Trash } from "lucide-react";
import { getRangeStepByUnit, MottoNumberControl, MottoUnitControl } from "@components";
import { useCssFunctionListEntries } from "../hooks/use-css-function-list-entries";

const TRANSFORM_TYPES = [
	{
		key: "translateX",
		label: __("Translate X", "motto-blocks"),
		valueType: "unit",
		defaultValue: "0px",
		units: ["px", "%", "em", "rem", "vw", "vh"],
	},
	{
		key: "translateY",
		label: __("Translate Y", "motto-blocks"),
		valueType: "unit",
		defaultValue: "0px",
		units: ["px", "%", "em", "rem", "vw", "vh"],
	},
	{
		key: "translateZ",
		label: __("Translate Z", "motto-blocks"),
		valueType: "unit",
		defaultValue: "0px",
		units: ["px", "em", "rem"],
	},
	{
		key: "scaleX",
		label: __("Scale X", "motto-blocks"),
		valueType: "number",
		defaultValue: 1,
		min: -5,
		max: 5,
		step: 0.01,
	},
	{
		key: "scaleY",
		label: __("Scale Y", "motto-blocks"),
		valueType: "number",
		defaultValue: 1,
		min: -5,
		max: 5,
		step: 0.01,
	},
	{
		key: "rotate",
		label: __("Rotate", "motto-blocks"),
		valueType: "unit",
		defaultValue: "0deg",
		units: ["deg", "rad", "turn"],
	},
	{
		key: "rotateX",
		label: __("Rotate X", "motto-blocks"),
		valueType: "unit",
		defaultValue: "0deg",
		units: ["deg", "rad", "turn"],
	},
	{
		key: "rotateY",
		label: __("Rotate Y", "motto-blocks"),
		valueType: "unit",
		defaultValue: "0deg",
		units: ["deg", "rad", "turn"],
	},
	{
		key: "skewX",
		label: __("Skew X", "motto-blocks"),
		valueType: "unit",
		defaultValue: "0deg",
		units: ["deg", "rad", "turn"],
	},
	{
		key: "skewY",
		label: __("Skew Y", "motto-blocks"),
		valueType: "unit",
		defaultValue: "0deg",
		units: ["deg", "rad", "turn"],
	},
	{
		key: "perspective",
		label: __("Perspective", "motto-blocks"),
		valueType: "unit",
		defaultValue: "0px",
		units: ["px", "em", "rem", "vw"],
	},
];

const parseTransformArgs = (args, cfg) => {
	if (cfg.valueType === "number") {
		const numeric = Number(args);
		return { value: Number.isFinite(numeric) ? numeric : cfg.defaultValue };
	}
	return { value: args || cfg.defaultValue };
};

const buildTransformArgs = (entry, cfg) => {
	if (cfg.valueType === "number") {
		const numeric = Number(entry?.value);
		return Number.isFinite(numeric) ? String(numeric) : "";
	}
	return String(entry?.value || "").trim();
};

export const TransformControl = ({ value, onChange }) => {
	const { entries, typeMap, getAvailableTypes, updateEntry, addEntry, removeEntry } =
		useCssFunctionListEntries({
			value,
			onChange,
			types: TRANSFORM_TYPES,
			idPrefix: "transform",
			parseArgs: parseTransformArgs,
			buildArgs: buildTransformArgs,
			createEntryFields: (cfg) => ({ value: cfg.defaultValue }),
		});

	const addTransform = () => addEntry();

	return (
		<div className="motto-transform-control motto-flex-rows">
			{entries.length > 0 ? (
				<>
					{entries.map((entry) => {
						const cfg = typeMap[entry.type] || typeMap.translateX;
						const rowOptions = getAvailableTypes(entry.id).map((item) => ({
							label: item.label,
							value: item.key,
						}));
						const numeric = Number(entry?.value);
						return (
							<div
								className="motto-flex align-center gap-md motto-transform-row"
								key={entry.id}
							>
								<SelectControl
									className="motto-select motto-prop-select"
									aria-label={__("Transform type", "motto-blocks")}
									value={entry.type}
									options={rowOptions}
									onChange={(nextType) => {
										const next = typeMap[nextType] || typeMap.translateX;
										updateEntry(entry.id, {
											type: next.key,
											value: next.defaultValue,
										});
									}}
								/>
								<div className="flex-1 motto-transform-value">
									{cfg.valueType === "number" ? (
										<MottoNumberControl
											label={cfg.label}
											value={
												Number.isFinite(numeric)
													? String(numeric)
													: String(cfg.defaultValue)
											}
											min={cfg.min ?? -5}
											max={cfg.max ?? 5}
											step={cfg.step ?? 0.01}
											onChange={(next) =>
												updateEntry(entry.id, {
													value:
														next === ""
															? cfg.defaultValue
															: Number(next),
												})
											}
										/>
									) : (
										<MottoUnitControl
											label={cfg.label}
											hideLabelFromVision
											value={String(entry?.value || cfg.defaultValue)}
											onChange={(next) =>
												updateEntry(entry.id, {
													value: next == null ? "" : String(next),
												})
											}
											units={(cfg.units || []).map((unit) => ({
												value: unit,
												label: unit,
												step: getRangeStepByUnit(unit, cfg.step || 1),
											}))}
										/>
									)}
								</div>
								<Button
									variant="tertiary"
									className="motto-ui-button is-icon-only is-destructive flex-none"
									onClick={() => removeEntry(entry.id)}
									aria-label={__("Delete transform", "motto-blocks")}
									title={__("Delete transform", "motto-blocks")}
								>
									<Trash size={14} aria-hidden="true" />
								</Button>
							</div>
						);
					})}
				</>
			) : null}

			<Button
				variant="secondary"
				className="motto-ui-button"
				onClick={addTransform}
				disabled={entries.length >= TRANSFORM_TYPES.length}
			>
				<Plus size={14} aria-hidden="true" />
				{__("Add transform", "motto-blocks")}
			</Button>
		</div>
	);
};
