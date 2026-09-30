import metadata from "./block.json";
import { BlockIcon } from "@components/primitives/BlockIcon";
import blockIcon from "@block-icons/classic-menu.svg?raw";
import { registerBlockType } from "@wordpress/blocks";
import { InspectorControls, useBlockProps } from "@wordpress/block-editor";
import {
	PanelBody,
	Spinner,
	SelectControl,
	ToggleGroupControl,
	ToggleGroupControlOption,
	__experimentalToggleGroupControl as ExperimentalToggleGroupControl,
	__experimentalToggleGroupControlOption as ExperimentalToggleGroupControlOption,
} from "@wordpress/components";
import { useEffect, useMemo, useRef, useState } from "@wordpress/element";
import { useSelect } from "@wordpress/data";
import { __ } from "@wordpress/i18n";
import { getMottoBaseLayoutClassName } from "../../styler/layout/base-layout";

const SafeToggleGroupControl = ToggleGroupControl || ExperimentalToggleGroupControl;
const SafeToggleGroupControlOption =
	ToggleGroupControlOption || ExperimentalToggleGroupControlOption;
const BASE_LAYOUT_CLASS = getMottoBaseLayoutClassName(metadata.mottoBaseLayout);

registerBlockType(metadata.name, {
	...metadata,
	icon: {
		src: <BlockIcon svg={blockIcon} />,
	},
	edit: ({ attributes, setAttributes }) => {
		const useLocation = attributes.useLocation === true;
		const menuSlug = typeof attributes.menuSlug === "string" ? attributes.menuSlug : "";
		const menuLocation =
			typeof attributes.menuLocation === "string" ? attributes.menuLocation : "";
		const orientation =
			typeof attributes.orientation === "string" ? attributes.orientation : "horizontal";
		const submenuPosition =
			attributes.submenuPosition === "accordion" ? "accordion" : "floating";
		const toggleEvent = attributes.toggleEvent === "click" ? "click" : "rollover";
		const blockProps = useBlockProps({ className: `motto-classic-menu ${BASE_LAYOUT_CLASS}` });
		const renderAttributes = useMemo(
			() => ({
				useLocation,
				menuSlug,
				menuLocation,
				orientation,
				submenuPosition,
				toggleEvent,
			}),
			[useLocation, menuSlug, menuLocation, orientation, submenuPosition, toggleEvent]
		);
		const [previewHtml, setPreviewHtml] = useState("");
		const [previewError, setPreviewError] = useState("");
		const [isLoadingPreview, setIsLoadingPreview] = useState(false);
		const previewRef = useRef(null);

		const menus = useSelect((select) => select("core").getMenus?.() || [], []);
		const locations = useSelect((select) => select("core").getMenuLocations?.() || [], []);

		const menuOptions = useMemo(
			() =>
				menus.map((menu) => ({
					label: menu.name,
					value: menu.slug,
				})),
			[menus]
		);

		const locationOptions = useMemo(() => {
			if (!Array.isArray(locations)) {
				return [];
			}

			return locations.map((location) => ({
				label: location.description || location.name,
				value: location.name,
			}));
		}, [locations]);

		useEffect(() => {
			if (useLocation) {
				if (!menuLocation && locationOptions.length > 0) {
					setAttributes({ menuLocation: locationOptions[0].value });
				}
				return;
			}

			if (!menuSlug && menuOptions.length > 0) {
				setAttributes({ menuSlug: menuOptions[0].value });
			}
		}, [menuLocation, menuSlug, menuOptions, locationOptions, setAttributes, useLocation]);

		useEffect(() => {
			let isCancelled = false;
			setIsLoadingPreview(true);
			setPreviewError("");

			const path = `/wp/v2/block-renderer/${metadata.name}?context=edit`;
			const payload = { attributes: renderAttributes };
			const apiFetch = window?.wp?.apiFetch;

			if (typeof apiFetch !== "function") {
				setPreviewError(__("Could not load menu preview.", "motto-blocks"));
				setIsLoadingPreview(false);
				console.error("[motto/classic-menu] wp.apiFetch is not available");
				return () => {
					isCancelled = true;
				};
			}

			apiFetch({
				path,
				method: "POST",
				data: payload,
			})
				.then((response) => {
					if (isCancelled) {
						return;
					}

					const rendered =
						typeof response?.rendered === "string" ? response.rendered : "";
					setPreviewHtml(rendered);
				})
				.catch((error) => {
					if (isCancelled) {
						return;
					}

					const errorMessage =
						typeof error?.message === "string" && error.message
							? error.message
							: __("Could not load menu preview.", "motto-blocks");
					setPreviewError(errorMessage);
					setPreviewHtml("");

					// Keep a concrete trace in browser console while debugging SSR payload issues.
					console.error("[motto/classic-menu] Preview render failed", {
						path,
						payload,
						error,
					});
				})
				.finally(() => {
					if (!isCancelled) {
						setIsLoadingPreview(false);
					}
				});

			return () => {
				isCancelled = true;
			};
		}, [renderAttributes]);

		useEffect(() => {
			if (previewError || !previewHtml || !previewRef.current) {
				return undefined;
			}

			const classicMenuApi = window?.mottoBlocksClassicMenu;

			if (!classicMenuApi || typeof classicMenuApi.initClassicMenus !== "function") {
				console.error(
					"[motto/classic-menu] Shared menu runtime is not available in the editor"
				);
				return undefined;
			}

			return classicMenuApi.initClassicMenus(previewRef.current);
		}, [previewError, previewHtml]);

		return (
			<>
				<InspectorControls>
					<PanelBody
						title={__("Classic Menu Settings", "motto-blocks")}
						className="motto-panel-body"
						initialOpen
					>
						<div className="motto-panel-section">
							<SafeToggleGroupControl
								label={__("Menu source", "motto-blocks")}
								value={useLocation ? "location" : "menu"}
								isBlock
								onChange={(value) => {
									if (!value) {
										return;
									}
									setAttributes({ useLocation: value === "location" });
								}}
							>
								<SafeToggleGroupControlOption
									value="location"
									label={__("Location", "motto-blocks")}
								/>
								<SafeToggleGroupControlOption
									value="menu"
									label={__("Menu", "motto-blocks")}
								/>
							</SafeToggleGroupControl>
							{useLocation ? (
								<SelectControl
									label={__("Menu location", "motto-blocks")}
									value={menuLocation}
									options={
										locationOptions.length > 0
											? locationOptions
											: [
													{
														label: __(
															"No menu locations available",
															"motto-blocks"
														),
														value: "",
													},
												]
									}
									onChange={(value) => setAttributes({ menuLocation: value })}
								/>
							) : (
								<SelectControl
									label={__("Menu", "motto-blocks")}
									value={menuSlug}
									options={
										menuOptions.length > 0
											? menuOptions
											: [
													{
														label: __(
															"No menus available",
															"motto-blocks"
														),
														value: "",
													},
												]
									}
									onChange={(value) => setAttributes({ menuSlug: value })}
								/>
							)}
						</div>
						<div className="motto-panel-section">
							<SafeToggleGroupControl
								label={__("Submenu wrapper behavior", "motto-blocks")}
								value={submenuPosition === "accordion" ? "accordion" : "floating"}
								isBlock
								onChange={(value) => {
									if (value !== "floating" && value !== "accordion") {
										return;
									}

									setAttributes({ submenuPosition: value });
								}}
							>
								<SafeToggleGroupControlOption
									value="floating"
									label={__("Floating", "motto-blocks")}
								/>
								<SafeToggleGroupControlOption
									value="accordion"
									label={__("Accordion", "motto-blocks")}
								/>
							</SafeToggleGroupControl>
						</div>
						<div className="motto-panel-section">
							<SafeToggleGroupControl
								label={__("Submenu open event", "motto-blocks")}
								value={toggleEvent === "click" ? "click" : "rollover"}
								isBlock
								onChange={(value) => {
									if (value !== "click" && value !== "rollover") {
										return;
									}

									setAttributes({ toggleEvent: value });
								}}
							>
								<SafeToggleGroupControlOption
									value="rollover"
									label={__("Rollover", "motto-blocks")}
								/>
								<SafeToggleGroupControlOption
									value="click"
									label={__("Click", "motto-blocks")}
								/>
							</SafeToggleGroupControl>
						</div>
					</PanelBody>
				</InspectorControls>
				<div {...blockProps}>
					{isLoadingPreview ? <Spinner /> : null}
					{previewError ? <p>{previewError}</p> : null}
					{!previewError ? (
						<div
							ref={previewRef}
							dangerouslySetInnerHTML={{
								__html: previewHtml,
							}}
						/>
					) : null}
				</div>
			</>
		);
	},
	save: () => null,
});
