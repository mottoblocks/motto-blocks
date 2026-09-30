// Block inserter/toolbar icon from a raw SVG file (assets/icons/blocks/<slug>.svg,
// imported with `?raw`). The same file is what the admin Blocks tab renders in PHP.
export function BlockIcon({ svg }) {
	return (
		<span
			style={{ display: "inline-flex" }}
			aria-hidden="true"
			dangerouslySetInnerHTML={{
				__html: svg.replace("<svg", '<svg class="motto-block-icon"'),
			}}
		/>
	);
}
