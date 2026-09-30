import { useEffect, useRef } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { useEditorBlockDragLock } from "@components";
import { clamp, toMarkerIcon, getLucideIconUrl } from "./maps-utils";
import { loadGoogleMaps } from "./load-google-maps";

function sanitizeFetchedSvgMarkup(svgMarkup) {
	const normalizedSvgMarkup = typeof svgMarkup === "string" ? svgMarkup.trim() : "";
	if (!normalizedSvgMarkup.includes("<svg")) {
		return "";
	}

	if (/<\s*(script|iframe|object|embed|foreignObject)\b/i.test(normalizedSvgMarkup)) {
		return "";
	}
	if (/\son[a-z]+\s*=|(?:javascript|data)\s*:/i.test(normalizedSvgMarkup)) {
		return "";
	}

	return normalizedSvgMarkup;
}

export function useMapInstance({
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
}) {
	const mapRef = useRef(null);
	const markerRefs = useRef([]);
	const listenerRefs = useRef([]);
	const fetchingIconsRef = useRef(new Set());
	const liveStateRef = useRef({ centerLat, centerLng, zoom, pins });

	useEditorBlockDragLock(canvasRef);

	// Keep liveStateRef in sync for use inside event listeners.
	useEffect(() => {
		liveStateRef.current = { centerLat, centerLng, zoom, pins };
	}, [centerLat, centerLng, zoom, pins]);

	// Initialize map instance on mount.
	useEffect(() => {
		if (!apiKey || !canvasRef.current) {
			return undefined;
		}

		let isMounted = true;

		loadGoogleMaps(apiKey)
			.then((googleMaps) => {
				if (!isMounted || !canvasRef.current) {
					return;
				}

				if (!mapRef.current) {
					const map = new googleMaps.Map(canvasRef.current, {
						center: { lat: centerLat, lng: centerLng },
						zoom,
						mapTypeId: mapType,
						clickableIcons: false,
						renderingType: googleMaps.RenderingType?.RASTER || "RASTER",
						isFractionalZoomEnabled: false,
						scrollwheel: false,
						disableDoubleClickZoom: true,
						keyboardShortcuts: false,
						draggable: true,
						gestureHandling: "auto",
						zoomControl: controls.zoomControl,
						fullscreenControl: controls.fullscreenControl,
						streetViewControl: controls.streetViewControl,
						mapTypeControl: controls.mapTypeControl,
					});

					mapRef.current = map;

					listenerRefs.current.push(
						googleMaps.event.addListener(map, "idle", () => {
							const liveCenter = map.getCenter();
							if (!liveCenter) {
								return;
							}

							const nextLat = clamp(liveCenter.lat(), -90, 90);
							const nextLng = clamp(liveCenter.lng(), -180, 180);
							const nextZoom = clamp(
								map.getZoom() || liveStateRef.current.zoom,
								1,
								21
							);
							const currentState = liveStateRef.current;

							const updates = {};
							if (Math.abs(nextLat - currentState.centerLat) > 0.000001) {
								updates.centerLat = nextLat;
							}
							if (Math.abs(nextLng - currentState.centerLng) > 0.000001) {
								updates.centerLng = nextLng;
							}
							if (nextZoom !== currentState.zoom) {
								updates.zoom = nextZoom;
							}

							if (Object.keys(updates).length > 0) {
								applyAttributes(updates);
							}
						})
					);
				}

				setMapLoadError("");
			})
			.catch((error) => {
				if (!isMounted) {
					return;
				}
				setMapLoadError(
					error?.message || __("Failed loading Google Maps.", "motto-blocks")
				);
			});

		return () => {
			isMounted = false;
		};
	}, [
		apiKey,
		applyAttributes,
		canvasRef,
		centerLat,
		centerLng,
		controls.fullscreenControl,
		controls.mapTypeControl,
		controls.streetViewControl,
		controls.zoomControl,
		mapType,
		pins,
		setMapLoadError,
		zoom,
	]);

	// Sync map options when settings change after init.
	useEffect(() => {
		if (!mapRef.current || !window.google?.maps) {
			return;
		}

		mapRef.current.setOptions({
			mapTypeId: mapType,
			clickableIcons: false,
			scrollwheel: false,
			disableDoubleClickZoom: true,
			keyboardShortcuts: false,
			draggable: true,
			gestureHandling: "auto",
			zoomControl: controls.zoomControl,
			fullscreenControl: controls.fullscreenControl,
			streetViewControl: controls.streetViewControl,
			mapTypeControl: controls.mapTypeControl,
		});
		mapRef.current.setCenter({ lat: centerLat, lng: centerLng });
		mapRef.current.setZoom(zoom);
	}, [centerLat, centerLng, controls, mapType, zoom]);

	// Sync markers when pins change.
	useEffect(() => {
		if (!mapRef.current || !window.google?.maps) {
			return;
		}

		markerRefs.current.forEach((marker) => marker.setMap(null));
		markerRefs.current = [];

		pins.forEach((pin) => {
			const marker = new window.google.maps.Marker({
				map: mapRef.current,
				position: { lat: pin.lat, lng: pin.lng },
				title: pin.title || "",
				draggable: true,
				icon: toMarkerIcon(window.google.maps, pin) || undefined,
			});

			marker.addListener("dragend", (event) => {
				if (!event?.latLng) {
					return;
				}

				const nextPins = pins.map((entry) => {
					if (entry.id !== pin.id) {
						return entry;
					}
					return {
						...entry,
						lat: clamp(event.latLng.lat(), -90, 90),
						lng: clamp(event.latLng.lng(), -180, 180),
					};
				});

				applyAttributes({ pins: nextPins });
			});

			markerRefs.current.push(marker);
		});
	}, [applyAttributes, pins]);

	// Cleanup on unmount.
	useEffect(
		() => () => {
			markerRefs.current.forEach((marker) => marker.setMap(null));
			markerRefs.current = [];

			listenerRefs.current.forEach((listener) => {
				if (listener?.remove) {
					listener.remove();
				}
			});
			listenerRefs.current = [];
			mapRef.current = null;
		},
		[]
	);

	// Fetch and cache SVG markup for svg-library pins.
	useEffect(() => {
		const pinsNeedingFetch = pins.filter(
			(pin) => pin.iconType === "svg-library" && pin.iconValue && !pin.iconSvg
		);
		if (pinsNeedingFetch.length === 0) {
			return;
		}

		pinsNeedingFetch.forEach((pin) => {
			const key = `${pin.id}::${pin.iconValue}`;
			if (fetchingIconsRef.current.has(key)) {
				return;
			}
			fetchingIconsRef.current.add(key);

			const slug = pin.iconValue
				.trim()
				.toLowerCase()
				.replace(/[^a-z0-9-]/g, "");
			if (!slug) {
				fetchingIconsRef.current.delete(key);
				return;
			}

			fetch(getLucideIconUrl(slug))
				.then((res) => (res.ok ? res.text() : Promise.reject(new Error("fetch failed"))))
				.then((svgMarkup) => {
					fetchingIconsRef.current.delete(key);
					const sanitizedSvgMarkup = sanitizeFetchedSvgMarkup(svgMarkup);
					if (!sanitizedSvgMarkup) {
						return;
					}
					const currentPins = liveStateRef.current.pins;
					const nextPins = currentPins.map((p) =>
						p.id === pin.id && p.iconValue === pin.iconValue
							? { ...p, iconSvg: sanitizedSvgMarkup }
							: p
					);
					applyAttributes({ pins: nextPins });
				})
				.catch(() => {
					fetchingIconsRef.current.delete(key);
				});
		});
	}, [pins, applyAttributes]);

	return { mapRef };
}
