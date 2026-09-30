import {
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { useCallback, useEffect, useMemo, useRef, useState } from "@wordpress/element";
import { BackgroundImageLayerControl, BackgroundImageControl, LayerTabs } from "@components";
import { Code2, Image as ImageIcon, Slash } from "lucide-react";
import { BackgroundBaseColorControl } from "./BackgroundBaseColorControl";
import { CssFunctionAutocompleteControl } from "./CssFunctionAutocompleteControl";
import { GradientControl } from "./GradientControl";
import {
	isColorKeyword,
	isColorToken,
	splitCssAtDepthZero,
	tokenizeCssValue,
} from "../utils/css-value-utils.js";
import { createItemId } from "../utils/css-row-ids";
import { reorderArrayItem } from "../utils/array-utils";

const LAYER_KIND_OPTIONS = [
	{ label: __("Image", "motto-blocks"), value: "url", icon: ImageIcon },
	{ label: __("Gradient", "motto-blocks"), value: "gradient", icon: Slash },
	{ label: __("Raw", "motto-blocks"), value: "raw", icon: Code2 },
];

const DEFAULT_LAYER_TYPES = ["image", "gradient", "raw"];
const LAYER_TYPE_TO_KIND = {
	image: "url",
	url: "url",
	gradient: "gradient",
	raw: "raw",
};

const REPEAT_OPTIONS = ["no-repeat", "repeat", "repeat-x", "repeat-y", "space", "round"];
const ATTACHMENT_OPTIONS = ["scroll", "fixed", "local"];
const REPEAT_SET = new Set(REPEAT_OPTIONS);
const ATTACHMENT_SET = new Set(ATTACHMENT_OPTIONS);

const createId = () => createItemId("bg-layer");

const findClosingParen = (value, openIndex) => {
	let depth = 0;
	let quote = "";
	for (let i = openIndex; i < value.length; i += 1) {
		const char = value[i];
		const prev = value[i - 1];
		if ((char === "'" || char === '"') && prev !== "\\") {
			if (!quote) quote = char;
			else if (quote === char) quote = "";
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
	const noneMatch = layer.match(/^none(?:\s|$)/i);
	if (noneMatch) {
		return { token: "none", rest: layer.slice(noneMatch[0].length).trim() };
	}
	const functionMatch = layer.match(/^(url|linear-gradient|radial-gradient|conic-gradient)\(/i);
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
	return match?.[1] ? match[1].trim() : "";
};

const toLayerKind = (token) => {
	const lower = String(token || "")
		.trim()
		.toLowerCase();
	if (lower.startsWith("url(")) return "url";
	if (lower.startsWith("linear-gradient(")) return "gradient";
	if (lower.startsWith("radial-gradient(")) return "gradient";
	if (lower.startsWith("conic-gradient(")) return "gradient";
	return "raw";
};

const defaultGradientByKind = (kind) => {
	if (kind === "radial-gradient") return "radial-gradient(circle, #000000 0%, #ffffff 100%)";
	if (kind === "conic-gradient") return "conic-gradient(from 180deg, #000000, #ffffff)";
	return "linear-gradient(180deg, #000000 0%, #ffffff 100%)";
};

const createLayer = (kind = "url", displayId = null) => ({
	id: createId(),
	displayId,
	kind,
	url: "",
	gradient: kind.includes("gradient") ? defaultGradientByKind(kind) : "",
	raw: "",
	position: "50% 50%",
	size: "cover",
	repeat: "no-repeat",
	attachment: "scroll",
});

const parseLayerSettings = (rest) => {
	const defaults = {
		position: "50% 50%",
		size: "cover",
		repeat: "no-repeat",
		attachment: "scroll",
	};
	const tokens = tokenizeCssValue(rest);
	if (tokens.length === 0) return defaults;
	const remaining = [];
	let repeat = defaults.repeat;
	let attachment = defaults.attachment;
	tokens.forEach((token) => {
		const lower = String(token || "")
			.trim()
			.toLowerCase();
		if (REPEAT_SET.has(lower)) {
			repeat = lower;
			return;
		}
		if (ATTACHMENT_SET.has(lower)) {
			attachment = lower;
			return;
		}
		remaining.push(token);
	});
	const slashIndex = remaining.findIndex((token) => token === "/");
	const positionTokens = slashIndex >= 0 ? remaining.slice(0, slashIndex) : remaining;
	const sizeTokens = slashIndex >= 0 ? remaining.slice(slashIndex + 1) : [];
	return {
		position: positionTokens.length ? positionTokens.join(" ") : defaults.position,
		size: sizeTokens.length ? sizeTokens.join(" ") : defaults.size,
		repeat,
		attachment,
	};
};

const parseBackgroundImageLayers = (rawValue) => {
	const value = String(rawValue || "").trim();
	if (!value || value.toLowerCase() === "none") return [];
	return splitCssAtDepthZero(value).map((layerRaw) => {
		const extracted = extractLeadingImageToken(layerRaw);
		if (!extracted || extracted.rest) return { ...createLayer("raw"), raw: layerRaw };
		const kind = toLayerKind(extracted.token);
		if (kind === "url")
			return { ...createLayer("url"), url: extractUrlFromToken(extracted.token) };
		if (kind.includes("gradient")) return { ...createLayer(kind), gradient: extracted.token };
		return { ...createLayer("raw"), raw: layerRaw };
	});
};

const parseBackgroundShorthandLayers = (rawValue) => {
	const value = String(rawValue || "").trim();
	if (!value || value.toLowerCase() === "none") return [];
	return splitCssAtDepthZero(value).map((layerRaw) => {
		const extracted = extractLeadingImageToken(layerRaw);
		if (!extracted) return { ...createLayer("raw"), raw: layerRaw };
		const kind = toLayerKind(extracted.token);
		if (kind === "raw") return { ...createLayer("raw"), raw: layerRaw };
		const settings = parseLayerSettings(extracted.rest);
		if (kind === "url") {
			return {
				...createLayer("url"),
				url: extractUrlFromToken(extracted.token),
				...settings,
			};
		}
		return { ...createLayer(kind), gradient: extracted.token, ...settings };
	});
};

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractBaseColorFromLayerRaws = (layerRaws = []) => {
	const layers = Array.isArray(layerRaws) ? [...layerRaws] : [];
	if (layers.length === 0) return { layers, baseColor: "" };
	const lastIndex = layers.length - 1;
	const lastRaw = String(layers[lastIndex] || "").trim();
	if (!lastRaw) return { layers, baseColor: "" };
	const tokens = tokenizeCssValue(lastRaw);
	if (tokens.length === 0) return { layers, baseColor: "" };
	const candidate = String(tokens[tokens.length - 1] || "").trim();
	if (!candidate || (!isColorToken(candidate) && !isColorKeyword(candidate))) {
		return { layers, baseColor: "" };
	}
	const exactColorPattern = new RegExp(`^${escapeRegex(candidate)}$`, "i");
	const withoutColor = exactColorPattern.test(lastRaw)
		? ""
		: lastRaw.replace(new RegExp(`\\s+${escapeRegex(candidate)}$`, "i"), "").trim();
	if (withoutColor) layers[lastIndex] = withoutColor;
	else layers.pop();
	return { layers, baseColor: candidate };
};

const parseBackgroundShorthandValue = (rawValue) => {
	const rawLayers = splitCssAtDepthZero(rawValue);
	const extracted = extractBaseColorFromLayerRaws(rawLayers);
	return {
		layers: parseBackgroundShorthandLayers(extracted.layers.join(", ")),
		baseColor: extracted.baseColor,
	};
};

const buildImageToken = (layer) => {
	const kind = String(layer?.kind || "").trim();
	if (kind === "url") {
		const url = String(layer?.url || "").trim();
		if (!url) return "";
		return `url("${url.replace(/"/g, '\\"')}")`;
	}
	if (
		kind === "gradient" ||
		kind === "linear-gradient" ||
		kind === "radial-gradient" ||
		kind === "conic-gradient"
	) {
		const gradientRaw = String(layer?.gradient || "").trim();
		if (!gradientRaw) return defaultGradientByKind(kind);
		if (/^(linear-gradient|radial-gradient|conic-gradient)\(/i.test(gradientRaw))
			return gradientRaw;
		if (kind === "radial-gradient" || kind === "conic-gradient")
			return `${kind}(${gradientRaw})`;
		return `linear-gradient(${gradientRaw})`;
	}
	if (kind === "raw") return String(layer?.raw || "").trim();
	return "";
};

const buildBackgroundImageLayers = (layers) => {
	const parts = (Array.isArray(layers) ? layers : [])
		.map((layer) => buildImageToken(layer))
		.filter(Boolean);
	return parts.length ? parts.join(", ") : "none";
};

const buildBackgroundShorthandLayers = (layers) => {
	const parts = (Array.isArray(layers) ? layers : [])
		.map((layer) => {
			if (String(layer?.kind || "") === "raw") return String(layer?.raw || "").trim();
			const image = buildImageToken(layer);
			if (!image) return "";
			const position = String(layer?.position || "").trim() || "50% 50%";
			const size = String(layer?.size || "").trim() || "cover";
			const repeat = REPEAT_SET.has(String(layer?.repeat || "").trim())
				? String(layer.repeat).trim()
				: "no-repeat";
			const attachment = ATTACHMENT_SET.has(String(layer?.attachment || "").trim())
				? String(layer.attachment).trim()
				: "scroll";
			return `${image} ${position} / ${size} ${repeat} ${attachment}`.trim();
		})
		.filter(Boolean);
	return parts.length ? parts.join(", ") : "none";
};

const buildBackgroundShorthandValue = (layers, baseColor = "") => {
	const color = String(baseColor || "").trim();
	const layersRaw = buildBackgroundShorthandLayers(layers);
	const layersValue = layersRaw === "none" ? "" : layersRaw;
	if (!layersValue && !color) return "none";
	if (!layersValue) return color;
	if (!color) return layersValue;
	return `${layersValue}, ${color}`;
};

const normalizeLayerKind = (kind) => {
	const normalized = String(kind || "url")
		.trim()
		.toLowerCase();
	if (
		normalized === "linear-gradient" ||
		normalized === "radial-gradient" ||
		normalized === "conic-gradient"
	) {
		return "gradient";
	}
	return normalized || "url";
};

const isGradientValue = (value) =>
	/^(linear-gradient|radial-gradient|conic-gradient)\(/i.test(String(value || "").trim());

const normalizeLayerKinds = (layerTypes) => {
	const source =
		Array.isArray(layerTypes) && layerTypes.length > 0 ? layerTypes : DEFAULT_LAYER_TYPES;
	const seen = new Set();
	const out = [];
	source.forEach((entry) => {
		const key = String(entry || "")
			.trim()
			.toLowerCase();
		const kind = LAYER_TYPE_TO_KIND[key];
		if (!kind || seen.has(kind)) return;
		seen.add(kind);
		out.push(kind);
	});
	return out.length > 0 ? out : ["url", "gradient", "raw"];
};

export const BackgroundLayersControl = ({
	value,
	onChange,
	mode,
	onBeforeOpenMediaModal,
	withBaseColor = false,
	showLayerSettings = true,
	layerTypes = DEFAULT_LAYER_TYPES,
	themeColors = [],
	disableCustomColors = false,
	colorToPresetVar = (next) => next,
}) => {
	const resolvedMode =
		mode === "background" || mode === "background-image"
			? mode
			: withBaseColor || showLayerSettings
				? "background"
				: "background-image";
	const isBackgroundMode = resolvedMode === "background";
	const allowedLayerKinds = useMemo(() => normalizeLayerKinds(layerTypes), [layerTypes]);
	const layerKindOptions = useMemo(
		() => LAYER_KIND_OPTIONS.filter((option) => allowedLayerKinds.includes(option.value)),
		[allowedLayerKinds]
	);

	const parseValue = useCallback(
		(rawValue) =>
			!isBackgroundMode
				? { layers: parseBackgroundImageLayers(rawValue), baseColor: "" }
				: parseBackgroundShorthandValue(rawValue),
		[isBackgroundMode]
	);

	const serializeValue = (nextLayers, nextBaseColor) =>
		!isBackgroundMode
			? buildBackgroundImageLayers(nextLayers)
			: buildBackgroundShorthandValue(nextLayers, nextBaseColor);

	const initial = parseValue(value);
	const displayIdCounterRef = useRef(1);
	const claimDisplayId = useCallback(() => {
		const next = displayIdCounterRef.current;
		displayIdCounterRef.current += 1;
		return next;
	}, []);
	const attachDisplayIds = useCallback(
		(inputLayers) => {
			const source = Array.isArray(inputLayers) ? inputLayers : [];
			let maxSeen = 0;
			source.forEach((layer) => {
				const candidate = Number(layer?.displayId);
				if (Number.isFinite(candidate) && candidate > 0)
					maxSeen = Math.max(maxSeen, candidate);
			});
			if (maxSeen >= displayIdCounterRef.current) displayIdCounterRef.current = maxSeen + 1;
			return source.map((layer) => {
				const candidate = Number(layer?.displayId);
				if (Number.isFinite(candidate) && candidate > 0) return layer;
				return { ...layer, displayId: claimDisplayId() };
			});
		},
		[claimDisplayId]
	);

	const [layers, setLayers] = useState(() =>
		attachDisplayIds(Array.isArray(initial.layers) ? initial.layers : [])
	);
	const [baseColor, setBaseColor] = useState(() => initial.baseColor);
	const [activeLayerIndex, setActiveLayerIndex] = useState(0);
	const lastValueRef = useRef(String(value || "").trim());

	useEffect(() => {
		const nextValue = String(value || "").trim();
		if (nextValue === lastValueRef.current) return;
		lastValueRef.current = nextValue;
		const parsed = parseValue(nextValue);
		setLayers(attachDisplayIds(Array.isArray(parsed.layers) ? parsed.layers : []));
		setBaseColor(parsed.baseColor);
	}, [attachDisplayIds, parseValue, value]);

	useEffect(() => {
		if (activeLayerIndex < layers.length) return;
		setActiveLayerIndex(Math.max(0, layers.length - 1));
	}, [activeLayerIndex, layers.length]);

	const updateValue = (nextLayers, nextBaseColor = baseColor) => {
		const normalized = attachDisplayIds(Array.isArray(nextLayers) ? nextLayers : []);
		const normalizedBaseColor = String(nextBaseColor || "").trim();
		setLayers(normalized);
		setBaseColor(normalizedBaseColor);
		const output = serializeValue(normalized, normalizedBaseColor);
		lastValueRef.current = output;
		onChange(output);
	};

	const updateLayer = (id, patch) => {
		updateValue(layers.map((layer) => (layer.id !== id ? layer : { ...layer, ...patch })));
	};

	const changeLayerKind = (id, nextKind) => {
		if (!allowedLayerKinds.includes(String(nextKind || ""))) return;
		updateValue(
			layers.map((layer) => {
				if (layer.id !== id) return layer;
				const kind = String(nextKind || "raw");
				const nextLayer = { ...layer, kind };
				if (kind === "url") {
					nextLayer.url = layer.url || "";
					nextLayer.raw = "";
				} else if (kind.includes("gradient")) {
					const rawCandidate = String(layer.raw || "").trim();
					const gradientCandidate = String(layer.gradient || "").trim();
					nextLayer.gradient = isGradientValue(rawCandidate)
						? rawCandidate
						: isGradientValue(gradientCandidate)
							? gradientCandidate
							: defaultGradientByKind(kind);
					nextLayer.raw = "";
				} else {
					nextLayer.raw = String(layer.raw || "").trim() || buildImageToken(layer) || "";
				}
				return nextLayer;
			})
		);
	};

	const addLayer = () => {
		const defaultKind = allowedLayerKinds[0] || "url";
		const next = [...layers, createLayer(defaultKind, claimDisplayId())];
		updateValue(next);
		setActiveLayerIndex(next.length - 1);
	};

	const removeLayer = (index) => {
		if (!layers[index]) return;
		const next = layers.filter((_, currentIndex) => currentIndex !== index);
		updateValue(next);
		setActiveLayerIndex(Math.max(0, Math.min(next.length - 1, index)));
	};

	const duplicateLayer = (index) => {
		const layer = layers[index];
		if (!layer) return;
		const clone = { ...layer, id: createId(), displayId: claimDisplayId() };
		const next = [...layers];
		next.splice(index + 1, 0, clone);
		updateValue(next);
		setActiveLayerIndex(index + 1);
	};

	const moveLayer = (fromIndex, toIndex) => {
		if (!layers[fromIndex] || !Number.isFinite(toIndex)) return;
		const next = reorderArrayItem(layers, fromIndex, toIndex);
		updateValue(next);
		setActiveLayerIndex(Math.max(0, Math.min(next.length - 1, toIndex)));
	};

	const activeLayer = layers[activeLayerIndex] || null;
	const activeLayerKind = normalizeLayerKind(activeLayer?.kind || "url");
	const updateActiveLayer = (patch) => {
		if (!activeLayer?.id) return;
		updateLayer(activeLayer.id, patch);
	};

	return (
		<div className="motto-background-layers-control">
			{isBackgroundMode ? (
				<BackgroundBaseColorControl
					value={baseColor}
					onChange={(nextColor) => updateValue(layers, nextColor ?? "")}
					themeColors={themeColors}
					disableCustomColors={disableCustomColors}
					colorToPresetVar={colorToPresetVar}
				/>
			) : null}

			<LayerTabs
				items={layers}
				activeIndex={activeLayerIndex}
				onActiveChange={setActiveLayerIndex}
				onAdd={addLayer}
				onDuplicate={duplicateLayer}
				onRemove={removeLayer}
				onReorder={moveLayer}
				canRemove={() => true}
				getItemLabel={(item, index) =>
					`${__("Layer", "motto-blocks")} ${Number.isFinite(Number(item?.displayId)) ? item.displayId : index + 1}`
				}
				ariaLabel={__("Background layers", "motto-blocks")}
				addAriaLabel={__("Add background layer", "motto-blocks")}
				duplicateAriaLabel={__("Duplicate layer", "motto-blocks")}
				removeAriaLabel={__("Remove layer", "motto-blocks")}
				className="motto-background-layers-tabs"
				tabBehavior={{
					allowNoTabs: true,
					addLabel: __("Bg Image / Gradient", "motto-blocks"),
				}}
			/>

			{activeLayer ? (
				<div className="motto-background-layer-panel">
					{layerKindOptions.length > 1 ? (
						<ToggleGroupControl
							label={__("Layer type", "motto-blocks")}
							value={
								allowedLayerKinds.includes(activeLayerKind)
									? activeLayerKind
									: undefined
							}
							onChange={(nextKind) => {
								if (!nextKind || !activeLayer?.id) return;
								changeLayerKind(activeLayer.id, nextKind);
							}}
							isBlock
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							className="motto-background-layer-type"
						>
							{layerKindOptions.map((option) => {
								const Icon = option.icon;
								const optionLabel = String(
									option?.ariaLabel || option?.label || option?.value || ""
								);
								return (
									<ToggleGroupControlOption
										key={option.value}
										value={option.value}
										label={<Icon size={14} />}
										aria-label={optionLabel}
										title={optionLabel}
									/>
								);
							})}
						</ToggleGroupControl>
					) : null}

					{activeLayerKind === "url" ? (
						isBackgroundMode ? (
							<BackgroundImageLayerControl
								layer={activeLayer}
								onChange={updateActiveLayer}
								i18nDomain="motto-blocks"
								onBeforeOpenMediaModal={onBeforeOpenMediaModal}
								focalPointControlsClassName="motto-background-focal-point"
							/>
						) : (
							<BackgroundImageControl
								value={activeLayer}
								onChange={(patch) => updateActiveLayer({ kind: "url", ...patch })}
								i18nDomain="motto-blocks"
								onBeforeOpenMediaModal={onBeforeOpenMediaModal}
							/>
						)
					) : null}

					{activeLayerKind === "gradient" ? (
						<GradientControl
							value={String(activeLayer?.gradient || "")}
							onChange={(nextGradient) =>
								updateActiveLayer({ gradient: nextGradient })
							}
							kind={activeLayerKind}
							placeholder={defaultGradientByKind(activeLayerKind)}
						/>
					) : null}

					{activeLayerKind === "raw" ? (
						<CssFunctionAutocompleteControl
							label={__("Raw layer value", "motto-blocks")}
							className="motto-input motto-sub-value-prop"
							value={String(activeLayer?.raw || "")}
							onChange={(nextRaw) => updateActiveLayer({ raw: nextRaw })}
							placeholder={__("url(...) or gradient(...)", "motto-blocks")}
							autoComplete="off"
						/>
					) : null}
				</div>
			) : null}
		</div>
	);
};
