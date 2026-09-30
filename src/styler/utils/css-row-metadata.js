export const toComparableRuleName = (name) => {
	const trimmed = String(name || "").trim();
	if (!trimmed) return "";
	if (trimmed.startsWith("--")) return trimmed;
	return trimmed.toLowerCase();
};

export const collectCssRowMetadata = (rows = []) => {
	const counts = new Map();
	const valuesByProp = new Map();

	(Array.isArray(rows) ? rows : []).forEach((entry) => {
		const key = toComparableRuleName(entry?.name || "");
		if (!key) return;
		counts.set(key, (counts.get(key) || 0) + 1);
		const nextValue = String(entry?.value || "").trim();
		if (!nextValue) return;
		if (!valuesByProp.has(key)) valuesByProp.set(key, []);
		valuesByProp.get(key).push(nextValue);
	});

	return {
		cssNameCounts: counts,
		cssValuesByProp: valuesByProp,
	};
};

// Breakpoints are desktop-first (config/motto-breakpoints.json): `desktop` ships
// unwrapped and each narrower breakpoint only wins via `max-width` overrides for the
// props it redeclares. So a prop declared on a wider breakpoint (e.g. `display: flex`
// on desktop) is still in effect on a narrower one that doesn't redeclare it. Walk
// wide -> narrow up to (and including) `currentBreakpoint`, letting each breakpoint's
// own declaration override the carried-forward value, same as the `carry` resolution
// in style-engine.jsx's buildDisplayLayerByBp — but generalized to any prop, since
// this feeds the "requires" dependency check, not just derived display/gap CSS.
export const resolveCascadedCssValuesByProp = (
	rowsByBreakpoint,
	breakpointOrder,
	currentBreakpoint
) => {
	const order = Array.isArray(breakpointOrder) ? breakpointOrder : [];
	const cutoff = order.indexOf(currentBreakpoint);
	const upToCurrent = cutoff === -1 ? order : order.slice(0, cutoff + 1);

	const cascaded = new Map();
	upToCurrent.forEach((bp) => {
		const rows = Array.isArray(rowsByBreakpoint?.[bp]) ? rowsByBreakpoint[bp] : [];
		const { cssValuesByProp } = collectCssRowMetadata(rows);
		cssValuesByProp.forEach((values, prop) => cascaded.set(prop, values));
	});

	return cascaded;
};
