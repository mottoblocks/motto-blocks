import { getBreakpointMediaMap } from "./class-conditional-runtime";
import { applyFilters } from "@wordpress/hooks";
import { STYLER_HOOKS } from "../freepro/freepro-ids";
import {
	normalizeBlockSelectorsByBreakpoint,
	migrateEntryToTemplate,
	SELECTOR_TOKEN,
} from "../utils/block-selectors-shape";
import { isValidCssRuleName, isValidCssValue } from "../utils/input-guards";
import editorImportantRules from "../data/motto-editor-important-rules.json";
import cssOutputOrderConfig from "../data/motto-css-output-order.json";
import { getMottoBaseLayoutDisplay } from "../layout/base-layout";
import { getLayoutFlagsForDisplay } from "../layout/display";
import { sanitizeInstanceId } from "../utils/instance-id";
import { splitTopLevelSpaceTokens } from "../utils/spacing-value-utils";
import { BREAKPOINT_KEYS } from "../config/styler-breakpoints.js";
import {
	buildClassDisplayLayerByBp,
	buildDisplayLayerByBp,
	getEffectiveDisplayValue,
} from "../utils/display-cascade";

const MEDIA = getBreakpointMediaMap();
const EDITOR_IMPORTANT_RULES = new Set(
	Array.isArray(editorImportantRules?.rules)
		? editorImportantRules.rules
				.map((rule) =>
					String(rule || "")
						.trim()
						.toLowerCase()
				)
				.filter(Boolean)
		: []
);
const BREAKPOINT_ORDER = Array.isArray(cssOutputOrderConfig?.breakpointsOrder)
	? cssOutputOrderConfig.breakpointsOrder
	: BREAKPOINT_KEYS;

const BLOCK_GAP_VALUE = "var(--wp--style--block-gap, 1em)";

const getBlockSpacingVerticalValue = (value) => {
	const parts = splitTopLevelSpaceTokens(value);
	return parts[0] || "";
};

const buildResolvedBlockSpacingByBp = (blockSpacingMap, orderedBreakpoints) => {
	const resolved = {};
	let carry = "";
	orderedBreakpoints.forEach((bp) => {
		const declared =
			typeof blockSpacingMap?.[bp] === "string" ? blockSpacingMap[bp].trim() : "";
		if (declared) carry = declared;
		resolved[bp] = carry;
	});
	return resolved;
};

const buildDerivedLayoutRulesForSelector = (selector, displayValue, gapValue) => {
	if (!selector || !displayValue) return "";
	const { isGapLayout, isBlockLayout } = getLayoutFlagsForDisplay(displayValue);
	if (!isGapLayout && !isBlockLayout) return "";
	const bareSelector = selector.replace(/^(?:html)?:root\s+/, "");
	let css = `${bareSelector} > *{margin-block:0;}`;
	if (isGapLayout) css += `${bareSelector}{gap:${gapValue};}`;
	if (isBlockLayout)
		css += `${bareSelector} > * + *{margin-block-start:${getBlockSpacingVerticalValue(gapValue)};}`;
	return css;
};

// Sanitizes a composite selector template. Preserves the &{block} token; removes other dangerous chars.
const TOKEN_PLACEHOLDER = "\x00";
const sanitizeCompositeTemplate = (value) => {
	if (typeof value !== "string") return "";
	return value
		.replaceAll(SELECTOR_TOKEN, TOKEN_PLACEHOLDER)
		.replace(/[{};<]/g, "")
		.replaceAll(TOKEN_PLACEHOLDER, SELECTOR_TOKEN);
};

const joinInnerSelector = (baseSelector, selectorTemplate) => {
	const safe = sanitizeCompositeTemplate(selectorTemplate);
	if (!safe.includes(SELECTOR_TOKEN)) return "";
	return safe.replaceAll(SELECTOR_TOKEN, baseSelector);
};

const withRootScope = (selector) => {
	const normalized = typeof selector === "string" ? selector.trim() : "";
	if (!normalized) return "";
	if (/^(?:html)?:root/.test(normalized)) return normalized;
	return `:root ${normalized}`;
};

const buildDeclarations = (rows, { forceImportant = false } = {}) => {
	if (!Array.isArray(rows) || rows.length === 0) return "";
	const decls = [];
	rows.forEach((row) => {
		const name = typeof row?.name === "string" ? row.name.trim() : "";
		const value = typeof row?.value === "string" ? row.value.trim() : "";
		if (!name || !value) return;
		if (!isValidCssRuleName(name) || !isValidCssValue(value)) return;
		const safeValue = value
			.replace(/[\r\n]/g, " ")
			.replace(/[<>]/g, "")
			.replace(/[{}]/g, "")
			.replace(/<\/?style/gi, "")
			.replace(/<\/?script/gi, "");
		const needsImportant = forceImportant || EDITOR_IMPORTANT_RULES.has(name.toLowerCase());
		decls.push(`${name}:${safeValue}${needsImportant ? " !important" : ""};`);
	});
	return decls.join("");
};

const buildBaseRulesForBp = (baseSelector, mottoStyler, bp) => {
	const rows = Array.isArray(mottoStyler?.css?.[bp]) ? mottoStyler.css[bp] : [];
	const decls = buildDeclarations(rows);
	if (!decls) return "";
	return `${baseSelector}{${decls}}`;
};

const toBareSelector = (selector) => {
	const s = String(selector || "").trim();
	return s.replace(/^(?:html)?:root\s+/, "");
};

const splitTopLevelSelectors = (selector) => {
	const result = [];
	let current = "";
	let parenDepth = 0;

	for (let i = 0; i < selector.length; i++) {
		const char = selector[i];
		if (char === "(") parenDepth++;
		else if (char === ")") parenDepth--;
		else if (char === "," && parenDepth === 0) {
			result.push(current.trim());
			current = "";
			continue;
		}
		current += char;
	}

	if (current.trim()) result.push(current.trim());
	return result;
};

const applyRootScopeToTopLevelSelectors = (selector) => {
	const parts = splitTopLevelSelectors(selector);
	return parts.map((s) => (/^(?:html)?:root/.test(s) ? s : `:root ${s}`)).join(", ");
};

const buildInnerSelectorRulesForBp = (baseSelector, blockByBp, bp) => {
	const list = blockByBp?.[bp];
	if (!Array.isArray(list) || list.length === 0) return "";
	let css = "";
	const bareSelector = toBareSelector(baseSelector);
	list.forEach((sub) => {
		const template = migrateEntryToTemplate(sub);
		const fullSelector = joinInnerSelector(bareSelector, template);
		if (!fullSelector) return;
		const scopedFullSelector = applyRootScopeToTopLevelSelectors(fullSelector);
		const rows = Array.isArray(sub?.css) ? sub.css : [];
		const decls = buildDeclarations(rows);
		const subDisplay = getEffectiveDisplayValue(rows);
		const derivedLayout = subDisplay
			? buildDerivedLayoutRulesForSelector(scopedFullSelector, subDisplay, BLOCK_GAP_VALUE)
			: "";
		if (!decls && !derivedLayout) return;
		if (decls) css += `${scopedFullSelector}{${decls}}`;
		css += derivedLayout;
	});
	return css;
};

export const buildEditorCssForSelector = (
	baseSelector,
	mottoStyler,
	classMottoStylers = [],
	options = {}
) => {
	const scopedBaseSelector = withRootScope(baseSelector);
	if (!scopedBaseSelector) return "";
	let out = "";
	const orderedBreakpoints = [
		...BREAKPOINT_ORDER,
		...Object.keys(MEDIA).filter((bp) => !BREAKPOINT_ORDER.includes(bp)),
	];
	const rawSelectors =
		mottoStyler?.blockSelectors !== undefined
			? mottoStyler.blockSelectors
			: mottoStyler?.innerSelectors;
	const blockSelectorsByBp = normalizeBlockSelectorsByBreakpoint(rawSelectors);
	const instanceDisplayLayer = buildDisplayLayerByBp(mottoStyler?.css, orderedBreakpoints);
	const classDisplayLayer = buildClassDisplayLayerByBp(classMottoStylers, orderedBreakpoints);
	const baseDisplay = getMottoBaseLayoutDisplay(options?.baseLayout);
	const resolvedBlockSpacingByBp = buildResolvedBlockSpacingByBp(
		mottoStyler?.blockSpacing?.values,
		orderedBreakpoints
	);
	orderedBreakpoints.forEach((bp) => {
		const resolvedDisplay =
			instanceDisplayLayer.resolvedByBp?.[bp] ||
			classDisplayLayer.resolvedByBp?.[bp] ||
			baseDisplay ||
			"";
		let cssForBp = buildBaseRulesForBp(scopedBaseSelector, mottoStyler, bp);
		const derivedLayoutCss = applyFilters(STYLER_HOOKS.derivedLayoutCss, "", {
			breakpoint: bp,
			selector: scopedBaseSelector,
			displayValue: resolvedDisplay,
			mottoStyler,
			classMottoStylers,
			baseLayout: options?.baseLayout || "",
			blockGapValue: BLOCK_GAP_VALUE,
			resolvedBlockSpacingByBp,
			orderedBreakpoints,
		});
		if (derivedLayoutCss) {
			cssForBp += String(derivedLayoutCss);
		}
		cssForBp += buildInnerSelectorRulesForBp(scopedBaseSelector, blockSelectorsByBp, bp);
		if (!cssForBp) return;
		const media = typeof MEDIA[bp] === "string" ? MEDIA[bp] : "";
		if (!media) {
			out += cssForBp;
			return;
		}
		out += `${media}{${cssForBp}}`;
	});
	return out;
};

export const buildEditorCss = (instanceId, mottoStyler, classMottoStylers = [], options = {}) => {
	const safeId = sanitizeInstanceId(instanceId);
	if (!safeId) return "";
	const primarySelector = `html:root .motto-styler-${safeId}`;
	return (
		buildEditorCssForSelector(primarySelector, mottoStyler, classMottoStylers, options) || ""
	);
};
