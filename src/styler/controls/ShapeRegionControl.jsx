import { SelectControl, TextControl, TextareaControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { useEffect, useMemo, useRef, useState } from "@wordpress/element";
import { tokenizeCssValue } from "../utils/css-value-utils.js";
import { normalizeSpacingPresetSlug } from "../utils/core-preset-values.js";
import { SpacingMultipleControl } from "./SpacingMultipleControl";

const SHAPE_REGION_TYPES = [
	{ value: "inset", label: __("Inset", "motto-blocks") },
	{ value: "circle", label: __("Circle", "motto-blocks") },
	{ value: "ellipse", label: __("Ellipse", "motto-blocks") },
	{ value: "polygon", label: __("Polygon", "motto-blocks") },
	{ value: "path", label: __("Path", "motto-blocks") },
];

const INSET_INITIAL_UNIT = "%";

const DEFAULT_ARGS_BY_TYPE = {
	inset: `0${INSET_INITIAL_UNIT}`,
	circle: "50% at 50% 50%",
	ellipse: "50% 50% at 50% 50%",
	polygon: "0 0, 100% 0, 100% 100%, 0 100%",
	path: '""',
};

const toStringValue = (value) => (value == null ? "" : String(value));
const spacingPresetToCssVar = (value) => {
	const raw = toStringValue(value).trim();
	if (!raw) return "";
	if (raw === "0") return "0";
	const match = raw.match(/^var:preset\|spacing\|(.+)$/i);
	if (!match) return raw;
	const slug = normalizeSpacingPresetSlug(match[1]);
	if (!slug || slug === "0") return "0";
	return `var(--wp--preset--spacing--${slug})`;
};

const canUseInsetSpacingEditor = (rawArgs) => {
	const args = toStringValue(rawArgs).trim();
	if (!args) return true;
	if (/\sround\s/i.test(args)) return false;
	const tokens = tokenizeCssValue(args);
	if (tokens.length < 1 || tokens.length > 4) return false;
	return tokens.every((token) => Boolean(spacingPresetToCssVar(token)));
};

const parseShapeRegionValue = (rawValue) => {
	const value = toStringValue(rawValue).trim();
	if (!value || value.toLowerCase() === "none") {
		return { type: "inset", args: DEFAULT_ARGS_BY_TYPE.inset };
	}
	const fnMatch = value.match(/^([a-z-]+)\(([\s\S]*)\)$/i);
	if (fnMatch) {
		const type = String(fnMatch[1] || "")
			.trim()
			.toLowerCase();
		const args = String(fnMatch[2] || "").trim();
		if (type in DEFAULT_ARGS_BY_TYPE) {
			return { type, args: args || DEFAULT_ARGS_BY_TYPE[type] };
		}
	}
	return { type: "inset", args: DEFAULT_ARGS_BY_TYPE.inset };
};

const buildShapeRegionValue = (model) => {
	const type = String(model?.type || "")
		.trim()
		.toLowerCase();
	if (!type || !(type in DEFAULT_ARGS_BY_TYPE)) return "";
	const args = toStringValue(model?.args).trim() || DEFAULT_ARGS_BY_TYPE[type];
	return `${type}(${args})`;
};

export const ShapeRegionControl = ({ value, onChange, spacingSizes = [] }) => {
	const [model, setModel] = useState(() => parseShapeRegionValue(value));
	const [draftByType, setDraftByType] = useState(() => ({
		inset: DEFAULT_ARGS_BY_TYPE.inset,
		circle: DEFAULT_ARGS_BY_TYPE.circle,
		ellipse: DEFAULT_ARGS_BY_TYPE.ellipse,
		polygon: DEFAULT_ARGS_BY_TYPE.polygon,
		path: DEFAULT_ARGS_BY_TYPE.path,
	}));
	const lastValueRef = useRef(toStringValue(value).trim());
	const insetParsed = useMemo(
		() =>
			model.type === "inset"
				? { canUseSpacingEditor: canUseInsetSpacingEditor(model.args) }
				: null,
		[model.args, model.type]
	);

	useEffect(() => {
		const nextValue = toStringValue(value).trim();
		if (nextValue === lastValueRef.current) return;
		lastValueRef.current = nextValue;
		const parsed = parseShapeRegionValue(nextValue);
		setModel(parsed);
		setDraftByType((prev) => ({
			...prev,
			[parsed.type]: parsed.args || DEFAULT_ARGS_BY_TYPE[parsed.type] || "",
		}));
	}, [value]);

	const updateModel = (nextModel) => {
		setModel(nextModel);
		const output = buildShapeRegionValue(nextModel);
		lastValueRef.current = output;
		onChange(output);
	};

	const updateCurrentTypeArgs = (nextArgs) => {
		const normalizedArgs = toStringValue(nextArgs);
		setDraftByType((prev) => ({ ...prev, [model.type]: normalizedArgs }));
		updateModel({ ...model, args: normalizedArgs });
	};

	const setType = (nextType) => {
		const type = String(nextType || "")
			.trim()
			.toLowerCase();
		if (!type || type === model.type) return;
		const nextArgs = String(draftByType[type] || DEFAULT_ARGS_BY_TYPE[type] || "").trim();
		updateModel({ type, args: nextArgs || DEFAULT_ARGS_BY_TYPE[type] || "" });
	};

	return (
		<div className="motto-shape-region-control">
			<SelectControl
				label={__("Shape type", "motto-blocks")}
				value={model.type}
				onChange={setType}
				options={SHAPE_REGION_TYPES}
				className="motto-select motto-shape-region-type"
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>

			{model.type === "inset" && insetParsed?.canUseSpacingEditor ? (
				<SpacingMultipleControl
					value={model.args}
					onChange={updateCurrentTypeArgs}
					spacingSizes={spacingSizes}
					initialUnit={INSET_INITIAL_UNIT}
					label={__("Inset", "motto-blocks")}
				/>
			) : model.type === "polygon" || model.type === "path" ? (
				<TextareaControl
					className="motto-shape-region-args"
					label={__("Arguments", "motto-blocks")}
					value={model.args}
					onChange={updateCurrentTypeArgs}
				/>
			) : (
				<TextControl
					className="motto-shape-region-args"
					label={__("Arguments", "motto-blocks")}
					value={model.args}
					onChange={updateCurrentTypeArgs}
				/>
			)}
		</div>
	);
};
