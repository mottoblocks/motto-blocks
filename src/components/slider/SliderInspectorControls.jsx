import { InspectorControls } from "@wordpress/block-editor";
import { PanelBody, RangeControl, SelectControl, ToggleControl } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { DeviceToggleControl } from "@components";
import { PREVIEW_STORE_KEY, TRANSITION_EFFECT_OPTIONS } from "./constants";
import { normalizeTransitionEffect } from "./swiper-utils";
import { toNumber, toDecimal, setResponsiveAttribute } from "./settings";
import {
	createDefaultNavigationIconOptions,
	normalizeNavigationIconOptions,
} from "./navigation-options";
import { NavigationIconSelector } from "./navigation-icon-selector";

export function SliderPanelBodies({
	settings,
	attributes,
	setAttributes,
	activeMode,
	showNavigationCustomization,
	setShowNavigationCustomization,
}) {
	const navigationIconOptions = normalizeNavigationIconOptions(attributes.navigationIcons);

	return (
		<>
			<PanelBody
				title={__("Slider Settings", "motto-blocks")}
				className="motto-panel-body"
				initialOpen
			>
				<div className="motto-panel-section">
					<div className="motto-flex align-end gap-md motto-slider__slides-per-view-controls">
						<RangeControl
							label={__("Slides per view", "motto-blocks")}
							value={settings.slidesPerView}
							onChange={(value) =>
								setResponsiveAttribute(
									setAttributes,
									attributes,
									activeMode,
									"slidesPerView",
									toDecimal(value, 1)
								)
							}
							min={0.1}
							max={6}
							step={0.1}
							disabled={settings.slidesPerViewAuto}
						/>

						<ToggleControl
							className="motto-toggle motto-toggle-large"
							label={__("Auto", "motto-blocks")}
							checked={settings.slidesPerViewAuto}
							onChange={(value) =>
								setResponsiveAttribute(
									setAttributes,
									attributes,
									activeMode,
									"slidesPerViewAuto",
									value
								)
							}
						/>

						<DeviceToggleControl storeKey={PREVIEW_STORE_KEY} />
					</div>

					<RangeControl
						label={__("Space between (px)", "motto-blocks")}
						value={settings.spaceBetween}
						onChange={(value) =>
							setResponsiveAttribute(
								setAttributes,
								attributes,
								activeMode,
								"spaceBetween",
								toNumber(value, 16)
							)
						}
						min={0}
						max={80}
					/>

					<RangeControl
						label={__("Speed (ms)", "motto-blocks")}
						value={settings.speed}
						onChange={(value) => setAttributes({ speed: toNumber(value, 300) })}
						min={0}
						max={4000}
						step={50}
					/>
				</div>
			</PanelBody>

			<PanelBody
				title={__("Effects and Transitions", "motto-blocks")}
				className="motto-panel-body"
				initialOpen={false}
			>
				<div className="motto-panel-section">
					<SelectControl
						className="motto-select"
						label={__("Transition effect", "motto-blocks")}
						value={settings.transitionEffect}
						options={TRANSITION_EFFECT_OPTIONS}
						onChange={(value) =>
							setAttributes({ transitionEffect: normalizeTransitionEffect(value) })
						}
					/>

					<ToggleControl
						className="motto-toggle"
						label={__("Loop", "motto-blocks")}
						checked={settings.loop}
						disabled={settings.freeMode}
						onChange={(value) => setAttributes({ loop: value })}
					/>

					<ToggleControl
						className="motto-toggle"
						label={__("Centered slides", "motto-blocks")}
						checked={settings.centeredSlides}
						onChange={(value) => setAttributes({ centeredSlides: value })}
					/>

					<ToggleControl
						className="motto-toggle"
						label={__("Free mode (free scroll)", "motto-blocks")}
						checked={settings.freeMode}
						onChange={(value) => {
							const nextValue = Boolean(value);
							setAttributes({
								freeMode: nextValue,
								freeModeSticky: nextValue
									? Boolean(attributes.freeModeSticky)
									: false,
							});
						}}
					/>

					<ToggleControl
						className="motto-toggle"
						label={__("Free mode: sticky (snap)", "motto-blocks")}
						checked={settings.freeModeSticky}
						disabled={!settings.freeMode}
						onChange={(value) => setAttributes({ freeModeSticky: Boolean(value) })}
					/>

					<ToggleControl
						className="motto-toggle"
						label={__("Mousewheel", "motto-blocks")}
						checked={settings.mousewheelEnabled}
						onChange={(value) => setAttributes({ mousewheelEnabled: Boolean(value) })}
					/>

					{settings.mousewheelEnabled && (
						<>
							<ToggleControl
								className="motto-toggle"
								label={__("Force to axis", "motto-blocks")}
								checked={settings.mousewheelForceToAxis}
								onChange={(value) =>
									setAttributes({ mousewheelForceToAxis: Boolean(value) })
								}
							/>

							<ToggleControl
								className="motto-toggle"
								label={__("Release on edges", "motto-blocks")}
								checked={settings.mousewheelReleaseOnEdges}
								onChange={(value) =>
									setAttributes({ mousewheelReleaseOnEdges: Boolean(value) })
								}
							/>

							<RangeControl
								className="motto-range"
								label={__("Mousewheel sensitivity", "motto-blocks")}
								value={settings.mousewheelSensitivity}
								min={0.1}
								max={5}
								step={0.1}
								onChange={(value) =>
									setAttributes({ mousewheelSensitivity: toDecimal(value, 1) })
								}
							/>
						</>
					)}

					<ToggleControl
						className="motto-toggle"
						label={__("Autoplay", "motto-blocks")}
						checked={settings.autoplayEnabled}
						onChange={(value) => setAttributes({ autoplayEnabled: value })}
					/>

					{settings.autoplayEnabled && (
						<RangeControl
							className="motto-range"
							label={__("Autoplay delay (ms)", "motto-blocks")}
							value={settings.autoplayDelay}
							min={300}
							max={10000}
							step={100}
							onChange={(value) =>
								setAttributes({ autoplayDelay: toNumber(value, 3000) })
							}
						/>
					)}

					<ToggleControl
						className="motto-toggle"
						label={__("Scrollbar", "motto-blocks")}
						checked={settings.scrollbar}
						onChange={(value) => setAttributes({ scrollbar: value })}
					/>
				</div>
			</PanelBody>

			<PanelBody
				title={__("Navigation", "motto-blocks")}
				className="motto-panel-body"
				initialOpen={false}
			>
				<div className="motto-panel-section">
					<ToggleControl
						className="motto-toggle"
						label={__("Enable navigation", "motto-blocks")}
						checked={settings.navigation}
						onChange={(value) =>
							setResponsiveAttribute(
								setAttributes,
								attributes,
								activeMode,
								"navigation",
								Boolean(value)
							)
						}
					/>

					<ToggleControl
						className="motto-toggle"
						label={__("Customize navigation", "motto-blocks")}
						checked={showNavigationCustomization}
						disabled={!settings.navigation}
						onChange={(value) => {
							const nextValue = Boolean(value);
							setShowNavigationCustomization(nextValue);
							if (!nextValue) {
								setAttributes({
									navigationIcons: createDefaultNavigationIconOptions(),
								});
							}
						}}
					/>

					{settings.navigation && showNavigationCustomization && (
						<NavigationIconSelector
							value={navigationIconOptions}
							onChange={(nextNavigationIcons) =>
								setAttributes({ navigationIcons: nextNavigationIcons })
							}
						/>
					)}
				</div>
			</PanelBody>

			<PanelBody
				title={__("Pagination", "motto-blocks")}
				className="motto-panel-body"
				initialOpen={false}
			>
				<div className="motto-panel-section">
					<ToggleControl
						className="motto-toggle"
						label={__("Enable pagination", "motto-blocks")}
						checked={settings.pagination}
						onChange={(value) =>
							setResponsiveAttribute(
								setAttributes,
								attributes,
								activeMode,
								"pagination",
								Boolean(value)
							)
						}
					/>

					<ToggleControl
						className="motto-toggle"
						label={__("Pagination clickable", "motto-blocks")}
						checked={settings.paginationClickable}
						disabled={!settings.pagination}
						onChange={(value) => setAttributes({ paginationClickable: value })}
					/>
				</div>
			</PanelBody>
		</>
	);
}

export function SliderInspectorControls(props) {
	return (
		<InspectorControls>
			<SliderPanelBodies {...props} />
		</InspectorControls>
	);
}
