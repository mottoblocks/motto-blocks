export function getDynamicLinkMode(dynamic) {
	return typeof dynamic?.mode === "string" ? dynamic.mode.trim() : "";
}

export function hasDynamicLinkSource(dynamic) {
	const mode = getDynamicLinkMode(dynamic);
	if (!mode) return false;
	if (mode === "field" && !String(dynamic?.fieldKey || "").trim()) return false;
	return true;
}
