import validCssProperties from "../../../config/styler-css-valid-properties.json";

const DEFAULT_PROPERTIES = Object.freeze(
	(Array.isArray(validCssProperties) ? validCssProperties : [])
		.map((entry) =>
			String(entry || "")
				.trim()
				.toLowerCase()
		)
		.filter((name) => Boolean(name) && !name.startsWith("-"))
);

const CACHE_DATA = Object.freeze({
	list: DEFAULT_PROPERTIES,
});

const RESOLVED_RULE_SET = new Set(DEFAULT_PROPERTIES);

export const getDefaultCssRules = () => DEFAULT_PROPERTIES;

export const areResolvedCssRulesReady = () => true;

export const isResolvedCssRuleName = (name) => {
	const key = String(name || "")
		.trim()
		.toLowerCase();
	if (!key) return false;
	return RESOLVED_RULE_SET.has(key);
};

export const onCssRulesReady = (callback) => {
	if (typeof callback === "function") {
		try {
			callback(CACHE_DATA);
		} catch {
			// Ignore subscriber errors.
		}
	}
	return () => {};
};

export const loadCssRulesData = async (options = {}) => {
	const { onUpdate } = options;
	if (typeof onUpdate === "function") {
		onUpdate(CACHE_DATA);
	}
	return CACHE_DATA;
};

export const loadCssRules = async () => DEFAULT_PROPERTIES;
