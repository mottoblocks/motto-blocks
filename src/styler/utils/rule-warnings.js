import { hasMixedCssWideKeywordValue, isValidCssRuleName, isValidCssValue } from "./input-guards";
import { toComparableRuleName } from "./css-row-metadata";

export const BLOCK_SPACING_CONFLICT_PROPS = new Set([
	"gap",
	// Intentionally not warning for margin variants: blockSpacing only owns
	// sibling spacing output, while users may still need block margin rules.
]);

export const DEFAULT_RULE_WARNING_MESSAGES = Object.freeze({
	duplicate: "This rule appears more than once.",
	dependency: "This rule depends on another rule.",
	invalidName: "Invalid CSS rule name.",
	invalidValue: "Invalid CSS value.",
	mixedCssWideKeyword:
		"CSS-wide keywords like inherit should usually be used as the whole value. Browsers may ignore this declaration.",
	blockSpacingConflict: "This rule may conflict with Block Spacing.",
});

const normalizeAcceptedValues = (values) =>
	(Array.isArray(values) ? values : [])
		.map((entry) =>
			String(entry || "")
				.trim()
				.toLowerCase()
		)
		.filter(Boolean);

export const getStylerRuleWarnings = ({
	ruleName = "",
	ruleCompareKey = "",
	ruleKey = "",
	value = "",
	cssNameCounts = new Map(),
	cssValuesByProp = new Map(),
	requires = [],
	blockSpacingEnabled = false,
	messages = DEFAULT_RULE_WARNING_MESSAGES,
} = {}) => {
	const resolvedMessages = {
		...DEFAULT_RULE_WARNING_MESSAGES,
		...(messages || {}),
	};
	const rawName = String(ruleName || "").trim();
	const comparableName = ruleCompareKey || toComparableRuleName(rawName);
	const normalizedRuleKey = String(ruleKey || rawName)
		.trim()
		.toLowerCase();
	const rawValue = String(value || "");

	let duplicateWarning = "";
	if (comparableName && (cssNameCounts.get(comparableName) || 0) > 1) {
		duplicateWarning = resolvedMessages.duplicate;
	}

	let dependencyWarning = "";
	if (normalizedRuleKey) {
		const unmet = (Array.isArray(requires) ? requires : []).filter((rule) => {
			const depRule = toComparableRuleName(rule?.prop || "");
			if (!depRule) return false;
			const existingValues = cssValuesByProp.get(depRule) || [];
			if (existingValues.length === 0) return true;
			const accepted = normalizeAcceptedValues(rule?.values);
			if (accepted.length === 0) return false;
			return !existingValues.some((existing) => accepted.includes(existing.toLowerCase()));
		});

		if (unmet.length > 0) {
			const first = unmet[0];
			const depRule = String(first?.prop || "").trim();
			const accepted = Array.isArray(first?.values) ? first.values.filter(Boolean) : [];
			if (depRule) {
				dependencyWarning =
					accepted.length === 0
						? resolvedMessages.dependency
						: `Requires ${depRule}: ${accepted.join(" | ")}`;
			}
		}
	}

	const invalidValueWarning =
		rawValue && !isValidCssValue(rawValue)
			? resolvedMessages.invalidValue
			: rawValue && hasMixedCssWideKeywordValue(rawValue)
				? resolvedMessages.mixedCssWideKeyword
				: "";

	return {
		duplicateWarning,
		dependencyWarning,
		invalidNameWarning:
			rawName && !isValidCssRuleName(rawName) ? resolvedMessages.invalidName : "",
		invalidValueWarning,
		blockSpacingConflictWarning:
			blockSpacingEnabled &&
			normalizedRuleKey &&
			BLOCK_SPACING_CONFLICT_PROPS.has(normalizedRuleKey)
				? resolvedMessages.blockSpacingConflict
				: "",
	};
};
