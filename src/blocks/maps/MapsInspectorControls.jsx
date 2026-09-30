import { InspectorControls } from "@wordpress/block-editor";
import {
	PanelBody,
	RangeControl,
	SelectControl,
	TextareaControl,
	TextControl,
	ToggleControl,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { LayerTabs } from "@components";
import { MAP_TYPE_OPTIONS } from "./maps-constants";
import { clamp, toFiniteNumber } from "./maps-utils";
import { MapPinIconControl } from "./MapPinIconControl";

export function MapsInspectorControls({
	height,
	zoom,
	mapType,
	centerLat,
	centerLng,
	controls,
	pins,
	selectedPin,
	selectedPinId,
	applyAttributes,
	handleAddPin,
	removePin,
	selectPin,
}) {
	return (
		<InspectorControls>
			<PanelBody
				title={__("Map Settings", "motto-blocks")}
				className="motto-panel-body"
				initialOpen
			>
				<div className="motto-panel-section">
					<RangeControl
						label={__("Height (px)", "motto-blocks")}
						value={height}
						min={120}
						max={1400}
						className="motto-range"
						onChange={(value) => {
							if (!Number.isFinite(value)) {
								return;
							}
							applyAttributes({ height: clamp(value, 120, 1400) });
						}}
					/>
					<RangeControl
						label={__("Zoom", "motto-blocks")}
						value={zoom}
						min={1}
						max={21}
						className="motto-range"
						onChange={(value) => {
							if (!Number.isFinite(value)) {
								return;
							}
							applyAttributes({ zoom: clamp(Math.round(value), 1, 21) });
						}}
					/>
					<SelectControl
						label={__("Map Type", "motto-blocks")}
						value={mapType}
						options={MAP_TYPE_OPTIONS}
						className="motto-select"
						onChange={(value) => applyAttributes({ mapType: value })}
					/>
				</div>
				<div className="motto-panel-section">
					<TextControl
						label={__("Center Latitude", "motto-blocks")}
						value={String(centerLat)}
						type="number"
						className="motto-input"
						onChange={(value) => {
							const numeric = clamp(toFiniteNumber(value, centerLat), -90, 90);
							applyAttributes({ centerLat: numeric });
						}}
					/>
					<TextControl
						label={__("Center Longitude", "motto-blocks")}
						value={String(centerLng)}
						type="number"
						className="motto-input"
						onChange={(value) => {
							const numeric = clamp(toFiniteNumber(value, centerLng), -180, 180);
							applyAttributes({ centerLng: numeric });
						}}
					/>
				</div>
				<div className="motto-panel-section">
					<ToggleControl
						label={__("Zoom Control", "motto-blocks")}
						checked={controls.zoomControl}
						onChange={(value) =>
							applyAttributes({ controls: { ...controls, zoomControl: value } })
						}
					/>
					<ToggleControl
						label={__("Fullscreen Control", "motto-blocks")}
						checked={controls.fullscreenControl}
						onChange={(value) =>
							applyAttributes({ controls: { ...controls, fullscreenControl: value } })
						}
					/>
					<ToggleControl
						label={__("Street View Control", "motto-blocks")}
						checked={controls.streetViewControl}
						onChange={(value) =>
							applyAttributes({ controls: { ...controls, streetViewControl: value } })
						}
					/>
					<ToggleControl
						label={__("Map Type Control", "motto-blocks")}
						checked={controls.mapTypeControl}
						onChange={(value) =>
							applyAttributes({ controls: { ...controls, mapTypeControl: value } })
						}
					/>
				</div>
			</PanelBody>

			<PanelBody
				title={__("Pins", "motto-blocks")}
				className="motto-panel-body"
				initialOpen={false}
			>
				<div className="motto-panel-section">
					{pins.length === 0 && (
						<p className="motto-section-help">{__("No pins yet.", "motto-blocks")}</p>
					)}
					<LayerTabs
						items={pins}
						activeIndex={Math.max(
							0,
							pins.findIndex((pin) => pin.id === selectedPinId)
						)}
						onActiveChange={(index) => selectPin(pins[index])}
						onAdd={handleAddPin}
						onRemove={(index) => removePin(pins[index].id)}
						getItemLabel={(pin, index) =>
							pin.title || `${__("Pin", "motto-blocks")} ${index + 1}`
						}
						ariaLabel={__("Pins", "motto-blocks")}
						addAriaLabel={__("Add pin at center", "motto-blocks")}
						removeAriaLabel={__("Remove pin", "motto-blocks")}
						tabBehavior={{
							allowNoTabs: true,
							draggable: false,
							duplicable: false,
							addLabel: __("Add Pin at Center", "motto-blocks"),
						}}
					/>
				</div>

				{selectedPin && (
					<div className="motto-panel-section">
						<TextControl
							label={__("Title", "motto-blocks")}
							value={selectedPin.title}
							className="motto-input"
							onChange={(value) => {
								applyAttributes({
									pins: pins.map((pin) =>
										pin.id === selectedPin.id ? { ...pin, title: value } : pin
									),
								});
							}}
						/>
						<TextareaControl
							label={__("Description", "motto-blocks")}
							value={selectedPin.description}
							className="motto-input"
							onChange={(value) => {
								applyAttributes({
									pins: pins.map((pin) =>
										pin.id === selectedPin.id
											? { ...pin, description: value }
											: pin
									),
								});
							}}
						/>
						<TextControl
							label={__("Link URL", "motto-blocks")}
							value={selectedPin.url}
							className="motto-input"
							onChange={(value) => {
								applyAttributes({
									pins: pins.map((pin) =>
										pin.id === selectedPin.id ? { ...pin, url: value } : pin
									),
								});
							}}
						/>
						<TextControl
							label={__("Latitude", "motto-blocks")}
							type="number"
							value={String(selectedPin.lat)}
							className="motto-input"
							onChange={(value) => {
								const nextValue = clamp(
									toFiniteNumber(value, selectedPin.lat),
									-90,
									90
								);
								applyAttributes({
									pins: pins.map((pin) =>
										pin.id === selectedPin.id ? { ...pin, lat: nextValue } : pin
									),
								});
							}}
						/>
						<TextControl
							label={__("Longitude", "motto-blocks")}
							type="number"
							value={String(selectedPin.lng)}
							className="motto-input"
							onChange={(value) => {
								const nextValue = clamp(
									toFiniteNumber(value, selectedPin.lng),
									-180,
									180
								);
								applyAttributes({
									pins: pins.map((pin) =>
										pin.id === selectedPin.id ? { ...pin, lng: nextValue } : pin
									),
								});
							}}
						/>

						<MapPinIconControl
							pin={selectedPin}
							onChange={(partial) => {
								applyAttributes({
									pins: pins.map((pin) =>
										pin.id === selectedPin.id ? { ...pin, ...partial } : pin
									),
								});
							}}
						/>
					</div>
				)}
			</PanelBody>
		</InspectorControls>
	);
}
