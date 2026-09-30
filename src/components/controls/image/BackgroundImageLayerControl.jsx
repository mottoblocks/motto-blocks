import {
	ToggleControl,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
	__experimentalUnitControl as UnitControl,
	__experimentalVStack as VStack,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { ImageSourcePositionControl } from "./ImageSourcePositionControl.jsx";

const DEFAULT_LAYER_SETTINGS = {
	id: 0,
	alt: "",
	title: "",
	width: 0,
	height: 0,
	position: "50% 50%",
	size: "cover",
	repeat: "no-repeat",
	attachment: "scroll",
};

const findClosingParen = (value, openIndex) => {
	let depth = 0;
	let quote = "";

	for (let i = openIndex; i < value.length; i += 1) {
		const char = value[i];
		const prev = value[i - 1];
		if ((char === "'" || char === '"') && prev !== "\\") {
			if (!quote) {
				quote = char;
			} else if (quote === char) {
				quote = "";
			}
		}

		if (!quote) {
			if (char === "(") depth += 1;
			if (char === ")") {
				depth -= 1;
				if (depth === 0) return i;
			}
		}
	}

	return -1;
};

const extractLeadingImageToken = (rawLayer) => {
	const layer = String(rawLayer || "").trim();
	if (!layer) return null;

	const functionMatch = layer.match(/^url\(/i);
	if (!functionMatch) return null;
	const openIndex = layer.indexOf("(");
	if (openIndex < 0) return null;
	const closeIndex = findClosingParen(layer, openIndex);
	if (closeIndex < 0) return null;

	return {
		token: layer.slice(0, closeIndex + 1).trim(),
		rest: layer.slice(closeIndex + 1).trim(),
	};
};

const extractUrlFromToken = (token) => {
	const value = String(token || "").trim();
	const match = value.match(/^url\((?:"|')?(.*?)(?:"|')?\)$/i);
	if (match && match[1]) return match[1].trim();
	return "";
};

const parseLayerSettings = (rest) => {
	const tokens = String(rest || "")
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (tokens.length === 0) return DEFAULT_LAYER_SETTINGS;

	const remaining = [];
	let repeat = DEFAULT_LAYER_SETTINGS.repeat;
	let attachment = DEFAULT_LAYER_SETTINGS.attachment;
	tokens.forEach((token) => {
		const lower = String(token || "")
			.trim()
			.toLowerCase();
		if (["no-repeat", "repeat-x", "repeat-y", "repeat", "space", "round"].includes(lower)) {
			repeat = lower;
			return;
		}
		if (["scroll", "fixed", "local"].includes(lower)) {
			attachment = lower;
			return;
		}
		remaining.push(token);
	});

	const slashIndex = remaining.findIndex((token) => token === "/");
	const positionTokens = slashIndex >= 0 ? remaining.slice(0, slashIndex) : remaining;
	const sizeTokens = slashIndex >= 0 ? remaining.slice(slashIndex + 1) : [];

	return {
		id: DEFAULT_LAYER_SETTINGS.id,
		alt: DEFAULT_LAYER_SETTINGS.alt,
		title: DEFAULT_LAYER_SETTINGS.title,
		width: DEFAULT_LAYER_SETTINGS.width,
		height: DEFAULT_LAYER_SETTINGS.height,
		position: positionTokens.length
			? positionTokens.join(" ")
			: DEFAULT_LAYER_SETTINGS.position,
		size: sizeTokens.length ? sizeTokens.join(" ") : DEFAULT_LAYER_SETTINGS.size,
		repeat,
		attachment,
	};
};

const buildLayerImageValue = (layer) => {
	const url = String(layer?.url || "").trim();
	if (!url) return "none";
	const image = `url("${url.replace(/"/g, '\\"')}")`;
	const position = String(layer?.position || "").trim() || DEFAULT_LAYER_SETTINGS.position;
	const size = String(layer?.size || "").trim() || DEFAULT_LAYER_SETTINGS.size;
	const repeat = String(layer?.repeat || "").trim() || DEFAULT_LAYER_SETTINGS.repeat;
	const attachment = String(layer?.attachment || "").trim() || DEFAULT_LAYER_SETTINGS.attachment;
	return `${image} ${position} / ${size} ${repeat} ${attachment}`;
};

const parseLayerImageValue = (rawValue) => {
	const extracted = extractLeadingImageToken(rawValue);
	if (!extracted) {
		return { ...DEFAULT_LAYER_SETTINGS, url: "" };
	}

	return {
		url: extractUrlFromToken(extracted.token),
		...parseLayerSettings(extracted.rest),
	};
};

const backgroundSizeHelpText = (value, domain) => {
	if (value === "cover" || value === undefined) {
		return __("Image covers the space evenly.", domain);
	}
	if (value === "contain") {
		return __("Image is contained without distortion.", domain);
	}
	return __("Image has a fixed width.", domain);
};

// Shared wrapper for a single background layer that uses an image source.
export const BackgroundImageLayerControl = ({
	layer,
	onChange,
	previewUrl,
	i18nDomain = "motto-blocks",
	focalPointControlsClassName = "motto-background-focal-point",
	onBeforeOpenMediaModal,
	isDynamicSourceActive = false,
}) => {
	const current = {
		id: Number.isFinite(Number(layer?.id)) ? Number(layer.id) : 0,
		url: String(layer?.url || "").trim(),
		alt: String(layer?.alt || "").trim(),
		title: String(layer?.title || "").trim(),
		width: Number.isFinite(Number(layer?.width)) ? Number(layer.width) : 0,
		height: Number.isFinite(Number(layer?.height)) ? Number(layer.height) : 0,
		position: String(layer?.position || "").trim() || DEFAULT_LAYER_SETTINGS.position,
		size: String(layer?.size || "").trim() || DEFAULT_LAYER_SETTINGS.size,
		repeat: String(layer?.repeat || "").trim() || DEFAULT_LAYER_SETTINGS.repeat,
		attachment: String(layer?.attachment || "").trim() || DEFAULT_LAYER_SETTINGS.attachment,
	};

	const emitPatch = (patch) => {
		if (typeof onChange !== "function") return;
		onChange({ ...layer, kind: "url", ...patch });
	};

	const hasUrl = Boolean(current.url);
	const showSizeControls = hasUrl || isDynamicSourceActive;
	const sizeValue = current.size;
	let currentValueForToggle = sizeValue || "auto";
	currentValueForToggle = ["cover", "contain", "auto"].includes(currentValueForToggle)
		? currentValueForToggle
		: "auto";
	const repeatCheckedValue = !(
		current.repeat === "no-repeat" ||
		(currentValueForToggle === "cover" && current.repeat === undefined)
	);

	const updateBackgroundSize = (nextSize) => {
		let normalizedSize = nextSize;
		let nextRepeat = current.repeat;
		let nextPosition = current.position;

		if (nextSize === "contain") {
			nextRepeat = "no-repeat";
			nextPosition = undefined;
		}
		if (nextSize === "cover") {
			nextRepeat = undefined;
			nextPosition = undefined;
		}
		if (
			(currentValueForToggle === "cover" || currentValueForToggle === "contain") &&
			nextSize === "auto"
		) {
			nextRepeat = undefined;
		}
		if (!normalizedSize && currentValueForToggle === "auto") {
			normalizedSize = "auto";
		}

		emitPatch({
			size: normalizedSize,
			repeat: nextRepeat,
			position: nextPosition,
		});
	};

	const toggleRepeat = () => {
		emitPatch({
			repeat: repeatCheckedValue ? "no-repeat" : "repeat",
		});
	};

	return (
		<VStack spacing={3} className="motto-background-image-control__layout">
			{!isDynamicSourceActive && (
				<ImageSourcePositionControl
					value={current}
					onChange={emitPatch}
					previewUrl={previewUrl}
					i18nDomain={i18nDomain}
					focalPointControlsClassName={focalPointControlsClassName}
					onBeforeOpenMediaModal={onBeforeOpenMediaModal}
					imageSourceControlProps={{
						rootClassName: "motto-background-image-control__source",
						labels: {
							placeholderTitle: __("Background image", i18nDomain),
							placeholderInstructions: __(
								"Upload, pick from media library, or paste an image URL.",
								i18nDomain
							),
							urlAriaLabel: __("Background image URL", i18nDomain),
							urlPlaceholder: __("Image URL", i18nDomain),
							replaceButtonLabel: __("Replace image", i18nDomain),
							removeButtonLabel: __("Remove image", i18nDomain),
						},
					}}
				/>
			)}

			{showSizeControls ? (
				<>
					<ToggleGroupControl
						__nextHasNoMarginBottom
						size="__unstable-large"
						label={__("Size", i18nDomain)}
						value={currentValueForToggle}
						onChange={updateBackgroundSize}
						isBlock
						help={backgroundSizeHelpText(
							sizeValue || DEFAULT_LAYER_SETTINGS.size,
							i18nDomain
						)}
					>
						<ToggleGroupControlOption value="cover" label={__("Cover", i18nDomain)} />
						<ToggleGroupControlOption
							value="contain"
							label={__("Contain", i18nDomain)}
						/>
						<ToggleGroupControlOption value="auto" label={__("Tile", i18nDomain)} />
					</ToggleGroupControl>

					<div className="motto-flex align-center gap-sm">
						<UnitControl
							aria-label={__("Background image width", i18nDomain)}
							onChange={updateBackgroundSize}
							value={sizeValue}
							size="__unstable-large"
							__unstableInputWidth="100px"
							min={0}
							placeholder={__("Auto", i18nDomain)}
							disabled={
								currentValueForToggle !== "auto" ||
								currentValueForToggle === undefined
							}
						/>
						<ToggleControl
							__nextHasNoMarginBottom
							label={__("Repeat", i18nDomain)}
							checked={repeatCheckedValue}
							onChange={toggleRepeat}
							disabled={currentValueForToggle === "cover"}
						/>
					</div>
				</>
			) : null}
		</VStack>
	);
};

export { buildLayerImageValue, parseLayerImageValue };
