export function toSafeString(value, fallback = "") {
	return typeof value === "string" ? value : fallback;
}

export function toSafeNumber(value, fallback = 0) {
	const parsed = typeof value === "string" ? Number(value) : value;
	return Number.isFinite(parsed) ? parsed : fallback;
}
