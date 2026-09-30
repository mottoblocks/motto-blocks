export function stripHtml(raw) {
	return String(raw || "")
		.replace(/<[^>]+>/g, "")
		.trim();
}
