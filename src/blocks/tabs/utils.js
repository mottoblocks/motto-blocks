export function generateTabId() {
	return `motto-tab-${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeTabId(value) {
	return typeof value === "string" ? value.trim() : "";
}
