const CLIPBOARD_KEY = "motto-blocks-styler-clipboard-v1";
const CLIPBOARD_VERSION = 1;

// Sync read from localStorage only — safe to call without user gesture or permission.
// Use this for proactive state checks (e.g., enabling paste buttons).
export const readClipboardLocal = () => {
	try {
		const raw = localStorage.getItem(CLIPBOARD_KEY);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		if (!parsed || parsed.version !== CLIPBOARD_VERSION) return null;
		return parsed;
	} catch {
		return null;
	}
};

// Full async read: tries navigator.clipboard first (requires user gesture + permission),
// then falls back to localStorage. Call only from explicit paste actions.
export const readClipboard = async () => {
	try {
		const raw = await navigator.clipboard.readText();
		if (raw) {
			const parsed = JSON.parse(raw);
			if (parsed?.version === CLIPBOARD_VERSION) return parsed;
		}
	} catch {}
	return readClipboardLocal();
};

export const writeClipboard = async (payload) => {
	const str = JSON.stringify(payload);
	try {
		await navigator.clipboard.writeText(str);
	} catch {}
	try {
		localStorage.setItem(CLIPBOARD_KEY, str);
	} catch {}
};

export const createClipboardPayload = (type, data) => ({
	version: CLIPBOARD_VERSION,
	type,
	data: data && typeof data === "object" ? data : {},
	ts: Date.now(),
});
