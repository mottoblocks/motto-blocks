import { sanitizeInlineSvgMarkup } from "@lib/inline-svg-sanitizer.js";
import { LucideIcon } from "@components/lucide/lucide-library";
import { normalizeTriggerIconOptions } from "./trigger-icon-options";

export function hasConfiguredTriggerIcon(value) {
	const iconOptions = normalizeTriggerIconOptions(value);

	if (iconOptions.type === "none") {
		return false;
	}

	if (iconOptions.type === "image") {
		return Boolean(iconOptions.image.url);
	}

	if (iconOptions.type === "icon") {
		return Boolean(iconOptions.lucideIcon);
	}

	return Boolean(iconOptions.inlineSvg);
}

export function TriggerIconMedia({ value }) {
	const iconOptions = normalizeTriggerIconOptions(value);

	if (iconOptions.type === "none") {
		return null;
	}

	if (iconOptions.type === "image" && iconOptions.image.url) {
		return (
			<img
				className="motto-panel-trigger__icon-media motto-panel-trigger__icon-media--image"
				src={iconOptions.image.url}
				alt=""
			/>
		);
	}

	if (iconOptions.type === "icon") {
		const iconClass = `motto-panel-trigger__icon-media motto-panel-trigger__icon-media--lucide lucide lucide-${iconOptions.lucideIcon}`;
		return (
			<LucideIcon
				iconName={iconOptions.lucideIcon}
				className={iconClass}
				size="100%"
				aria-hidden="true"
			/>
		);
	}

	if (iconOptions.type !== "svg") {
		return null;
	}

	const normalizedSvgMarkup = sanitizeInlineSvgMarkup(iconOptions.inlineSvg, [
		"motto-panel-trigger__icon-media",
		"motto-panel-trigger__icon-media--svg",
	]);
	if (!normalizedSvgMarkup) {
		return null;
	}

	return (
		<span
			className="motto-panel-trigger__icon-media-inline"
			dangerouslySetInnerHTML={{ __html: normalizedSvgMarkup }}
		/>
	);
}
