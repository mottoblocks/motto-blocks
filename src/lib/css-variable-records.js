export const CSS_VARIABLE_POST_TYPE = "motto_css_variable";

export const CSS_VARIABLE_PUBLISHED_QUERY_BASE = Object.freeze({
	per_page: 100,
	status: "publish",
	_fields: ["id", "slug", "title", "meta"],
	context: "edit",
	orderby: "title",
	order: "asc",
});

export const getVariableNameFromRecord = (record) => {
	const rawMetaName = record?.meta?.motto_variable_name;
	if (typeof rawMetaName === "string" && rawMetaName.trim() !== "") {
		return rawMetaName.trim();
	}
	if (typeof record?.title?.rendered === "string" && record.title.rendered.trim() !== "") {
		return record.title.rendered.trim();
	}
	if (typeof record?.title === "string" && record.title.trim() !== "") {
		return record.title.trim();
	}
	return typeof record?.slug === "string" ? record.slug.trim() : "";
};

export const normalizeVariableLabel = (value) => {
	const name = String(value || "").trim();
	if (!name) return "";
	return name.startsWith("--") ? name : `--${name}`;
};

export const createCssVariableSuggestionsFromRecords = (records) => {
	const list = Array.isArray(records) ? records : [];
	const seen = new Set();

	return list
		.map((record) => {
			const name = normalizeVariableLabel(getVariableNameFromRecord(record));
			if (!name) return null;
			const key = name.toLowerCase();
			if (seen.has(key)) return null;
			seen.add(key);
			return {
				label: name,
				value: name,
				meta: String(record?.meta?.motto_variable_value || "").trim(),
			};
		})
		.filter(Boolean);
};

export const selectAllCssVariableRecords = (
	coreStore,
	queryBase = CSS_VARIABLE_PUBLISHED_QUERY_BASE
) => {
	const query =
		queryBase && typeof queryBase === "object" ? queryBase : CSS_VARIABLE_PUBLISHED_QUERY_BASE;
	const totalPagesRaw = coreStore?.getEntityRecordsTotalPages?.(
		"postType",
		CSS_VARIABLE_POST_TYPE,
		query
	);
	const totalPages = Number.isFinite(Number(totalPagesRaw))
		? Math.max(1, Number(totalPagesRaw))
		: 1;
	const records = [];

	for (let page = 1; page <= totalPages; page += 1) {
		const pageQuery = totalPages > 1 ? { ...query, page } : query;
		const pageRecords = coreStore?.getEntityRecords?.(
			"postType",
			CSS_VARIABLE_POST_TYPE,
			pageQuery
		);
		if (Array.isArray(pageRecords)) {
			records.push(...pageRecords);
		}
	}

	return records;
};
