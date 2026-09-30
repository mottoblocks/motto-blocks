import { sanitizeInlineSvgMarkup } from "@lib/inline-svg-sanitizer.js";
import { LucideIcon } from "@components/lucide/lucide-library";
import { normalizeBulletOptions } from "./bullet-options";

export function BulletMedia({ value }) {
	const bulletOptions = normalizeBulletOptions(value);

	if (bulletOptions.type === "default" || bulletOptions.type === "counter") {
		return null;
	}

	if (bulletOptions.type === "none") {
		return null;
	}

	if (bulletOptions.type === "image" && bulletOptions.image.url) {
		return (
			<img
				className="motto-list-item__bullet-media motto-list-item__bullet-media--image"
				src={bulletOptions.image.url}
				alt=""
			/>
		);
	}

	if (bulletOptions.type === "icon") {
		const iconClass = `motto-list-item__bullet-media motto-list-item__bullet-media--svg lucide lucide-${bulletOptions.svg.lucideIcon}`;
		return (
			<LucideIcon
				iconName={bulletOptions.svg.lucideIcon}
				className={iconClass}
				size="100%"
				aria-hidden="true"
			/>
		);
	}

	if (bulletOptions.type !== "svg") {
		return null;
	}

	const normalizedSvgMarkup = sanitizeInlineSvgMarkup(bulletOptions.svg.inline, [
		"motto-list-item__bullet-media",
		"motto-list-item__bullet-media--svg",
	]);
	if (normalizedSvgMarkup) {
		return (
			<span
				className="motto-list-item__bullet-media-inline"
				dangerouslySetInnerHTML={{ __html: normalizedSvgMarkup }}
			/>
		);
	}

	return null;
}
