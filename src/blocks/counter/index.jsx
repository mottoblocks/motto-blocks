import metadata from "./block.json";
import { BlockIcon } from "@components/primitives/BlockIcon";
import blockIcon from "@block-icons/counter.svg?raw";
import { registerBlockType } from "@wordpress/blocks";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import {
	PanelBody,
	SelectControl,
	TextControl,
	ToggleControl,
	__experimentalToggleGroupControl as ExperimentalToggleGroupControl,
	__experimentalToggleGroupControlOption as ExperimentalToggleGroupControlOption,
	ToggleGroupControl,
	ToggleGroupControlOption,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import clsx from "clsx";

import { getMottoBaseLayoutClassName } from "../../styler/layout/base-layout";
import {
	COUNTER_EASING_OPTIONS,
	formatCounterValue,
	getCounterLocale,
	normalizeCounterAttributes,
	normalizeTagName,
} from "./counter-utils";
import { useCounterPreview } from "./use-counter-preview";

const BASE_LAYOUT_CLASS = getMottoBaseLayoutClassName(metadata.mottoBaseLayout);
const SafeToggleGroupControl = ToggleGroupControl || ExperimentalToggleGroupControl;
const SafeToggleGroupControlOption =
	ToggleGroupControlOption || ExperimentalToggleGroupControlOption;
const TAG_OPTIONS = [
	{ label: __("Div", "motto-blocks"), value: "div" },
	{ label: __("Paragraph", "motto-blocks"), value: "p" },
	{ label: __("Span", "motto-blocks"), value: "span" },
	{ label: __("Heading 1", "motto-blocks"), value: "h1" },
	{ label: __("Heading 2", "motto-blocks"), value: "h2" },
	{ label: __("Heading 3", "motto-blocks"), value: "h3" },
	{ label: __("Heading 4", "motto-blocks"), value: "h4" },
	{ label: __("Heading 5", "motto-blocks"), value: "h5" },
	{ label: __("Heading 6", "motto-blocks"), value: "h6" },
];
const LABEL_POSITION_OPTIONS = [
	{ label: __("Top", "motto-blocks"), value: "top" },
	{ label: __("Bottom", "motto-blocks"), value: "bottom" },
];
const REPLAY_MODE_OPTIONS = [
	{ label: __("Once", "motto-blocks"), value: "once" },
	{ label: __("Replay", "motto-blocks"), value: "replay" },
];
const THOUSANDS_SEPARATOR_OPTIONS = [
	{ label: __("Locale", "motto-blocks"), value: "locale" },
	{ label: __("Custom", "motto-blocks"), value: "custom" },
	{ label: __("None", "motto-blocks"), value: "none" },
];

function getCounterClassName(normalized, isCounting, isComplete) {
	const showLabel = normalized.showLabel && normalized.label.trim() !== "";

	return clsx(
		"motto-counter",
		BASE_LAYOUT_CLASS,
		normalized.labelPosition === "top" ? "label-top" : "label-bottom",
		normalized.prefix ? "has-prefix" : null,
		normalized.suffix ? "has-suffix" : null,
		showLabel ? "has-label" : null,
		isCounting ? "is-counting" : null,
		isComplete ? "is-complete" : null
	);
}

function CounterMarkup({ attributes, blockProps, displayValue }) {
	const normalized = normalizeCounterAttributes(attributes);
	const TagName = normalizeTagName(normalized.tagName);
	const showLabel = normalized.showLabel && normalized.label.trim() !== "";
	const value =
		displayValue ||
		formatCounterValue(normalized.endValue, {
			step: normalized.step,
			thousandsSeparatorMode: normalized.thousandsSeparatorMode,
			thousandsSeparator: normalized.thousandsSeparator,
			locale: getCounterLocale(),
		});
	const rootProps = {
		...blockProps,
		"data-counter-start": String(normalized.startValue),
		"data-counter-end": String(normalized.endValue),
		"data-counter-duration": String(normalized.duration),
		"data-counter-delay": String(normalized.delay),
		"data-counter-easing": normalized.easing,
		"data-counter-step": String(normalized.step),
		"data-counter-replay": normalized.replayMode,
		"data-counter-separator-mode": normalized.thousandsSeparatorMode,
		"data-counter-separator": normalized.thousandsSeparator,
		"data-counter-reduced-motion": normalized.respectReducedMotion ? "true" : "false",
	};

	return (
		<TagName {...rootProps}>
			<div className="motto-counter__content">
				{normalized.prefix ? (
					<span className="motto-counter__prefix">{normalized.prefix}</span>
				) : null}
				<span className="motto-counter__value">{value}</span>
				{normalized.suffix ? (
					<span className="motto-counter__suffix">{normalized.suffix}</span>
				) : null}
			</div>
			{showLabel ? <div className="motto-counter__label">{normalized.label}</div> : null}
		</TagName>
	);
}

function CounterEditorPreview({ attributes, displayValue, isCounting, isComplete }) {
	const normalized = normalizeCounterAttributes(attributes);
	const blockProps = useBlockProps({
		className: getCounterClassName(normalized, isCounting, isComplete),
	});

	return (
		<CounterMarkup
			attributes={attributes}
			blockProps={blockProps}
			displayValue={displayValue}
		/>
	);
}

function CounterSavePreview({ attributes }) {
	const normalized = normalizeCounterAttributes(attributes);
	const blockProps = useBlockProps.save({
		className: getCounterClassName(normalized, false, false),
	});

	return <CounterMarkup attributes={attributes} blockProps={blockProps} />;
}

function Edit({ attributes, setAttributes }) {
	const normalized = normalizeCounterAttributes(attributes);
	const { displayValue, isCounting, isComplete } = useCounterPreview(normalized);

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={__("Content", "motto-blocks")}
					className="motto-panel-body"
					initialOpen
				>
					<div className="motto-panel-section">
						<SelectControl
							label={__("Tag", "motto-blocks")}
							className="motto-select"
							value={normalized.tagName}
							options={TAG_OPTIONS}
							onChange={(tagName) => setAttributes({ tagName })}
						/>
						<TextControl
							label={__("Prefix", "motto-blocks")}
							className="motto-input"
							value={normalized.prefix}
							onChange={(prefix) => setAttributes({ prefix })}
						/>
						<TextControl
							label={__("Start value", "motto-blocks")}
							type="number"
							className="motto-input"
							value={String(normalized.startValue)}
							onChange={(startValue) =>
								setAttributes({ startValue: Number(startValue) || 0 })
							}
						/>
						<TextControl
							label={__("End value", "motto-blocks")}
							type="number"
							className="motto-input"
							value={String(normalized.endValue)}
							onChange={(endValue) =>
								setAttributes({ endValue: Number(endValue) || 0 })
							}
						/>
						<TextControl
							label={__("Suffix", "motto-blocks")}
							className="motto-input"
							value={normalized.suffix}
							onChange={(suffix) => setAttributes({ suffix })}
						/>
					</div>
					<div className="motto-panel-section">
						<ToggleControl
							label={__("Show label", "motto-blocks")}
							className="motto-toggle"
							checked={normalized.showLabel}
							onChange={(showLabel) => setAttributes({ showLabel })}
						/>
						{normalized.showLabel ? (
							<>
								<TextControl
									label={__("Label", "motto-blocks")}
									className="motto-input"
									value={normalized.label}
									onChange={(label) => setAttributes({ label })}
								/>
								<SafeToggleGroupControl
									label={__("Label position", "motto-blocks")}
									value={normalized.labelPosition}
									className="motto-toggle-group"
									isBlock
									onChange={(labelPosition) => {
										if (labelPosition) setAttributes({ labelPosition });
									}}
								>
									{LABEL_POSITION_OPTIONS.map((option) => (
										<SafeToggleGroupControlOption
											key={option.value}
											value={option.value}
											label={option.label}
										/>
									))}
								</SafeToggleGroupControl>
							</>
						) : null}
					</div>
				</PanelBody>

				<PanelBody
					title={__("Animation", "motto-blocks")}
					className="motto-panel-body"
					initialOpen={false}
				>
					<div className="motto-panel-section">
						<TextControl
							label={__("Duration (s)", "motto-blocks")}
							type="number"
							className="motto-input"
							value={String(normalized.duration)}
							onChange={(duration) =>
								setAttributes({ duration: Math.max(0, Number(duration) || 0) })
							}
						/>
						<TextControl
							label={__("Delay (s)", "motto-blocks")}
							type="number"
							className="motto-input"
							value={String(normalized.delay)}
							onChange={(delay) =>
								setAttributes({ delay: Math.max(0, Number(delay) || 0) })
							}
						/>
						<SelectControl
							label={__("Easing", "motto-blocks")}
							className="motto-select"
							value={normalized.easing}
							options={COUNTER_EASING_OPTIONS}
							onChange={(easing) => setAttributes({ easing })}
						/>
						<TextControl
							label={__("Step", "motto-blocks")}
							type="number"
							className="motto-input"
							value={String(normalized.step)}
							onChange={(step) =>
								setAttributes({ step: Math.max(Number.EPSILON, Number(step) || 1) })
							}
						/>
						<SafeToggleGroupControl
							label={__("Replay mode", "motto-blocks")}
							value={normalized.replayMode}
							className="motto-toggle-group"
							isBlock
							onChange={(replayMode) => {
								if (replayMode) setAttributes({ replayMode });
							}}
						>
							{REPLAY_MODE_OPTIONS.map((option) => (
								<SafeToggleGroupControlOption
									key={option.value}
									value={option.value}
									label={option.label}
								/>
							))}
						</SafeToggleGroupControl>
						<ToggleControl
							label={__("Respect reduced motion", "motto-blocks")}
							className="motto-toggle"
							checked={normalized.respectReducedMotion}
							onChange={(respectReducedMotion) =>
								setAttributes({ respectReducedMotion })
							}
						/>
					</div>
				</PanelBody>

				<PanelBody
					title={__("Format", "motto-blocks")}
					className="motto-panel-body"
					initialOpen={false}
				>
					<div className="motto-panel-section">
						<SelectControl
							label={__("Thousands separator", "motto-blocks")}
							className="motto-select"
							value={normalized.thousandsSeparatorMode}
							options={THOUSANDS_SEPARATOR_OPTIONS}
							onChange={(thousandsSeparatorMode) =>
								setAttributes({ thousandsSeparatorMode })
							}
						/>
						{normalized.thousandsSeparatorMode === "custom" ? (
							<TextControl
								label={__("Custom separator", "motto-blocks")}
								className="motto-input"
								value={normalized.thousandsSeparator}
								onChange={(thousandsSeparator) =>
									setAttributes({
										thousandsSeparator: String(thousandsSeparator || "").slice(
											0,
											1
										),
									})
								}
							/>
						) : null}
					</div>
				</PanelBody>
			</InspectorControls>

			<CounterEditorPreview
				attributes={normalized}
				displayValue={displayValue}
				isCounting={isCounting}
				isComplete={isComplete}
			/>
		</>
	);
}

function Save({ attributes }) {
	return <CounterSavePreview attributes={attributes} />;
}

registerBlockType(metadata.name, {
	...metadata,
	icon: {
		src: <BlockIcon svg={blockIcon} />,
	},
	edit: Edit,
	save: Save,
});
