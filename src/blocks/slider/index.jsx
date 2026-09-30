import metadata from "./block.json";
import { BlockIcon } from "@components/primitives/BlockIcon";
import blockIcon from "@block-icons/slider.svg?raw";
import { registerBlockType } from "@wordpress/blocks";
import {
	BlockControls,
	InnerBlocks,
	useBlockProps,
	useInnerBlocksProps,
} from "@wordpress/block-editor";
import { useEffect, useMemo, useRef, useState } from "@wordpress/element";
import { useDispatch } from "@wordpress/data";
import { ToolbarButton, ToolbarGroup } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { useEditorBlockDragLock } from "@components";
import sharedBreakpointsConfig from "@config/motto-breakpoints.json";
import {
	hasConfiguredNavigationIcon,
	NavigationIconMedia,
} from "@components/slider/navigation-icon-media";
import { normalizeNavigationIconOptions } from "@components/slider/navigation-options";
import { ALLOWED_BLOCKS, TEMPLATE } from "./slider-constants";
import {
	getSettings,
	isEnabledInAnyMode,
	buildSwiperBreakpoints,
	toDataAttributes,
	useActiveMode,
	useSwiperBreakpoints,
} from "@components/slider/settings";
import { useSwiperInstance } from "./use-swiper-instance";
import { SliderInspectorControls } from "@components/slider/SliderInspectorControls";
import { getMottoBaseLayoutClassName } from "../../styler/layout/base-layout";

const BASE_LAYOUT_CLASS = getMottoBaseLayoutClassName(metadata.mottoBaseLayout);

registerBlockType(metadata.name, {
	...metadata,
	icon: {
		src: <BlockIcon svg={blockIcon} />,
	},
	edit: ({ attributes, setAttributes, hasSelectedInnerBlock }) => {
		const { selectBlock } = useDispatch("core/block-editor");
		const activeMode = useActiveMode();
		const settings = getSettings(attributes, activeMode);

		const { swiperBreakpoints, swiperBreakpointsSignature } = useSwiperBreakpoints(attributes);
		const persistedSwiperBreakpointsSignature = useMemo(
			() => JSON.stringify(attributes.swiperBreakpoints || {}),
			[attributes.swiperBreakpoints]
		);

		const swiperElementRef = useRef(null);
		const swiperInstanceRef = useRef(null);
		const swiperModuleSignatureRef = useRef("");

		const [showNavigationCustomization, setShowNavigationCustomization] = useState(false);
		const hasNavigationInAnyMode = isEnabledInAnyMode(attributes, "navigation");
		const hasPaginationInAnyMode = isEnabledInAnyMode(attributes, "pagination");

		const blockProps = useBlockProps({ className: `motto-slider ${BASE_LAYOUT_CLASS}` });
		const dataAttributes = toDataAttributes(settings, swiperBreakpoints);
		const navigationIconOptions = normalizeNavigationIconOptions(attributes.navigationIcons);

		const wrapperInnerBlocksProps = useInnerBlocksProps(
			{ className: "swiper-wrapper" },
			{
				allowedBlocks: ALLOWED_BLOCKS,
				template: TEMPLATE,
				templateLock: false,
				orientation: "horizontal",
			}
		);

		useEditorBlockDragLock(swiperElementRef);

		// Persist computed breakpoints to block attributes for frontend use.
		useEffect(() => {
			if (swiperBreakpointsSignature === persistedSwiperBreakpointsSignature) {
				return;
			}
			setAttributes({ swiperBreakpoints });
		}, [
			persistedSwiperBreakpointsSignature,
			setAttributes,
			swiperBreakpoints,
			swiperBreakpointsSignature,
		]);

		useSwiperInstance({
			swiperElementRef,
			swiperInstanceRef,
			swiperModuleSignatureRef,
			settings,
			swiperBreakpoints,
			swiperBreakpointsSignature,
			hasSelectedInnerBlock,
			hasNavigationInAnyMode,
			hasPaginationInAnyMode,
			selectBlock,
		});

		return (
			<>
				<BlockControls>
					<ToolbarGroup>
						<ToolbarButton
							icon="controls-play"
							isPressed={settings.autoplayEnabled}
							label={
								settings.autoplayEnabled
									? __("Disable autoplay", "motto-blocks")
									: __("Enable autoplay", "motto-blocks")
							}
							onClick={() =>
								setAttributes({ autoplayEnabled: !settings.autoplayEnabled })
							}
						/>
					</ToolbarGroup>
				</BlockControls>

				<SliderInspectorControls
					settings={settings}
					attributes={attributes}
					setAttributes={setAttributes}
					activeMode={activeMode}
					showNavigationCustomization={showNavigationCustomization}
					setShowNavigationCustomization={setShowNavigationCustomization}
				/>

				<div {...blockProps}>
					<div className="motto-swiper swiper" ref={swiperElementRef} {...dataAttributes}>
						<div {...wrapperInnerBlocksProps} />
					</div>
					{hasNavigationInAnyMode && (
						<>
							<button
								className={`swiper-button-prev${hasConfiguredNavigationIcon(navigationIconOptions.prev, true) ? " is-custom-nav-icon" : ""}`}
								type="button"
								tabIndex={-1}
								aria-label={__("Previous slide", "motto-blocks")}
							>
								<NavigationIconMedia
									value={navigationIconOptions.prev}
									isEditorPreview
								/>
							</button>
							<button
								className={`swiper-button-next${hasConfiguredNavigationIcon(navigationIconOptions.next, true) ? " is-custom-nav-icon" : ""}`}
								type="button"
								tabIndex={-1}
								aria-label={__("Next slide", "motto-blocks")}
							>
								<NavigationIconMedia
									value={navigationIconOptions.next}
									isEditorPreview
								/>
							</button>
						</>
					)}
					{hasPaginationInAnyMode && <div className="swiper-pagination" />}
					{settings.scrollbar && <div className="swiper-scrollbar" />}
				</div>
			</>
		);
	},
	save: ({ attributes }) => {
		const settings = getSettings(attributes);
		const swiperBreakpoints =
			attributes?.swiperBreakpoints &&
			typeof attributes.swiperBreakpoints === "object" &&
			Object.keys(attributes.swiperBreakpoints).length > 0
				? attributes.swiperBreakpoints
				: buildSwiperBreakpoints(attributes, sharedBreakpointsConfig);
		const blockProps = useBlockProps.save({ className: `motto-slider ${BASE_LAYOUT_CLASS}` });
		const hasNavigationInAnyMode = isEnabledInAnyMode(attributes, "navigation");
		const hasPaginationInAnyMode = isEnabledInAnyMode(attributes, "pagination");
		const dataAttributes = toDataAttributes(settings, swiperBreakpoints, {
			navigation: hasNavigationInAnyMode,
			pagination: hasPaginationInAnyMode,
		});
		const navigationIconOptions = normalizeNavigationIconOptions(attributes.navigationIcons);

		return (
			<div {...blockProps}>
				<div className="motto-swiper swiper" {...dataAttributes}>
					<div className="swiper-wrapper">
						<InnerBlocks.Content />
					</div>
				</div>
				{hasNavigationInAnyMode && (
					<>
						<button
							className={`swiper-button-prev${hasConfiguredNavigationIcon(navigationIconOptions.prev) ? " is-custom-nav-icon" : ""}`}
							type="button"
							aria-label={__("Previous slide", "motto-blocks")}
						>
							<NavigationIconMedia value={navigationIconOptions.prev} />
						</button>
						<button
							className={`swiper-button-next${hasConfiguredNavigationIcon(navigationIconOptions.next) ? " is-custom-nav-icon" : ""}`}
							type="button"
							aria-label={__("Next slide", "motto-blocks")}
						>
							<NavigationIconMedia value={navigationIconOptions.next} />
						</button>
					</>
				)}
				{hasPaginationInAnyMode && <div className="swiper-pagination" />}
				{settings.scrollbar && <div className="swiper-scrollbar" />}
			</div>
		);
	},
});
