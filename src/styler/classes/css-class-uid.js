/** UUID v4 canonical string (lowercase), used as stable CPT identity. */
const CLASS_UID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/**
 * @param {unknown} value
 * @returns {string} normalized uid or ""
 */
export const normalizeClassUid = (value) => {
	const raw = String(value || "")
		.trim()
		.toLowerCase();
	if (!raw || !CLASS_UID_RE.test(raw)) return "";
	return raw;
};
