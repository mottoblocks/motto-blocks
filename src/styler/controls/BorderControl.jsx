import {
	__experimentalBorderBoxControl as BorderBoxControl,
	__experimentalBorderControl as WpBorderControl,
	TextControl,
	ToggleControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { useEffect, useMemo, useRef } from "@wordpress/element";
import { tokenizeCssValue } from "../utils/css-value-utils.js";

const BORDER_STYLES = new Set([
	"none",
	"hidden",
	"dotted",
	"dashed",
	"solid",
	"double",
	"groove",
	"ridge",
	"inset",
	"outset",
]);

const isBorderWidthToken = (token) => {
	if (!token) return false;
	if (token === "0") return true;
	if (/^(thin|medium|thick)$/i.test(token)) return true;
	if (/^var\(--wp--preset--spacing--[a-z0-9-]+(?:\s*,[\s\S]+)?\)$/i.test(token)) return true;
	return /^-?\d*\.?\d+(px|em|rem|%|vw|vh|vmin|vmax|ch|ex|cm|mm|in|pt|pc)$/i.test(token);
};

const readControlToken = (value) => {
	if (typeof value === "string") return value;
	if (typeof value === "number") return `${value}px`;
	if (value && typeof value === "object") {
		if (typeof value.value === "string") return value.value;
		if (typeof value.slug === "string" && value.slug) return value.slug;
	}
	return "";
};

const parseBorderValue = (raw) => {
	const tokens = tokenizeCssValue(raw);
	const parsed = { width: "", style: "solid", color: "" };

	tokens.forEach((token) => {
		const lower = token.toLowerCase();
		if (BORDER_STYLES.has(lower)) {
			parsed.style = lower;
			return;
		}
		if (!parsed.width && isBorderWidthToken(token)) {
			parsed.width = token;
			return;
		}
		if (!parsed.color) parsed.color = token;
	});

	return parsed;
};

const normalizeBorderControlValue = (next) => {
	if (!next) return null;
	if (typeof next === "string") return parseBorderValue(next);
	if (typeof next !== "object") return null;
	const root = next?.all && typeof next.all === "object" ? next.all : next;
	return {
		width: readControlToken(root?.width),
		style: readControlToken(root?.style),
		color: readControlToken(root?.color),
	};
};

const buildBorderValue = ({ width, style, color }) =>
	[String(width || "").trim(), String(style || "").trim(), String(color || "").trim()]
		.filter(Boolean)
		.join(" ");

export const BorderControl = ({
	value,
	onChange,
	themeColors = [],
	disableCustomColors = false,
	colorToPresetVar = (next) => next,
}) => {
	const rawValue = String(value || "").trim();
	const isNone = rawValue.toLowerCase() === "none";
	const parsed = useMemo(() => parseBorderValue(value), [value]);
	const lastNonNoneValueRef = useRef("");
	const SingleBorderControl = WpBorderControl || BorderBoxControl;
	const flatValue = useMemo(
		() => ({
			width: parsed.width || undefined,
			style: parsed.style || undefined,
			color: parsed.color || undefined,
		}),
		[parsed]
	);

	useEffect(() => {
		if (rawValue && !isNone) {
			lastNonNoneValueRef.current = rawValue;
		}
	}, [isNone, rawValue]);

	if (SingleBorderControl) {
		return (
			<div className="motto-border-control">
				<SingleBorderControl
					label={__("Border", "motto-blocks")}
					value={flatValue}
					colors={themeColors}
					disableCustomColors={disableCustomColors}
					enableAlpha
					withSlider
					width="110px"
					__next40pxDefaultSize
					disabled={isNone}
					onChange={(next) => {
						const normalized = normalizeBorderControlValue(next);
						if (!normalized) return;
						onChange(
							buildBorderValue({
								...normalized,
								color: normalized.color
									? colorToPresetVar(normalized.color)
									: parsed.color,
							})
						);
					}}
				/>
				<ToggleControl
					className="motto-toggle motto-toggle-large"
					label={__("None", "motto-blocks")}
					checked={isNone}
					onChange={(nextChecked) => {
						if (nextChecked) {
							onChange("none");
							return;
						}

						onChange(lastNonNoneValueRef.current || "");
					}}
				/>
			</div>
		);
	}

	return (
		<div className="motto-border-control">
			<ToggleControl
				className="motto-toggle motto-toggle-large"
				label={__("None", "motto-blocks")}
				checked={isNone}
				onChange={(nextChecked) => {
					if (nextChecked) {
						onChange("none");
						return;
					}

					onChange(lastNonNoneValueRef.current || "");
				}}
			/>
			<TextControl
				value={rawValue}
				aria-label={__("Border value", "motto-blocks")}
				onChange={onChange}
				className="motto-css-rule-value motto-input motto-value-type-border"
				autoComplete="off"
				disabled={isNone}
			/>
		</div>
	);
};
