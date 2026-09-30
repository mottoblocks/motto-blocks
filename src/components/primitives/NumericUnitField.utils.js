import { getRangeStepByUnit } from "./range-unit-steps.js";

const toUnitValue = (unit) =>
	String(unit || "")
		.trim()
		.toLowerCase();

export const resolveNumericUnitOptions = (units, step = 1) => {
	if (!Array.isArray(units) || units.length === 0) return [];
	return units
		.map((entry) => {
			if (typeof entry === "string") {
				const entryValue = entry.trim();
				if (!entryValue) return null;
				return {
					value: entryValue,
					label: entryValue,
					step: getRangeStepByUnit(entryValue, step ?? 1),
				};
			}
			const entryValue = String(entry?.value ?? "").trim();
			if (!entryValue && !("value" in (entry || {}))) return null;
			const nextStep = Number(entry?.step);
			return {
				...entry,
				value: entryValue,
				step:
					Number.isFinite(nextStep) && nextStep > 0
						? nextStep
						: getRangeStepByUnit(entryValue, step ?? 1),
			};
		})
		.filter(Boolean);
};

export const resolveNumericUnitValue = ({
	unit = "",
	hasUnits = false,
	resolvedUnits = [],
	parsedUnit = "",
	initialUnit = "",
} = {}) => {
	const hasFixedUnit = String(unit || "").trim() !== "";
	if (hasFixedUnit) return toUnitValue(unit);
	if (!hasUnits) return "";
	const allowedUnits = new Set(resolvedUnits.map((entry) => toUnitValue(entry?.value ?? "")));
	const normalizedParsedUnit = toUnitValue(parsedUnit);
	if (allowedUnits.has(normalizedParsedUnit)) return normalizedParsedUnit;
	return toUnitValue(initialUnit) || toUnitValue(resolvedUnits[0]?.value || "") || "";
};
