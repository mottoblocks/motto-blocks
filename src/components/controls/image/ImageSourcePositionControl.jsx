import clsx from "clsx";
import { FocalPointPicker } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { ImageSourceControl, normalizeImageSourceValue } from "./ImageSourceControl.jsx";

const DEFAULT_POSITION = "50% 50%";

const normalizePositionValue = (value, fallback = DEFAULT_POSITION) => {
	return typeof value === "string" && value.trim() ? value.trim() : fallback;
};

const clampUnitInterval = (value, fallback = 0.5) => {
	if (!Number.isFinite(value)) {
		return fallback;
	}

	return Math.max(0, Math.min(1, value));
};

export const mapPositionToFocalPoint = (position, fallback = { x: 0.5, y: 0.5 }) => {
	const raw = String(position || "")
		.trim()
		.toLowerCase();
	if (!raw) return fallback;

	const keywordMap = {
		"left top": { x: 0, y: 0 },
		"center top": { x: 0.5, y: 0 },
		"right top": { x: 1, y: 0 },
		"left center": { x: 0, y: 0.5 },
		"center center": { x: 0.5, y: 0.5 },
		"right center": { x: 1, y: 0.5 },
		"left bottom": { x: 0, y: 1 },
		"center bottom": { x: 0.5, y: 1 },
		"right bottom": { x: 1, y: 1 },
	};

	if (keywordMap[raw]) {
		return keywordMap[raw];
	}

	let [x, y] = raw.split(" ").map((part) => parseFloat(part) / 100);
	x = Number.isNaN(x) ? fallback.x : clampUnitInterval(x, fallback.x);
	y = Number.isNaN(y) ? x : clampUnitInterval(y, fallback.y);

	return { x, y };
};

export const mapFocalPointToPosition = (focalPoint, fallback = DEFAULT_POSITION) => {
	if (!focalPoint || (!Number.isFinite(focalPoint.x) && !Number.isFinite(focalPoint.y))) {
		return fallback;
	}

	const x = clampUnitInterval(Number(focalPoint.x), 0.5);
	const y = clampUnitInterval(Number(focalPoint.y), x);

	return `${Math.round(x * 100)}% ${Math.round(y * 100)}%`;
};

export const normalizeImageSourcePositionValue = (value = {}, fallback = DEFAULT_POSITION) => ({
	...normalizeImageSourceValue(value),
	position: normalizePositionValue(value?.position, fallback),
});

export const ImageSourcePositionControl = ({
	value,
	onChange,
	previewUrl,
	i18nDomain = "motto-blocks",
	positionFallback = DEFAULT_POSITION,
	focalPointLabel,
	focalPointControlsClassName = "motto-background-focal-point",
	imageSourceControlProps = {},
	onBeforeOpenMediaModal,
}) => {
	const current = normalizeImageSourcePositionValue(value, positionFallback);
	const focalPickerUrl = previewUrl || current.url;
	const hasUrl = Boolean(focalPickerUrl);
	const resolvedFocalPointLabel = focalPointLabel || __("Focal point", i18nDomain);

	const emitValue = (patch) => {
		if (typeof onChange !== "function") return;
		onChange(
			normalizeImageSourcePositionValue(
				{
					...current,
					...(patch || {}),
				},
				positionFallback
			)
		);
	};

	return (
		<div className="motto-image-source-position-control">
			<ImageSourceControl
				value={current}
				onChange={(nextSource) => emitValue(nextSource)}
				i18nDomain={i18nDomain}
				onBeforeOpenMediaModal={onBeforeOpenMediaModal}
				{...imageSourceControlProps}
			/>

			{hasUrl ? (
				<div className={clsx("motto-focal-point-controls", focalPointControlsClassName)}>
					<FocalPointPicker
						__nextHasNoMarginBottom
						label={resolvedFocalPointLabel}
						url={focalPickerUrl}
						value={mapPositionToFocalPoint(current.position)}
						onChange={(nextPoint) =>
							emitValue({
								position: mapFocalPointToPosition(nextPoint, positionFallback),
							})
						}
					/>
				</div>
			) : null}
		</div>
	);
};
