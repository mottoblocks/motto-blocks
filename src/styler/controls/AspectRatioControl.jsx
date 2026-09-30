import {
	__experimentalToggleGroupControl as ExperimentalToggleGroupControl,
	__experimentalToggleGroupControlOption as ExperimentalToggleGroupControlOption,
	TextControl,
	ToggleGroupControl,
	ToggleGroupControlOption,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { useEffect, useRef, useState } from "@wordpress/element";

const RATIO_RE = /^(\d*\.?\d+)(?:\s*\/\s*(\d*\.?\d+))?$/;
const PRESET_OPTIONS = [
	{ label: "1:1", value: "1 / 1" },
	{ label: "4:3", value: "4 / 3" },
	{ label: "5:6", value: "5 / 6" },
	{ label: "16:9", value: "16 / 9" },
	{ label: "21:9", value: "21 / 9" },
];
const SafeToggleGroupControl = ToggleGroupControl || ExperimentalToggleGroupControl;
const SafeToggleGroupControlOption =
	ToggleGroupControlOption || ExperimentalToggleGroupControlOption;

const toRaw = (value) => String(value == null ? "" : value).trim();

const isPositiveRatioToken = (value) => {
	const numeric = Number(value);
	return Number.isFinite(numeric) && numeric > 0;
};

const parseAspectRatio = (value) => {
	const raw = toRaw(value);
	if (!raw) {
		return { mode: "empty", numerator: "", denominator: "" };
	}
	if (raw.toLowerCase() === "auto") {
		return { mode: "auto", numerator: "", denominator: "" };
	}
	const match = raw.match(RATIO_RE);
	if (!match) {
		return { mode: "custom", numerator: "", denominator: "" };
	}
	const numerator = String(match[1] || "").trim();
	const denominator = String(match[2] || "1").trim();
	return {
		mode: "ratio",
		numerator,
		denominator,
	};
};

const buildAspectRatio = (numerator, denominator) => {
	const num = String(numerator || "").trim();
	const den = String(denominator || "").trim();
	if (!num && !den) return "";
	if (!isPositiveRatioToken(num) || !isPositiveRatioToken(den)) return null;
	return `${num} / ${den}`;
};

export const AspectRatioControl = ({ value, onChange }) => {
	const syncedValueRef = useRef(toRaw(value));
	const [numerator, setNumerator] = useState(() => parseAspectRatio(value).numerator);
	const [denominator, setDenominator] = useState(() => parseAspectRatio(value).denominator);

	useEffect(() => {
		const raw = toRaw(value);
		if (raw === syncedValueRef.current) return;
		syncedValueRef.current = raw;
		const parsed = parseAspectRatio(raw);
		setNumerator(parsed.numerator);
		setDenominator(parsed.denominator);
	}, [value]);

	const commit = (nextValue) => {
		const normalized = String(nextValue == null ? "" : nextValue);
		syncedValueRef.current = normalized.trim();
		onChange(normalized);
	};

	const updateRatio = (nextNumerator, nextDenominator) => {
		const built = buildAspectRatio(nextNumerator, nextDenominator);
		if (built === null) return;
		commit(built);
	};

	const currentNormalized = toRaw(value).toLowerCase();
	const selectedPresetValue =
		PRESET_OPTIONS.find((option) => option.value.toLowerCase() === currentNormalized)?.value ||
		"";

	return (
		<div className="motto-aspect-ratio-control">
			{SafeToggleGroupControl && SafeToggleGroupControlOption ? (
				<SafeToggleGroupControl
					isBlock
					__nextHasNoMarginBottom
					className="motto-aspect-ratio-presets"
					label={__("Presets", "motto-blocks")}
					value={selectedPresetValue}
					onChange={(nextValue) => {
						const next = String(nextValue || "").trim();
						if (!next) return;
						const parsed = parseAspectRatio(next);
						setNumerator(parsed.numerator);
						setDenominator(parsed.denominator);
						commit(next);
					}}
				>
					{PRESET_OPTIONS.map((option) => (
						<SafeToggleGroupControlOption
							key={option.value}
							value={option.value}
							label={option.label}
						/>
					))}
				</SafeToggleGroupControl>
			) : (
				<div className="motto-aspect-ratio-presets">
					<TextControl
						__nextHasNoMarginBottom
						label={__("Preset", "motto-blocks")}
						value={selectedPresetValue}
						onChange={() => {}}
						disabled
					></TextControl>
				</div>
			)}
			<div className="motto-flex align-center gap-sm">
				<span className="motto-label">{__("Ratio", "motto-blocks")}</span>
				<div className="motto-aspect-ratio-inputs">
					<TextControl
						__nextHasNoMarginBottom
						label={__("Width", "motto-blocks")}
						hideLabelFromVision
						value={numerator}
						onChange={(next) => {
							setNumerator(next);
							updateRatio(next, denominator);
						}}
						className="motto-input"
					/>
					<span className="motto-aspect-ratio-separator" aria-hidden="true">
						/
					</span>
					<TextControl
						__nextHasNoMarginBottom
						label={__("Height", "motto-blocks")}
						hideLabelFromVision
						value={denominator}
						onChange={(next) => {
							setDenominator(next);
							updateRatio(numerator, next);
						}}
						className="motto-input"
					/>
				</div>
			</div>
		</div>
	);
};
