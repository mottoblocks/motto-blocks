import { sanitizeInlineSvgMarkup } from "@lib/inline-svg-sanitizer.js";
import { LucideIcon } from "@components/lucide/lucide-library";
import { normalizeButtonIconOptions } from "./button-icon-options";

export function hasConfiguredButtonIcon(value) {
	const iconOptions = normalizeButtonIconOptions(value);

	if (iconOptions.type === "none") {
		return false;
	}

	if (iconOptions.type === "image") {
		return Boolean(iconOptions.image.url);
	}

	if (iconOptions.svg.source === "lucide") {
		return Boolean(iconOptions.svg.lucideIcon);
	}

	return Boolean(iconOptions.svg.inline);
}

export function ButtonIconMedia({ value }) {
	const iconOptions = normalizeButtonIconOptions(value);

	if (iconOptions.type === "none") {
		return null;
	}

	if (iconOptions.type === "image" && iconOptions.image.url) {
		return (
			<img
				className="motto-button__icon-media motto-button__icon-media--image"
				src={iconOptions.image.url}
				alt=""
			/>
		);
	}

	if (iconOptions.type !== "svg") {
		return null;
	}

	if (iconOptions.svg.source === "lucide") {
		const iconClass = `motto-button__icon-media motto-button__icon-media--svg lucide lucide-${iconOptions.svg.lucideIcon}`;
		return (
			<LucideIcon
				iconName={iconOptions.svg.lucideIcon}
				className={iconClass}
				size="100%"
				aria-hidden="true"
			/>
		);
	}

	const normalizedSvgMarkup = sanitizeInlineSvgMarkup(iconOptions.svg.inline, [
		"motto-button__icon-media",
		"motto-button__icon-media--svg",
	]);
	if (normalizedSvgMarkup) {
		return (
			<span
				className="motto-button__icon-media-inline"
				dangerouslySetInnerHTML={{ __html: normalizedSvgMarkup }}
			/>
		);
	}

	return null;
}
