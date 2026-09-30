import { useEffect, useRef, useState } from "@wordpress/element";
import { MODE_CUSTOM, MODE_PRESET, detectValueMode } from "../utils/value-mode.js";

export { MODE_CSS, MODE_CUSTOM, MODE_PRESET, detectValueMode } from "../utils/value-mode.js";

/**
 * Tracks, per row key (side/corner/etc.), which of the three editors — preset
 * slider, custom numeric input, or free-text css — is shown. Shared by
 * SpacingControl and BorderRadiusControl. Switching it never changes the
 * value on its own — like core's `showCustomValueControl`. The incoming
 * values are watched so a fresh non-preset value (undo/redo, external change)
 * reveals the matching editor for that row, mirroring core.
 *
 * `defaultMode` ("preset" | "custom") only affects the PRISTINE case — a row
 * whose value is truly empty, with nothing yet chosen. It never overrides an
 * already-meaningful value: "0" (None preset), "auto", a real preset token, a
 * real custom value, or a real css value all keep deciding their own mode via
 * `detectValueMode`, exactly as before this parameter existed.
 */
export const useSlotValueMode = (keys, values, getValue, defaultMode = MODE_PRESET) => {
	const [modeByKey, setModeByKey] = useState(() => {
		const initial = {};
		keys.forEach((key) => {
			const raw = String(getValue(values, key) ?? "").trim();
			initial[key] =
				raw === ""
					? defaultMode === MODE_CUSTOM
						? MODE_CUSTOM
						: MODE_PRESET
					: detectValueMode(raw);
		});
		return initial;
	});

	const prevValuesRef = useRef(values);
	useEffect(() => {
		const prev = prevValuesRef.current;
		prevValuesRef.current = values;
		setModeByKey((current) => {
			let changed = false;
			const next = { ...current };
			keys.forEach((key) => {
				const raw = String(getValue(values, key) ?? "").trim();
				const prevRaw = String(getValue(prev, key) ?? "").trim();
				if (raw !== prevRaw && current[key] === MODE_PRESET) {
					const detected = detectValueMode(raw);
					if (detected !== MODE_PRESET) {
						next[key] = detected;
						changed = true;
					}
				}
			});
			return changed ? next : current;
		});
		// keys/getValue are stable module-level references from callers.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [values]);

	return [modeByKey, setModeByKey];
};
