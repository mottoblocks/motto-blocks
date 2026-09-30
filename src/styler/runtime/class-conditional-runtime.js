import { getResolvedBreakpointsConfig } from "../config/styler-breakpoints.js";
import conditionalRulesConfig from "../../../config/motto-conditional-classes.json";

const normalizeBreakpoints = (input) => {
	const source = input && typeof input === "object" ? input : {};
	const entries = Object.entries(source);
	const out = {};
	if (entries.length === 0) return getResolvedBreakpointsConfig();
	entries.forEach(([key, value]) => {
		if (!value || typeof value !== "object") return;
		const media = typeof value.media === "string" ? value.media : "";
		const maxWidth = Number.isFinite(value.maxWidth) ? value.maxWidth : null;
		out[key] = { media, maxWidth };
	});
	return Object.keys(out).length ? out : getResolvedBreakpointsConfig();
};

const buildMediaFromWidth = (width) =>
	Number.isFinite(width) && width > 0 ? `@media (max-width: ${width}px)` : "";

export const getSharedBreakpoints = () => {
	const config = getResolvedBreakpointsConfig();
	const out = normalizeBreakpoints(config);
	Object.keys(out).forEach((key) => {
		const bp = out[key];
		if (!bp.media && Number.isFinite(bp.maxWidth)) {
			bp.media = buildMediaFromWidth(bp.maxWidth);
		}
	});
	return out;
};

export const getBreakpointMediaMap = () => {
	const breakpoints = getSharedBreakpoints();
	const media = {};
	Object.keys(breakpoints).forEach((key) => {
		media[key] = typeof breakpoints[key].media === "string" ? breakpoints[key].media : "";
	});
	return media;
};

const getClassRules = () => (Array.isArray(conditionalRulesConfig) ? conditionalRulesConfig : []);

const templateClass = (template, vars) => {
	let out = String(template);
	Object.keys(vars).forEach((key) => {
		const value = String(vars[key]);
		out = out.split(`{${key}}`).join(value);
	});
	return out;
};

const sanitizeConditionalClassName = (value) =>
	String(value || "")
		.trim()
		.replace(/^\./, "")
		.replace(/\s+/g, "")
		.replace(/[^A-Za-z0-9_-]/g, "");

const normalizeMatchType = (value) => {
	const raw = String(value || "").trim();
	if (!raw) return "equals";
	return raw;
};

const isNotExistsType = (type) =>
	type === "notExists" || type === "not_exists" || type === "not-exists";

const ruleMatches = (rule, prop, value, matchOverride = null) => {
	const match =
		matchOverride && typeof matchOverride === "object" ? matchOverride : rule?.match || {};
	const type = normalizeMatchType(match?.type);
	if (type === "exists") return true;
	if (isNotExistsType(type)) return false;
	if (type === "equals") return value === (typeof match?.value === "string" ? match.value : "");
	if (type === "in") {
		const list = Array.isArray(match?.value) ? match.value.map(String) : [];
		return list.includes(value);
	}
	if (type === "contains") {
		const needle = typeof match?.value === "string" ? match.value : "";
		return needle ? value.includes(needle) : false;
	}
	if (type === "regex") {
		const pattern = typeof match?.value === "string" ? match.value : "";
		if (!pattern) return false;
		try {
			return new RegExp(pattern).test(value);
		} catch {
			return false;
		}
	}
	return false;
};

const resolveRuleConditions = (rule) => {
	if (Array.isArray(rule?.conditions) && rule.conditions.length > 0) {
		return rule.conditions;
	}
	if (typeof rule?.prop === "string" && rule.prop) {
		return [
			{
				prop: rule.prop,
				match:
					typeof rule.match === "object" && rule.match ? rule.match : { type: "exists" },
			},
		];
	}
	return [];
};

const resolveFoundValues = (propMap, condProp, normalize) => {
	if (!normalize) return propMap[condProp] ?? null;
	const condPropLc = String(condProp || "").toLowerCase();
	const entries = Object.entries(propMap);
	for (let i = 0; i < entries.length; i += 1) {
		const [propName, values] = entries[i];
		if (String(propName || "").toLowerCase() === condPropLc) {
			return values;
		}
	}
	return null;
};

const resolveRuleTemplates = (rule) => {
	if (Array.isArray(rule?.class)) return rule.class.map(String);
	if (typeof rule?.class === "string" && rule.class) return [rule.class];
	return [];
};

export const collectConditionalClassesWithRules = (
	mottoStyler,
	{ rules = getClassRules(), breakpoints = getSharedBreakpoints() } = {}
) => {
	const ruleList = Array.isArray(rules) ? rules : [];
	const breakpointMap = breakpoints && typeof breakpoints === "object" ? breakpoints : {};
	const classes = [];

	Object.keys(breakpointMap).forEach((bpKey) => {
		const rows = Array.isArray(mottoStyler?.css?.[bpKey]) ? mottoStyler.css[bpKey] : [];
		const propMap = {};
		rows.forEach((row) => {
			const name = typeof row?.name === "string" ? row.name.trim() : "";
			const value = typeof row?.value === "string" ? row.value.trim() : "";
			if (!name) return;
			if (!propMap[name]) propMap[name] = [];
			propMap[name].push(value);
		});

		ruleList.forEach((rule) => {
			if (!rule || typeof rule !== "object") return;
			const ruleBps = rule.breakpoints ?? "*";
			if (ruleBps !== "*") {
				const list = Array.isArray(ruleBps) ? ruleBps : [String(ruleBps)];
				if (!list.includes(bpKey)) return;
			}
			const normalize = Boolean(rule.normalize);
			const ruleId = typeof rule.id === "string" ? rule.id : "";
			const conditions = resolveRuleConditions(rule);
			if (conditions.length === 0) return;

			let allOk = true;
			let primaryProp = "";
			let primaryValues = [];
			for (const condition of conditions) {
				const condProp = typeof condition?.prop === "string" ? condition.prop.trim() : "";
				const condMatch =
					typeof condition?.match === "object" ? condition.match : { type: "exists" };
				const condType = normalizeMatchType(condMatch?.type);
				const condIsNotExists = isNotExistsType(condType);
				if (!condProp) {
					allOk = false;
					break;
				}
				const foundValues = resolveFoundValues(propMap, condProp, normalize);
				if (!foundValues || foundValues.length === 0) {
					if (condIsNotExists) {
						if (!primaryProp) {
							primaryProp = condProp;
							primaryValues = [];
						}
						continue;
					}
					allOk = false;
					break;
				}
				if (condIsNotExists) {
					allOk = false;
					break;
				}

				let oneOk = false;
				const matchedValues = [];
				for (const value of foundValues) {
					const normalizedValue = normalize
						? String(value).trim().toLowerCase()
						: String(value).trim();
					if (ruleMatches(rule, condProp, normalizedValue, condMatch)) {
						oneOk = true;
						matchedValues.push(normalizedValue);
					}
				}
				if (!oneOk) {
					allOk = false;
					break;
				}
				if (!primaryProp) {
					primaryProp = condProp;
					primaryValues = Array.from(new Set(matchedValues.map(String)));
				}
			}
			if (!allOk) return;

			const templates = resolveRuleTemplates(rule);
			if (templates.length === 0) return;

			const vars = {
				bp: bpKey,
				id: ruleId,
				prop: primaryProp,
				value: primaryValues.length > 0 ? String(primaryValues[0]) : "",
			};

			templates.forEach((template) => {
				if (String(template).includes("{value}") && primaryValues.length > 1) {
					primaryValues.forEach((matchedValue) => {
						const className = sanitizeConditionalClassName(
							templateClass(template, { ...vars, value: String(matchedValue) })
						);
						if (className && !classes.includes(className)) {
							classes.push(className);
						}
					});
					return;
				}
				const className = sanitizeConditionalClassName(templateClass(template, vars));
				if (className && !classes.includes(className)) {
					classes.push(className);
				}
			});
		});
	});

	return classes;
};

export const collectConditionalClasses = (mottoStyler) =>
	collectConditionalClassesWithRules(mottoStyler);
