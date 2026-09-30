/**
 * Whether a block instance currently has an active Pattern Overrides
 * (Block Bindings) connection for the given attribute.
 *
 * "Enable overrides" (the block's Options menu toggle) sets a single
 * `metadata.bindings.__default = { source: "core/pattern-overrides" }`,
 * which WP expands at render/resolution time to cover every attribute the
 * block type has allowlisted via `block_bindings_supported_attributes_*`
 * — so checking `__default` is normally enough. The per-attribute form is
 * checked too, for a binding set directly on that one attribute instead.
 *
 * @param {Object} attributes     Block attributes (from `edit()`).
 * @param {string} attributeName  The role:"content" attribute to check.
 * @return {boolean}
 */
export function hasActivePatternOverride(attributes, attributeName) {
	const bindings = attributes?.metadata?.bindings;
	if (!bindings) return false;

	return (
		bindings.__default?.source === "core/pattern-overrides" ||
		bindings[attributeName]?.source === "core/pattern-overrides"
	);
}
