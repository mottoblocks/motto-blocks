import { normalizeMottoStyler } from "../utils/normalize-motto-styler";
import { isValidCssRuleName, isValidCssValue } from "../utils/input-guards";

const toRowId = (propName) =>
	`styler-${String(propName || "")
		.trim()
		.toLowerCase()}`;

export const normalizeMottoProps = (rawValue) => {
	return normalizeMottoStyler(rawValue, {
		includeBlockSelectors: false,
	});
};

export const getDesktopCssRows = (mottoStyler) => normalizeMottoProps(mottoStyler).css.desktop;

export const getDesktopCssValue = (mottoStyler, propName) => {
	const targetName = String(propName || "")
		.trim()
		.toLowerCase();
	if (!targetName) return "";

	const row = getDesktopCssRows(mottoStyler).find(
		(item) =>
			String(item?.name || "")
				.trim()
				.toLowerCase() === targetName
	);

	return typeof row?.value === "string" ? row.value : "";
};

export const setDesktopCssValue = (mottoStyler, propName, nextValue) => {
	const normalized = normalizeMottoProps(mottoStyler);
	const targetName = String(propName || "")
		.trim()
		.toLowerCase();
	const value = String(nextValue || "").trim();

	if (!targetName) {
		return normalized;
	}

	const nextDesktopRows = [...normalized.css.desktop];
	const existingIndex = nextDesktopRows.findIndex(
		(item) =>
			String(item?.name || "")
				.trim()
				.toLowerCase() === targetName
	);

	if (!value) {
		if (existingIndex >= 0) {
			nextDesktopRows.splice(existingIndex, 1);
		}
	} else if (existingIndex >= 0) {
		nextDesktopRows[existingIndex] = {
			...nextDesktopRows[existingIndex],
			id: nextDesktopRows[existingIndex]?.id || toRowId(targetName),
			name: targetName,
			value,
		};
	} else {
		nextDesktopRows.push({
			id: toRowId(targetName),
			name: targetName,
			value,
		});
	}

	return {
		...normalized,
		css: {
			...normalized.css,
			desktop: nextDesktopRows,
		},
	};
};

export const createDesktopCssRow = (name = "", value = "") => ({
	id: toRowId(
		`${name || "rule"}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
	),
	name: String(name || "")
		.trim()
		.toLowerCase(),
	value: String(value || "").trim(),
});

export const updateDesktopCssRow = (mottoStyler, rowId, nextPartial = {}) => {
	const normalized = normalizeMottoProps(mottoStyler);
	const targetId = String(rowId || "").trim();
	if (!targetId) return normalized;

	return {
		...normalized,
		css: {
			...normalized.css,
			desktop: normalized.css.desktop.map((row) =>
				String(row?.id || "").trim() === targetId
					? {
							...row,
							...nextPartial,
							name: Object.prototype.hasOwnProperty.call(nextPartial, "name")
								? String(nextPartial.name || "")
										.trim()
										.toLowerCase()
								: row?.name,
							value: Object.prototype.hasOwnProperty.call(nextPartial, "value")
								? String(nextPartial.value || "").trim()
								: row?.value,
						}
					: row
			),
		},
	};
};

export const appendDesktopCssRow = (mottoStyler, nextRow) => {
	const normalized = normalizeMottoProps(mottoStyler);
	const row = nextRow && typeof nextRow === "object" ? nextRow : createDesktopCssRow();

	return {
		...normalized,
		css: {
			...normalized.css,
			desktop: [...normalized.css.desktop, row],
		},
	};
};

export const removeDesktopCssRow = (mottoStyler, rowId) => {
	const normalized = normalizeMottoProps(mottoStyler);
	const targetId = String(rowId || "").trim();
	if (!targetId) return normalized;

	return {
		...normalized,
		css: {
			...normalized.css,
			desktop: normalized.css.desktop.filter(
				(row) => String(row?.id || "").trim() !== targetId
			),
		},
	};
};

const toReactStyleKey = (propName) => {
	if (String(propName || "").startsWith("--")) {
		return propName;
	}

	return String(propName || "")
		.trim()
		.replace(/-([a-z])/g, (_match, char) => char.toUpperCase());
};

export const buildDesktopStyleObject = (mottoStyler) => {
	const style = {};

	getDesktopCssRows(mottoStyler).forEach((row) => {
		const name = String(row?.name || "")
			.trim()
			.toLowerCase();
		const value = String(row?.value || "").trim();

		if (!name || !value) {
			return;
		}
		if (!isValidCssRuleName(name) || !isValidCssValue(value)) {
			return;
		}

		style[toReactStyleKey(name)] = value;
	});

	return style;
};
