const getTargetPatterns = () => {
	const runtimeStylerTargets =
		typeof window !== "undefined" && Array.isArray(window.__MOTTO_STYLER_TARGET_BLOCKS__)
			? window.__MOTTO_STYLER_TARGET_BLOCKS__
			: null;

	const list = runtimeStylerTargets || ["all"];
	const normalized = list
		.map((item) =>
			String(item || "")
				.trim()
				.toLowerCase()
		)
		.filter(Boolean);

	return normalized.length ? [...new Set(normalized)] : ["all"];
};

export const isStylerCoreMvpBlock = (blockName) => {
	const name = String(blockName || "")
		.trim()
		.toLowerCase();
	if (!name) return false;

	const patterns = getTargetPatterns();
	return patterns.some((pattern) => {
		if (pattern === "all" || pattern === "*") return true;
		if (pattern.endsWith("/*")) {
			const namespace = pattern.slice(0, -2);
			return namespace ? name.startsWith(`${namespace}/`) : false;
		}
		if (!pattern.includes("/")) {
			return name.startsWith(`${pattern}/`);
		}
		return name === pattern;
	});
};
