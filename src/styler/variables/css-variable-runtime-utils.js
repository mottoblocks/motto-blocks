export { getVariableNameFromRecord } from "@lib/css-variable-records.js";

export const getVariableValueFromRecord = (record) => {
	const raw = record?.meta?.motto_variable_value;
	return typeof raw === "string" ? raw : "";
};

export const normalizeVariableName = (rawName) => {
	const base = String(rawName || "").trim();
	if (!base) return "";
	const normalized = base
		.replace(/\s+/g, "-")
		.replace(/[^a-zA-Z0-9_\-]/g, "")
		.toLowerCase();
	if (!normalized) return "";
	return normalized.startsWith("--") ? normalized : `--${normalized}`;
};

export const sanitizeCssVariableValue = (rawValue) => {
	return String(rawValue || "")
		.replace(/[\r\n]/g, " ")
		.replace(/[<>{}]/g, "")
		.trim();
};

export const buildRootCss = (variables) => {
	if (!Array.isArray(variables) || variables.length === 0) return "";
	const declarations = new Map();
	variables.forEach(({ name, value }) => {
		if (!name || !value) return;
		declarations.set(name, value);
	});
	if (declarations.size === 0) return "";
	const rules = Array.from(declarations.entries()).map(([name, value]) => `${name}: ${value};`);
	return `:root{${rules.join("")}}`;
};
