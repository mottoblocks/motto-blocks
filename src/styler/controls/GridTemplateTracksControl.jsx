import {
	ToggleControl,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { useEffect, useMemo, useState } from "@wordpress/element";
import { LayerTabs, MottoUnitControl } from "@components";
import { reorderArrayItem } from "../utils/array-utils";
import {
	REPEAT_MODE_AUTO_FILL,
	REPEAT_MODE_AUTO_FIT,
	REPEAT_MODE_FIXED,
	REPEAT_MODES,
	TRACK_MODE_AUTO,
	TRACK_MODE_CUSTOM,
	attachDisplayIds,
	buildGridTemplateTracks,
	createDefaultTrack,
	createGridTrackId,
	isRepeatCountValue,
	parseGridTemplateTracks,
} from "../utils/grid-template-tracks-utils.js";

// "fr" listed first so an empty track value (no unit yet) displays "fr" in the
// unit select instead of the browser's implicit fallback to the first option.
const SIZE_UNITS = [
	{ value: "fr", label: "fr" },
	{ value: "px", label: "px" },
	{ value: "em", label: "em" },
	{ value: "rem", label: "rem" },
	{ value: "%", label: "%" },
	{ value: "vw", label: "vw" },
	{ value: "vh", label: "vh" },
	{ value: "dvw", label: "dvw" },
	{ value: "dvh", label: "dvh" },
];
const COUNT_UNITS = [{ value: "", label: "" }];

const TrackValueField = ({ label, value, onChange, disabled = false }) => (
	<MottoUnitControl
		label={label}
		value={value || ""}
		units={SIZE_UNITS}
		disabled={disabled}
		onChange={(nextValue) => onChange(nextValue == null ? "" : String(nextValue))}
	/>
);

const TrackFields = ({ item, onPatch }) => {
	const isAuto = String(item?.trackMode || "") === TRACK_MODE_AUTO;
	return (
		<div className="motto-grid gap-lg">
			{item?.useMinmax ? (
				<div className="motto-grid cols-2 gap-sm">
					<TrackValueField
						label={__("Min", "motto-blocks")}
						value={item?.min || ""}
						onChange={(nextValue) => onPatch({ min: nextValue })}
						disabled={isAuto}
					/>
					<TrackValueField
						label={__("Max", "motto-blocks")}
						value={item?.max || ""}
						onChange={(nextValue) => onPatch({ max: nextValue })}
						disabled={isAuto}
					/>
				</div>
			) : (
				<TrackValueField
					label={__("Value", "motto-blocks")}
					value={isAuto ? "auto" : item?.value || ""}
					onChange={(nextValue) => onPatch({ value: nextValue })}
					disabled={isAuto}
				/>
			)}
			<div className="motto-flex align-center gap-md">
				<ToggleControl
					label={__("Use minmax", "motto-blocks")}
					checked={Boolean(item?.useMinmax)}
					onChange={(nextValue) => onPatch({ useMinmax: Boolean(nextValue) })}
				/>
				<ToggleControl
					label={__("Auto", "motto-blocks")}
					checked={isAuto}
					onChange={(nextValue) =>
						onPatch({
							trackMode: nextValue ? TRACK_MODE_AUTO : TRACK_MODE_CUSTOM,
						})
					}
				/>
			</div>
		</div>
	);
};

export const GridTemplateTracksControl = ({ value, onChange }) => {
	const parsedValue = useMemo(() => parseGridTemplateTracks(value), [value]);
	const [items, setItems] = useState(() => attachDisplayIds(parsedValue.items));
	const [activeIndex, setActiveIndex] = useState(0);

	// Confirm the visual default into the raw value as soon as the control opens on an
	// empty rule, so the visible "1fr" track and the stored CSS never disagree.
	useEffect(() => {
		if (String(value || "").trim()) return;
		onChange(buildGridTemplateTracks(items));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		setItems((previousItems) => attachDisplayIds(parsedValue.items, previousItems));
	}, [parsedValue]);

	useEffect(() => {
		if (activeIndex < items.length) return;
		setActiveIndex(Math.max(0, items.length - 1));
	}, [activeIndex, items.length]);

	const updateItems = (nextItems) => {
		const resolvedItems = attachDisplayIds(nextItems);
		setItems(resolvedItems);
		onChange(buildGridTemplateTracks(resolvedItems));
	};

	const updateItem = (id, patch) => {
		updateItems(items.map((item) => (item.id !== id ? item : { ...item, ...patch })));
	};

	const addTrack = () => {
		const next = [...items, createDefaultTrack(items.length + 1)];
		updateItems(next);
		setActiveIndex(next.length - 1);
	};

	const removeTrack = (index) => {
		const next = items.filter((_, currentIndex) => currentIndex !== index);
		updateItems(next.length > 0 ? next : [createDefaultTrack(1)]);
		if (activeIndex >= next.length) setActiveIndex(Math.max(0, next.length - 1));
	};

	const duplicateTrack = (index) => {
		const source = items[index];
		if (!source) return;
		const duplicate = { ...source, id: createGridTrackId(), displayId: null };
		const next = [...items];
		next.splice(index + 1, 0, duplicate);
		updateItems(next);
		setActiveIndex(index + 1);
	};

	const reorderTracks = (fromIndex, toIndex) => {
		if (!items[fromIndex] || !Number.isFinite(toIndex)) return;
		const next = reorderArrayItem(items, fromIndex, toIndex);
		updateItems(next);
		setActiveIndex(Math.max(0, Math.min(next.length - 1, toIndex)));
	};

	const activeItem = items[activeIndex] || items[0] || null;
	const resolvedActiveIndex = items[activeIndex] ? activeIndex : 0;

	return (
		<div className="motto-grid-template-tracks-control motto-grid gap-sm">
			<LayerTabs
				items={items}
				activeIndex={resolvedActiveIndex}
				onActiveChange={setActiveIndex}
				onAdd={addTrack}
				onDuplicate={duplicateTrack}
				onRemove={removeTrack}
				onReorder={reorderTracks}
				getItemLabel={(item, index) =>
					String(item?.type || "") === "repeat"
						? `${__("Repeat", "motto-blocks")} ${index + 1}`
						: `${__("Track", "motto-blocks")} ${index + 1}`
				}
				ariaLabel={__("Grid tracks", "motto-blocks")}
				addAriaLabel={__("Add track", "motto-blocks")}
				duplicateAriaLabel={__("Duplicate track", "motto-blocks")}
				removeAriaLabel={__("Remove track", "motto-blocks")}
				tabBehavior={{ allowNoTabs: false, draggable: true }}
			/>
			{activeItem ? (
				<div className="motto-grid gap-lg motto-grid-template-tracks-control__panel">
					{String(activeItem?.type || "") === "repeat" ? (
						<div className="motto-grid gap-lg motto-grid-template-tracks-control__content">
							<div className="motto-grid gap-lg motto-grid-template-tracks-control__track-group">
								<TrackFields
									item={activeItem}
									onPatch={(patch) => updateItem(activeItem.id, patch)}
								/>
							</div>
							<div className="motto-grid gap-lg motto-grid-template-tracks-control__repeat-group">
								<div className="motto-flex align-center gap-lg">
									<ToggleControl
										label={__("Repeat", "motto-blocks")}
										checked
										onChange={(nextValue) => {
											if (nextValue) return;
											updateItem(activeItem.id, {
												type: "track",
												repeatMode: REPEAT_MODE_FIXED,
												count: "2",
											});
										}}
									/>
									{String(activeItem?.repeatMode || REPEAT_MODE_FIXED) ===
									REPEAT_MODE_FIXED ? (
										<MottoUnitControl
											value={activeItem?.count || ""}
											units={COUNT_UNITS}
											onChange={(nextValue) =>
												updateItem(activeItem.id, {
													count:
														nextValue == null ? "" : String(nextValue),
												})
											}
										/>
									) : null}
								</div>
								<ToggleGroupControl
									className="motto-toggle-group-compact"
									label={__("Repeat type", "motto-blocks")}
									value={String(activeItem?.repeatMode || REPEAT_MODE_FIXED)}
									isBlock
									onChange={(nextValue) => {
										const repeatMode = REPEAT_MODES.has(
											String(nextValue || "")
												.trim()
												.toLowerCase()
										)
											? String(nextValue).trim().toLowerCase()
											: REPEAT_MODE_FIXED;
										updateItem(activeItem.id, {
											repeatMode,
											count:
												repeatMode === REPEAT_MODE_FIXED
													? isRepeatCountValue(activeItem?.count)
														? activeItem.count
														: "2"
													: "",
										});
									}}
								>
									<ToggleGroupControlOption
										value={REPEAT_MODE_FIXED}
										label={__("Count", "motto-blocks")}
									/>
									<ToggleGroupControlOption
										value={REPEAT_MODE_AUTO_FIT}
										label={__("Fit", "motto-blocks")}
									/>
									<ToggleGroupControlOption
										value={REPEAT_MODE_AUTO_FILL}
										label={__("Fill", "motto-blocks")}
									/>
								</ToggleGroupControl>
							</div>
						</div>
					) : (
						<div className="motto-grid gap-lg motto-grid-template-tracks-control__content">
							<div className="motto-grid gap-lg motto-grid-template-tracks-control__track-group">
								<TrackFields
									item={activeItem}
									onPatch={(patch) => updateItem(activeItem.id, patch)}
								/>
							</div>
							<div className="motto-grid gap-lg motto-grid-template-tracks-control__repeat-group">
								<ToggleControl
									label={__("Repeat", "motto-blocks")}
									checked={false}
									onChange={(nextValue) => {
										if (!nextValue) return;
										updateItem(activeItem.id, {
											type: "repeat",
											repeatMode: REPEAT_MODE_FIXED,
											count: isRepeatCountValue(activeItem?.count)
												? activeItem.count
												: "2",
										});
									}}
								/>
							</div>
						</div>
					)}
				</div>
			) : null}
		</div>
	);
};
