import clsx from "clsx";
import { MediaUpload, MediaUploadCheck } from "@wordpress/block-editor";
import {
	Button,
	__experimentalHStack as HStack,
	__experimentalInputControl as InputControl,
	SelectControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { ImagePlus, Trash2 } from "lucide-react";
import { MediaPlaceholder } from "../../primitives/MediaPlaceholder.jsx";

const toStringValue = (value, fallback = "") => {
	if (typeof value === "string") return value;
	if (value === undefined || value === null) return fallback;
	return String(value);
};

const toNumber = (value, fallback = 0) => {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
};

const getDefaultLabels = (domain) => ({
	placeholderTitle: __("Image", domain),
	placeholderInstructions: __("Upload, pick from media library, or paste an image URL.", domain),
	urlAriaLabel: __("Image URL", domain),
	urlPlaceholder: __("Image URL", domain),
	replaceButtonLabel: __("Replace image", domain),
	removeButtonLabel: __("Remove image", domain),
	sizeLabel: __("Image size", domain),
});

const toLabel = (value) => {
	const text = toStringValue(value, "").trim();
	if (!text) return "";

	return text.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const normalizeSizeOption = (slug, rawValue) => {
	const value = rawValue && typeof rawValue === "object" ? rawValue : {};
	const normalizedSlug = toStringValue(value.slug ?? slug, "").trim();
	const url = toStringValue(value.url ?? value.source_url, "").trim();

	if (!normalizedSlug || !url) {
		return null;
	}

	return {
		slug: normalizedSlug,
		label: toLabel(value.label ?? value.name ?? normalizedSlug),
		url,
		width: toNumber(value.width, 0),
		height: toNumber(value.height, 0),
	};
};

const normalizeImageSizes = (sizes) => {
	if (Array.isArray(sizes)) {
		return sizes.map((entry) => normalizeSizeOption(entry?.slug, entry)).filter(Boolean);
	}

	if (!sizes || typeof sizes !== "object") {
		return [];
	}

	return Object.entries(sizes)
		.map(([slug, value]) => normalizeSizeOption(slug, value))
		.filter(Boolean);
};

const mergeImageSizes = (...sizeGroups) => {
	const merged = new Map();

	sizeGroups.flat().forEach((entry) => {
		if (!entry?.slug || !entry?.url) {
			return;
		}

		merged.set(entry.slug, entry);
	});

	return Array.from(merged.values());
};

const extractImageSizesFromMedia = (selected) => {
	const mediaDetailsSizes = normalizeImageSizes(selected?.media_details?.sizes);
	const directSizes = normalizeImageSizes(selected?.sizes);
	const fullSize = normalizeSizeOption("full", {
		label: __("Full", "motto-blocks"),
		url: selected?.url ?? selected?.source_url,
		width: selected?.width ?? selected?.media_details?.width,
		height: selected?.height ?? selected?.media_details?.height,
	});

	return mergeImageSizes(fullSize ? [fullSize] : [], mediaDetailsSizes, directSizes);
};

const resolveImageSizeSelection = (sizes, preferred = {}) => {
	const normalizedSizes = normalizeImageSizes(sizes);
	if (normalizedSizes.length === 0) {
		return null;
	}

	const preferredSlug = toStringValue(preferred?.sizeSlug, "").trim();
	const preferredUrl = toStringValue(preferred?.url, "").trim();

	return (
		normalizedSizes.find((entry) => entry.slug === preferredSlug) ||
		normalizedSizes.find((entry) => entry.url === preferredUrl) ||
		normalizedSizes.find((entry) => entry.slug === "full") ||
		normalizedSizes[0]
	);
};

export const normalizeMediaSelection = (media, currentValue = {}) => {
	const selected = Array.isArray(media) ? media[0] : media;
	const sizes = extractImageSizesFromMedia(selected);
	const preferredSize = resolveImageSizeSelection(sizes, {
		sizeSlug: selected?.sizeSlug ?? currentValue?.sizeSlug,
		url: selected?.url,
	});

	return normalizeImageSourceValue({
		id: selected?.id,
		url: preferredSize?.url ?? selected?.url,
		alt: selected?.alt,
		title: selected?.title,
		width: preferredSize?.width ?? selected?.width,
		height: preferredSize?.height ?? selected?.height,
		sizeSlug: preferredSize?.slug ?? "",
		sizes,
	});
};

export const DEFAULT_IMAGE_SOURCE_VALUE = Object.freeze({
	id: 0,
	url: "",
	alt: "",
	title: "",
	width: 0,
	height: 0,
	sizeSlug: "",
	sizes: [],
});

export const normalizeImageSourceValue = (value = {}) => ({
	id: toNumber(value?.id, 0),
	url: toStringValue(value?.url, "").trim(),
	alt: toStringValue(value?.alt, "").trim(),
	title: toStringValue(value?.title, "").trim(),
	width: toNumber(value?.width, 0),
	height: toNumber(value?.height, 0),
	sizeSlug: toStringValue(value?.sizeSlug, "").trim(),
	sizes: normalizeImageSizes(value?.sizes),
});

export const ImageSourceControl = ({
	value,
	onChange,
	i18nDomain = "motto-blocks",
	labels = {},
	rootClassName = "",
	urlRowClassName = "motto-image-url-row",
	urlInputClassName = "motto-image-url-input",
	selectButtonClassName = "motto-ui-button is-icon-only motto-image-select-button",
	removeButtonClassName = "motto-ui-button is-icon-only is-destructive motto-image-remove-button",
	allowedTypes = ["image"],
	accept = "image/*",
	showVisualPlaceholder = true,
	showSizeSelector = false,
	renderAfterUrlRow,
	onBeforeOpenMediaModal,
}) => {
	const current = normalizeImageSourceValue(value);
	const hasUrl = Boolean(current.url);
	const hasSelectableSizes = current.id > 0 && current.sizes.length > 0;
	const selectedSize = resolveImageSizeSelection(current.sizes, current);
	const mediaEnabled = typeof window?.wp?.media === "function";
	const resolvedLabels = {
		...getDefaultLabels(i18nDomain),
		...(labels || {}),
	};

	const emitValue = (nextValue) => {
		if (typeof onChange !== "function") return;
		onChange(normalizeImageSourceValue(nextValue));
	};

	const handleMediaSelect = (media) => {
		const selected = normalizeMediaSelection(media, current);
		if (!selected.url) return;
		emitValue({
			...current,
			...selected,
		});
	};

	const handleUrlChange = (nextUrlRaw) => {
		const nextUrl = toStringValue(nextUrlRaw, "").trim();
		const isSameUrl = nextUrl === current.url;
		emitValue({
			...current,
			url: nextUrl,
			...(isSameUrl
				? {}
				: {
						id: 0,
						alt: "",
						title: "",
						width: 0,
						height: 0,
						sizeSlug: "",
						sizes: [],
					}),
		});
	};

	const handleSizeChange = (nextSizeSlug) => {
		const nextSelection = resolveImageSizeSelection(current.sizes, { sizeSlug: nextSizeSlug });
		if (!nextSelection) {
			return;
		}

		emitValue({
			...current,
			url: nextSelection.url,
			width: nextSelection.width,
			height: nextSelection.height,
			sizeSlug: nextSelection.slug,
		});
	};

	const clearImage = () => emitValue(DEFAULT_IMAGE_SOURCE_VALUE);
	const showPlaceholder = showVisualPlaceholder && mediaEnabled && !hasUrl;
	const notifyBeforeOpenMediaModal = () => {
		if (typeof onBeforeOpenMediaModal === "function") {
			onBeforeOpenMediaModal();
		}
	};
	const handleMediaLauncherKeyDown = (event) => {
		if (event.key !== "Enter" && event.key !== " ") {
			return;
		}
		notifyBeforeOpenMediaModal();
	};

	return (
		<div className={clsx("motto-image-source-control", rootClassName)}>
			<div
				onMouseDownCapture={notifyBeforeOpenMediaModal}
				onKeyDownCapture={handleMediaLauncherKeyDown}
			>
				<MediaPlaceholder
					isVisible={showPlaceholder}
					onSelect={handleMediaSelect}
					onSelectURL={handleUrlChange}
					accept={accept}
					allowedTypes={allowedTypes}
					multiple={false}
					labels={{
						title: resolvedLabels.placeholderTitle,
						instructions: resolvedLabels.placeholderInstructions,
					}}
				/>
			</div>

			{hasUrl ? (
				<HStack
					className={clsx("motto-image-url-row", urlRowClassName)}
					// alignment="bottom"
					// spacing={2}
				>
					<InputControl
						className={clsx("motto-image-url-input", urlInputClassName)}
						value={current.url}
						aria-label={resolvedLabels.urlAriaLabel}
						placeholder={resolvedLabels.urlPlaceholder}
						onChange={handleUrlChange}
					/>
					{mediaEnabled ? (
						<MediaUploadCheck>
							<MediaUpload
								onSelect={handleMediaSelect}
								allowedTypes={allowedTypes}
								value={current.id}
								render={({ open }) => (
									<Button
										variant="secondary"
										className={selectButtonClassName}
										onMouseDown={notifyBeforeOpenMediaModal}
										onKeyDown={handleMediaLauncherKeyDown}
										onClick={open}
										aria-label={resolvedLabels.replaceButtonLabel}
										title={resolvedLabels.replaceButtonLabel}
									>
										<ImagePlus size={14} aria-hidden="true" />
									</Button>
								)}
							/>
						</MediaUploadCheck>
					) : null}
					<Button
						variant="secondary"
						className={removeButtonClassName}
						onClick={clearImage}
						aria-label={resolvedLabels.removeButtonLabel}
						title={resolvedLabels.removeButtonLabel}
					>
						<Trash2 size={14} aria-hidden="true" />
					</Button>
				</HStack>
			) : null}

			{showSizeSelector && hasUrl && hasSelectableSizes ? (
				<SelectControl
					className="motto-select motto-image-size-select"
					label={resolvedLabels.sizeLabel}
					value={selectedSize?.slug || ""}
					options={current.sizes.map((entry) => ({
						label: entry.label || entry.slug,
						value: entry.slug,
					}))}
					onChange={handleSizeChange}
				/>
			) : null}

			{typeof renderAfterUrlRow === "function"
				? renderAfterUrlRow({
						value: current,
						hasUrl,
					})
				: null}
		</div>
	);
};
