const UNIT_STEPS = {
	px: 1,
	"%": 0.1,
	vw: 0.1,
	vh: 0.1,
	vmin: 0.1,
	vmax: 0.1,
	svw: 0.1,
	svh: 0.1,
	svi: 0.1,
	svb: 0.1,
	svmin: 0.1,
	svmax: 0.1,
	lvw: 0.1,
	lvh: 0.1,
	lvi: 0.1,
	lvb: 0.1,
	lvmin: 0.1,
	lvmax: 0.1,
	dvw: 0.1,
	dvh: 0.1,
	dvi: 0.1,
	dvb: 0.1,
	dvmin: 0.1,
	dvmax: 0.1,
	deg: 1,
	ms: 10,
	em: 0.01,
	rem: 0.01,
	ch: 0.01,
	ex: 0.01,
	pt: 1,
	pc: 1,
	cm: 0.001,
	mm: 0.1,
	in: 0.001,
	rad: 0.01,
	turn: 0.01,
	s: 0.1,
};

const UNIT_MAX = {
	px: 300,
	"%": 100,
	vw: 100,
	vh: 100,
	vmin: 100,
	vmax: 100,
	svw: 100,
	svh: 100,
	svi: 100,
	svb: 100,
	svmin: 100,
	svmax: 100,
	lvw: 100,
	lvh: 100,
	lvi: 100,
	lvb: 100,
	lvmin: 100,
	lvmax: 100,
	dvw: 100,
	dvh: 100,
	dvi: 100,
	dvb: 100,
	dvmin: 100,
	dvmax: 100,
	em: 50,
	rem: 10,
	ch: 20,
};

const normalizePositiveNumber = (value, fallback) => {
	const numeric = Number(value);
	if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
	return numeric;
};

export const getRangeStepByUnit = (unit, fallback = 1) => {
	const normalizedFallback = normalizePositiveNumber(fallback, 1);
	const key = String(unit || "")
		.trim()
		.toLowerCase();
	return normalizePositiveNumber(UNIT_STEPS[key], normalizedFallback);
};

export const getRangeMaxByUnit = (unit, fallback = 10) => {
	const normalizedFallback = normalizePositiveNumber(fallback, 10);
	const key = String(unit || "")
		.trim()
		.toLowerCase();
	return normalizePositiveNumber(UNIT_MAX[key], normalizedFallback);
};

export const getRangeShiftStepByUnit = (unit, stepFallback = 1, multiplier = 10) => {
	const step = getRangeStepByUnit(unit, stepFallback);
	const normalizedMultiplier = normalizePositiveNumber(multiplier, 10);
	return Number((step * normalizedMultiplier).toFixed(6));
};

export const normalizeUnitStep = (value) => {
	const numeric = Number(value);
	if (!Number.isFinite(numeric) || numeric <= 0) return undefined;
	return numeric;
};

export const getUnitConfig = (unit) => {
	const key = String(unit || "").toLowerCase();
	const max = getRangeMaxByUnit(key, 10);
	const step = getRangeStepByUnit(key, 0.1);
	const shiftStep = getRangeShiftStepByUnit(key, step);
	return { max, step, shiftStep };
};

export const applyStepToNumericValue = (numericValue, step, minimumValue = 0) => {
	const parsedNumber = Number(numericValue);
	if (!Number.isFinite(parsedNumber)) return Number.NaN;
	const safeStep = normalizeUnitStep(step) ?? 1;
	const stepped = Math.round(parsedNumber / safeStep) * safeStep;
	return Math.max(minimumValue, Number(stepped.toFixed(6)));
};
