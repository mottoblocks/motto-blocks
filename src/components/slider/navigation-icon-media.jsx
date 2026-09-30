import { normalizeNavigationIconOption } from "./navigation-options";
import { LucideIcon } from "@components/lucide/lucide-utils.js";
import { sanitizeInlineSvgMarkup } from "@lib/inline-svg-sanitizer.js";

export function hasConfiguredNavigationIcon(value, isEditorPreview = false) {
	const iconOptions = normalizeNavigationIconOption(value, "");

	if (iconOptions.type === "default") {
		return false;
	}

	if (iconOptions.type === "image") {
		return Boolean(iconOptions.image.url);
	}

	if (iconOptions.type === "icon") {
		return Boolean(iconOptions.svg.lucideIcon);
	}

	return Boolean(
		isEditorPreview
			? sanitizeInlineSvgMarkup(iconOptions.svg.inline, ["motto-slider__nav-icon-svg"])
			: iconOptions.svg.inline
	);
}

export function NavigationIconMedia({ value, isEditorPreview = false }) {
	const iconOptions = normalizeNavigationIconOption(value, "");

	if (iconOptions.type === "default") {
		return null;
	}

	if (iconOptions.type === "image" && iconOptions.image.url) {
		return (
			<span className="motto-slider__nav-icon" aria-hidden="true">
				<img className="motto-slider__nav-icon-image" src={iconOptions.image.url} alt="" />
			</span>
		);
	}

	if (iconOptions.type === "icon") {
		const iconClass = `motto-slider__nav-icon-lucide lucide lucide-${iconOptions.svg.lucideIcon}`;
		return (
			<span className="motto-slider__nav-icon" aria-hidden="true">
				<LucideIcon
					iconName={iconOptions.svg.lucideIcon}
					className={iconClass}
					size="100%"
					aria-hidden="true"
				/>
			</span>
		);
	}

	if (iconOptions.type !== "svg") {
		return null;
	}

	if (!isEditorPreview) {
		return null;
	}

	const sanitizedSvgMarkup = sanitizeInlineSvgMarkup(iconOptions.svg.inline, [
		"motto-slider__nav-icon-svg",
	]);
	if (!sanitizedSvgMarkup) {
		return null;
	}

	return (
		<span
			className="motto-slider__nav-icon"
			aria-hidden="true"
			dangerouslySetInnerHTML={{ __html: sanitizedSvgMarkup }}
		/>
	);
}
