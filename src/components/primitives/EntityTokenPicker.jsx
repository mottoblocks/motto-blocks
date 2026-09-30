import clsx from "clsx";
import { Button, Spinner } from "@wordpress/components";
import { useEffect, useMemo, useRef, useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { GripVertical, X } from "lucide-react";
import {
	DynamicOptionsList,
	DynamicOptionsTrigger,
} from "@components/controls/dynamic-options/DynamicOptionsControl.jsx";
import { PlainTextField } from "@components/primitives/PlainTextField.jsx";
import { useDragReorder } from "@components/hooks/use-drag-reorder.js";

const normalizeId = (value) => String(value ?? "").trim();

export const EntityTokenPicker = ({
	label = "",
	value = [],
	options = [],
	dynamicOptions = [],
	onChange,
	placeholder = __("Select items", "motto-blocks"),
	searchPlaceholder = __("Search…", "motto-blocks"),
	noResultsLabel = __("No matching items found.", "motto-blocks"),
	emptyLabel = __("No items selected.", "motto-blocks"),
	showEmptyLabel = false,
	enableRecommendationsSearch = true,
	isLoading = false,
	disabled = false,
}) => {
	const rootRef = useRef(null);
	const [isOpen, setIsOpen] = useState(false);
	const [showDynamicOptions, setShowDynamicOptions] = useState(false);
	const [searchValue, setSearchValue] = useState("");
	const selectedIds = useMemo(() => (Array.isArray(value) ? value : []), [value]);

	const optionsById = useMemo(() => {
		const map = new Map();
		[
			...(Array.isArray(options) ? options : []),
			...(Array.isArray(dynamicOptions) ? dynamicOptions : []),
		].forEach((entry) => {
			const key = normalizeId(entry?.id);
			if (!key) return;
			if (!map.has(key)) {
				map.set(key, entry);
			}
		});
		return map;
	}, [dynamicOptions, options]);

	const selectedEntries = useMemo(() => {
		return selectedIds.map((id) => {
			const key = normalizeId(id);
			const option = optionsById.get(key);
			return {
				id,
				key,
				label: String(option?.label || option?.name || option?.title || `#${key}`),
				description: String(option?.description || ""),
			};
		});
	}, [optionsById, selectedIds]);

	const selectedKeySet = useMemo(() => {
		return new Set(selectedEntries.map((entry) => entry.key).filter(Boolean));
	}, [selectedEntries]);

	const filteredCandidates = useMemo(() => {
		const query = String(searchValue || "")
			.trim()
			.toLowerCase();
		return (Array.isArray(options) ? options : [])
			.filter((entry) => {
				const key = normalizeId(entry?.id);
				return key && !selectedKeySet.has(key);
			})
			.filter((entry) => {
				if (!query) return true;
				const haystack = [
					String(entry?.label || ""),
					String(entry?.name || ""),
					String(entry?.title || ""),
					String(entry?.description || ""),
				]
					.join(" ")
					.toLowerCase();
				return haystack.includes(query);
			})
			.slice(0, 40);
	}, [options, searchValue, selectedKeySet]);

	const filteredDynamicCandidates = useMemo(() => {
		return (Array.isArray(dynamicOptions) ? dynamicOptions : [])
			.filter((entry) => {
				const key = normalizeId(entry?.id);
				return key && !selectedKeySet.has(key);
			})
			.slice(0, 40);
	}, [dynamicOptions, selectedKeySet]);

	const hasDynamicOptions = filteredDynamicCandidates.length > 0;

	useEffect(() => {
		const onDocMouseDown = (event) => {
			if (!rootRef.current?.contains(event.target)) {
				setIsOpen(false);
				setShowDynamicOptions(false);
				setSearchValue("");
			}
		};
		document.addEventListener("mousedown", onDocMouseDown);
		return () => document.removeEventListener("mousedown", onDocMouseDown);
	}, []);

	const commit = (next) => {
		if (typeof onChange === "function") {
			onChange(Array.isArray(next) ? next : []);
		}
	};

	const addById = (id) => {
		if (disabled) return;
		const incomingKey = normalizeId(id);
		if (!incomingKey) return;
		const hasId = selectedIds.some((entry) => normalizeId(entry) === incomingKey);
		if (hasId) return;
		commit([...selectedIds, id]);
		setSearchValue("");
		setShowDynamicOptions(false);
		setIsOpen(false);
	};

	const removeByKey = (key) => {
		if (disabled) return;
		commit(selectedIds.filter((entry) => normalizeId(entry) !== key));
	};

	const moveByIndex = (fromIndex, toIndex) => {
		if (disabled) return;
		if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
		if (fromIndex >= selectedIds.length || toIndex >= selectedIds.length) return;
		const current = [...selectedIds];
		const [moved] = current.splice(fromIndex, 1);
		current.splice(toIndex, 0, moved);
		commit(current);
	};

	const isDraggable = !disabled && selectedEntries.length > 1;

	const { getDragItemProps } = useDragReorder({
		getKey: (entry) => entry.key,
		onReorder: (fromKey, toKey) => {
			const fromIndex = selectedEntries.findIndex((entry) => entry.key === fromKey);
			const toIndex = selectedEntries.findIndex((entry) => entry.key === toKey);
			moveByIndex(fromIndex, toIndex);
		},
		disabled: !isDraggable,
	});

	return (
		<div className="motto-grid gap-sm motto-entity-token-picker" ref={rootRef}>
			{label ? <span className="motto-label">{label}</span> : null}

			{selectedEntries.length > 0 || (showEmptyLabel && emptyLabel) ? (
				<div className="motto-entity-token-picker__chips" role="list">
					{selectedEntries.length === 0 ? (
						<p className="motto-section-help">{emptyLabel}</p>
					) : (
						selectedEntries.map((entry, index) => {
							const { isDragging, isDropTarget, rowProps, handleProps } =
								getDragItemProps(entry, index);
							return (
								<div
									className={clsx("motto-entity-token-picker__chip", {
										"is-dragging": isDragging,
										"is-drop-target": isDropTarget,
									})}
									key={entry.key || String(index)}
									role="listitem"
									{...rowProps}
									{...handleProps}
								>
									<span
										className="motto-entity-token-picker__chip-drag"
										aria-hidden="true"
									>
										<GripVertical size={14} />
									</span>
									<span className="motto-entity-token-picker__chip-label">
										{entry.label}
										{entry.description ? (
											<span className="motto-entity-token-picker__chip-description">
												{" "}
												{entry.description}
											</span>
										) : null}
									</span>
									<Button
										variant="tertiary"
										className="motto-ui-button is-icon-only"
										aria-label={__("Remove item", "motto-blocks")}
										title={__("Remove item", "motto-blocks")}
										onClick={() => removeByKey(entry.key)}
										disabled={disabled}
									>
										<X size={14} />
									</Button>
								</div>
							);
						})
					)}
				</div>
			) : null}

			<div className="motto-entity-token-picker__search">
				<PlainTextField
					className="motto-input motto-entity-token-picker__trigger"
					value=""
					readOnly
					onFocus={() => setIsOpen(true)}
					onClick={() => setIsOpen(true)}
					placeholder={selectedEntries.length > 0 ? searchPlaceholder : placeholder}
					disabled={disabled}
				/>
				{isLoading ? (
					<div className="motto-entity-token-picker__loading">
						<Spinner />
					</div>
				) : null}
			</div>

			{isOpen && !disabled ? (
				<div className="motto-entity-token-picker__menu" role="listbox">
					{enableRecommendationsSearch ? (
						<div className="motto-entity-token-picker__menu-search">
							<PlainTextField
								className="motto-input"
								value={searchValue}
								onChange={(next) => {
									setSearchValue(next);
									setShowDynamicOptions(false);
								}}
								onKeyDown={(event) => {
									if (event.key === "Escape") {
										setIsOpen(false);
										setShowDynamicOptions(false);
										setSearchValue("");
										return;
									}
									const firstCandidate = showDynamicOptions
										? filteredDynamicCandidates[0]
										: filteredCandidates[0];
									if (event.key === "Enter" && firstCandidate) {
										event.preventDefault();
										addById(firstCandidate.id);
									}
								}}
								placeholder={searchPlaceholder}
								autoFocus
							/>
							{Array.isArray(dynamicOptions) && dynamicOptions.length > 0 ? (
								<DynamicOptionsTrigger
									isOpen={showDynamicOptions}
									onClick={() => {
										setSearchValue("");
										setShowDynamicOptions((current) => !current);
									}}
								/>
							) : null}
						</div>
					) : null}
					{showDynamicOptions ? (
						<DynamicOptionsList
							options={hasDynamicOptions ? filteredDynamicCandidates : []}
							onSelect={(entry) => addById(entry.id)}
						/>
					) : filteredCandidates.length === 0 ? (
						<p className="motto-section-help">{noResultsLabel}</p>
					) : (
						filteredCandidates.map((entry) => (
							<button
								key={normalizeId(entry?.id)}
								type="button"
								className="motto-entity-token-picker__option"
								onClick={() => addById(entry.id)}
							>
								<span className="motto-entity-token-picker__option-label">
									{String(
										entry?.label || entry?.name || entry?.title || entry?.id
									)}
								</span>
								{entry?.description ? (
									<span className="motto-entity-token-picker__option-description">
										{String(entry.description)}
									</span>
								) : null}
							</button>
						))
					)}
				</div>
			) : null}
		</div>
	);
};
