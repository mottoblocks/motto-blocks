import metadata from "./block.json";
import { BlockIcon } from "@components/primitives/BlockIcon";
import blockIcon from "@block-icons/maps.svg?raw";
import { registerBlockType } from "@wordpress/blocks";
import { useBlockProps } from "@wordpress/block-editor";
import { Notice } from "@wordpress/components";
import { useDispatch } from "@wordpress/data";
import { useCallback, useEffect, useMemo, useRef, useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { DEFAULT_CENTER, MAP_TYPE_OPTIONS } from "./maps-constants";
import {
	clamp,
	toFiniteNumber,
	normalizeControls,
	normalizePin,
	normalizePins,
	generatePinId,
} from "./maps-utils";
import { useMapInstance } from "./use-map-instance";
import { MapsInspectorControls } from "./MapsInspectorControls";
import { MapPreviewNotice } from "./MapPreviewNotice";
import { getMottoBaseLayoutClassName } from "../../styler/layout/base-layout";

const BASE_LAYOUT_CLASS = getMottoBaseLayoutClassName(metadata.mottoBaseLayout);

registerBlockType(metadata.name, {
	...metadata,
	icon: {
		src: <BlockIcon svg={blockIcon} />,
	},
	edit: ({ attributes, setAttributes, clientId }) => {
		const { updateBlockAttributes } = useDispatch("core/block-editor");
		const apiSettings =
			typeof window !== "undefined" &&
			window.__MOTTO_BLOCKS_API_SETTINGS__ &&
			typeof window.__MOTTO_BLOCKS_API_SETTINGS__ === "object"
				? window.__MOTTO_BLOCKS_API_SETTINGS__
				: {};

		const apiKey =
			typeof apiSettings.googleMapsApiKey === "string"
				? apiSettings.googleMapsApiKey.trim()
				: "";
		const settingsUrl =
			typeof apiSettings.settingsApiUrl === "string" && apiSettings.settingsApiUrl
				? apiSettings.settingsApiUrl
				: "/wp-admin/admin.php?page=motto-blocks-settings&tab=api";

		const canvasRef = useRef(null);
		const [mapLoadError, setMapLoadError] = useState("");
		const [selectedPinId, setSelectedPinId] = useState("");

		const applyAttributes = useCallback(
			(partial) => {
				setAttributes(partial);
				if (clientId && typeof updateBlockAttributes === "function") {
					updateBlockAttributes(clientId, partial);
				}
			},
			[clientId, setAttributes, updateBlockAttributes]
		);

		const height = clamp(toFiniteNumber(attributes.height, 420), 120, 1400);
		const centerLat = clamp(toFiniteNumber(attributes.centerLat, DEFAULT_CENTER.lat), -90, 90);
		const centerLng = clamp(
			toFiniteNumber(attributes.centerLng, DEFAULT_CENTER.lng),
			-180,
			180
		);
		const zoom = clamp(Math.round(toFiniteNumber(attributes.zoom, 12)), 1, 21);
		const rawPins = useMemo(
			() => (Array.isArray(attributes.pins) ? attributes.pins : []),
			[attributes.pins]
		);
		const mapType = MAP_TYPE_OPTIONS.some((option) => option.value === attributes.mapType)
			? attributes.mapType
			: "roadmap";
		const controls = useMemo(
			() => normalizeControls(attributes.controls),
			[attributes.controls]
		);
		const pins = useMemo(
			() => normalizePins(rawPins, { lat: centerLat, lng: centerLng }),
			[rawPins, centerLat, centerLng]
		);

		// Auto-select first pin, clean up stale selection.
		const firstPinId = pins[0]?.id || "";
		useEffect(() => {
			if (!selectedPinId && firstPinId) {
				setSelectedPinId(firstPinId);
			} else if (selectedPinId && !pins.some((pin) => pin.id === selectedPinId)) {
				setSelectedPinId(firstPinId);
			}
		}, [pins, selectedPinId, firstPinId]);

		const { mapRef } = useMapInstance({
			canvasRef,
			apiKey,
			centerLat,
			centerLng,
			zoom,
			mapType,
			controls,
			pins,
			applyAttributes,
			setMapLoadError,
		});

		const removePin = useCallback(
			(pinId) => {
				const nextPins = pins.filter((pin) => pin.id !== pinId);
				applyAttributes({ pins: nextPins });
				setSelectedPinId((current) =>
					current !== pinId ? current : nextPins[0]?.id || ""
				);
			},
			[applyAttributes, pins]
		);

		const selectPin = useCallback(
			(pin) => {
				setSelectedPinId(pin.id);
				if (mapRef.current) {
					mapRef.current.panTo({ lat: pin.lat, lng: pin.lng });
				}
			},
			[mapRef]
		);

		const handleAddPin = useCallback(() => {
			const nextPin = normalizePin(
				{
					id: generatePinId(),
					lat: centerLat,
					lng: centerLng,
					title: "",
					description: "",
					url: "",
					iconType: "none",
					iconValue: "",
				},
				{ lat: centerLat, lng: centerLng }
			);

			const sourcePins = Array.isArray(attributes.pins) ? attributes.pins : [];
			applyAttributes({ pins: [...sourcePins, nextPin] });
			setSelectedPinId(nextPin.id);
		}, [applyAttributes, attributes.pins, centerLat, centerLng]);

		const selectedPin = pins.find((pin) => pin.id === selectedPinId) || pins[0] || null;
		const blockProps = useBlockProps({ className: `motto-maps ${BASE_LAYOUT_CLASS}` });

		return (
			<>
				<MapsInspectorControls
					height={height}
					zoom={zoom}
					mapType={mapType}
					centerLat={centerLat}
					centerLng={centerLng}
					controls={controls}
					pins={pins}
					rawPins={rawPins}
					selectedPin={selectedPin}
					selectedPinId={selectedPinId}
					applyAttributes={applyAttributes}
					handleAddPin={handleAddPin}
					removePin={removePin}
					selectPin={selectPin}
				/>
				<div {...blockProps}>
					{!apiKey ? (
						<MapPreviewNotice settingsUrl={settingsUrl} />
					) : (
						<div className="motto-maps__preview-shell">
							<div
								ref={canvasRef}
								className="motto-maps__canvas"
								style={{ height: `${height}px` }}
							/>
						</div>
					)}

					{Boolean(mapLoadError) && (
						<Notice status="error" isDismissible={false}>
							<p>{mapLoadError}</p>
						</Notice>
					)}
				</div>
			</>
		);
	},
	save: () => null,
});
