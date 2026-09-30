import { isCssClassSlugCompatible, sanitizeCssClassSlugInput } from "../classes/css-class-slug";
import { isCssKeywordValue } from "@components/primitives/var-unit-utils.js";
import validCssProperties from "../../../config/styler-css-valid-properties.json";
import { splitCssAtDepthZero, tokenizeCssValue } from "./css-value-utils.js";

export const createInputGuards = ({
	blockedChars = ["<", "{", "}", ";"],
	sanitizePastedText = (text) => text,
	onCommit = null,
	getInputEl = null,
	getValue = null,
	setValue = null,
	shouldBlockKey = null,
} = {}) => {
	const blockedSet = new Set(blockedChars);
	const getInputFromEvent = (event) => {
		const target = event?.target;
		if (!target) return null;
		if (typeof target.selectionStart === "number" && typeof target.selectionEnd === "number")
			return target;
		return null;
	};

	const onKeyDown = (event) => {
		if (event.ctrlKey || event.metaKey || event.altKey) return;

		if (event.key && event.key.length === 1 && blockedSet.has(event.key)) {
			event.preventDefault();
			return;
		}

		if (event.key && event.key.length === 1 && typeof shouldBlockKey === "function") {
			const inputEl =
				(typeof getInputEl === "function" ? getInputEl() : null) ||
				getInputFromEvent(event);
			const currentValue = String(
				typeof getValue === "function" ? getValue() : inputEl?.value || ""
			);
			const selectionStart = inputEl?.selectionStart ?? currentValue.length;
			const selectionEnd = inputEl?.selectionEnd ?? selectionStart;
			const nextValue =
				currentValue.slice(0, selectionStart) +
				event.key +
				currentValue.slice(selectionEnd);

			if (
				shouldBlockKey({
					key: event.key,
					currentValue,
					nextValue,
					selectionStart,
					selectionEnd,
					event,
				})
			) {
				event.preventDefault();
			}
		}
	};

	const onPaste = (event) => {
		const raw = event.clipboardData?.getData("text") ?? "";
		const cleaned = sanitizePastedText(raw);
		if (cleaned === raw) return;
		event.preventDefault();

		const inputEl =
			(typeof getInputEl === "function" ? getInputEl() : null) || getInputFromEvent(event);
		const current = String(typeof getValue === "function" ? getValue() : inputEl?.value || "");
		if (!inputEl) {
			const next = current + cleaned;
			if (typeof setValue === "function") setValue(next);
			if (typeof onCommit === "function") onCommit(next);
			return;
		}

		const start = inputEl.selectionStart ?? current.length;
		const end = inputEl.selectionEnd ?? start;
		const next = current.slice(0, start) + cleaned + current.slice(end);

		if (typeof setValue === "function") setValue(next);
		if (typeof onCommit === "function") onCommit(next);

		requestAnimationFrame(() => {
			try {
				const pos = start + cleaned.length;
				inputEl.setSelectionRange(pos, pos);
			} catch {}
		});
	};

	return { onKeyDown, onPaste };
};

const CSS_PROP_NAME_PARTIAL_STANDARD = /^-?(?:[A-Za-z][A-Za-z0-9-]*)?$/;
const CSS_PROP_NAME_PARTIAL_CUSTOM = /^--[A-Za-z0-9_-]*$/;
const CSS_PROP_NAME_STANDARD = /^-?[A-Za-z][A-Za-z0-9-]*$/;
const CSS_PROP_NAME_CUSTOM = /^--[A-Za-z0-9_-]+$/;
const VALID_STANDARD_CSS_PROPERTIES = new Set(
	(Array.isArray(validCssProperties) ? validCssProperties : [])
		.map((entry) =>
			String(entry || "")
				.trim()
				.toLowerCase()
		)
		.filter(Boolean)
);

export const isPartialCssPropOrVarName = (value) => {
	const input = String(value || "");
	return CSS_PROP_NAME_PARTIAL_STANDARD.test(input) || CSS_PROP_NAME_PARTIAL_CUSTOM.test(input);
};

export const isCssPropOrVarName = (value) => {
	const input = String(value || "").trim();
	if (!input) return false;
	return CSS_PROP_NAME_STANDARD.test(input) || CSS_PROP_NAME_CUSTOM.test(input);
};

const isSupportedStandardCssProperty = (name) => {
	const normalizedName = String(name || "")
		.trim()
		.toLowerCase();
	if (!normalizedName || !CSS_PROP_NAME_STANDARD.test(normalizedName)) return false;
	return VALID_STANDARD_CSS_PROPERTIES.has(normalizedName);
};

export const isValidCssRuleName = (value) => {
	const input = String(value || "")
		.trim()
		.toLowerCase();
	if (!input) return false;
	if (CSS_PROP_NAME_CUSTOM.test(input)) return true;
	if (!CSS_PROP_NAME_STANDARD.test(input)) return false;
	return isSupportedStandardCssProperty(input);
};

const isValidCssVarCall = (value, startIndex) => {
	const text = String(value || "");
	const openAt = text.indexOf("var(", startIndex);
	if (openAt < 0) return true;
	let index = openAt + 4;
	let depth = 1;
	while (index < text.length) {
		const char = text[index];
		if (char === "(") {
			depth += 1;
		} else if (char === ")") {
			depth -= 1;
			if (depth === 0) {
				const rawArgs = text.slice(openAt + 4, index);
				const args = rawArgs.trim();
				if (!args) return false;
				const commaIndex = args.indexOf(",");
				const varName = (commaIndex >= 0 ? args.slice(0, commaIndex) : args).trim();
				if (!/^--[A-Za-z0-9_\-]+$/.test(varName)) return false;
				return true;
			}
		}
		index += 1;
	}
	return false;
};

export const isValidCssValue = (rawValue) => {
	const value = String(rawValue || "");
	let searchFrom = 0;
	while (true) {
		const next = value.indexOf("var(", searchFrom);
		if (next < 0) return true;
		if (!isValidCssVarCall(value, next)) return false;
		searchFrom = next + 4;
	}
};

export const hasMixedCssWideKeywordValue = (rawValue) => {
	const value = String(rawValue || "").trim();
	if (!value) return false;
	const tokens = splitCssAtDepthZero(value).flatMap((part) => tokenizeCssValue(part));
	if (tokens.length <= 1) return false;
	return tokens.some((token) => isCssKeywordValue(token));
};

const sanitizeCssClassSlugPaste = (text) => sanitizeCssClassSlugInput(text);

const isPartialCssClassSlug = (value) => {
	const input = String(value || "");
	if (input === "") return true;
	return isCssClassSlugCompatible(input);
};

const shouldBlockCssClassSlugKey = ({ nextValue }) => {
	const sanitized = sanitizeCssClassSlugInput(nextValue);
	if (sanitized !== nextValue) return true;
	return !isPartialCssClassSlug(nextValue);
};

export const createCssClassSlugGuards = (opts = {}) =>
	createInputGuards({
		blockedChars: [".", " ", "\t", "\n", "\r", "<", ">", "{", "}", ";"],
		sanitizePastedText: sanitizeCssClassSlugPaste,
		shouldBlockKey: shouldBlockCssClassSlugKey,
		...opts,
	});

export const sanitizeInnerSelectorText = (text) => {
	if (typeof text !== "string") return "";
	return text
		.replace(/[\r\n]/g, " ")
		.replace(/[{}<;]/g, "")
		.replace(/<\/?style/gi, "")
		.replace(/<\/?script/gi, "")
		.replace(/\s+/g, " ");
};

export const createInnerSelectorGuards = (opts = {}) =>
	createInputGuards({
		blockedChars: ["<", "{", "}", ";"],
		sanitizePastedText: sanitizeInnerSelectorText,
		...opts,
	});
