export const normalizeMottoBaseLayout = (value) => {
	const normalized = String(value || "")
		.trim()
		.toLowerCase();
	if (normalized === "block") return "flow";
	if (["flow", "flex", "inline-flex", "grid", "inline-grid"].includes(normalized)) {
		return normalized;
	}
	return "";
};

export const getMottoBaseLayoutDisplay = (value) => {
	const normalized = normalizeMottoBaseLayout(value);
	if (normalized === "flow") return "block";
	return normalized;
};

export const getMottoBaseLayoutClassName = (value) => {
	const normalized = normalizeMottoBaseLayout(value);
	return normalized ? `motto-base-layout-${normalized}` : "";
};
