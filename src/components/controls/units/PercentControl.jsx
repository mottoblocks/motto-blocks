import { MottoNumberControl } from "./NumericControl.jsx";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toDisplay = (rawValue, scale, min, max) => {
	if (rawValue === undefined || rawValue === null || String(rawValue).trim() === "") return "";
	const numeric = Number(rawValue);
	if (!Number.isFinite(numeric)) return "";
	const display = clamp(numeric / scale, min, max);
	const rounded = Math.round(display);
	return String(rounded);
};

const fromDisplay = (nextValue, scale, min, max) => {
	if (nextValue === undefined || nextValue === null || nextValue === "") return "";
	const raw = String(nextValue).trim();
	if (!raw) return "";
	const numeric = Number(raw.replace("%", ""));
	if (!Number.isFinite(numeric)) return "";
	const clamped = clamp(numeric, min, max);
	return String(parseFloat((clamped * scale).toFixed(2)));
};

export const PercentControl = ({ value, onChange, min = 0, max = 100, step = 1, scale = 0.01 }) => {
	const displayValue = toDisplay(value, scale, min, max);

	return (
		<div className="motto-percent-control">
			<MottoNumberControl
				value={displayValue}
				onChange={(next) => onChange(fromDisplay(next, scale, min, max))}
				step={step}
				min={min}
				max={max}
				unit="%"
				showSlider
			/>
		</div>
	);
};
