export function getDynamicImageMode(dynamic) {
	const primaryMode =
		typeof dynamic?.imageSourceMode === "string" ? dynamic.imageSourceMode.trim() : "";
	if (primaryMode) {
		return primaryMode;
	}

	return typeof dynamic?.mode === "string" ? dynamic.mode.trim() : "";
}

export function hasDynamicImageSource(dynamic) {
	const mode = getDynamicImageMode(dynamic);
	if (!mode) {
		return false;
	}

	if (
		mode === "featured" &&
		dynamic?.featuredPostMode === "specific" &&
		!(Number(dynamic?.featuredSpecificPostId) > 0)
	) {
		return false;
	}

	if (mode === "field" && !String(dynamic?.fieldKey || "").trim()) {
		return false;
	}

	return true;
}

export function hasImageSource({ url, dynamic }) {
	return Boolean(String(url || "").trim()) || hasDynamicImageSource(dynamic);
}
