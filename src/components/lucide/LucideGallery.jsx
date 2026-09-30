import { BaseControl, Button, TextControl } from "@wordpress/components";
import { useEffect, useMemo, useRef, useState } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { createLucideOptions, normalizeLucideIconName, LucideIcon } from "./lucide-utils.js";

const LUCIDE_OVERSCAN_ROWS = 4;
const LUCIDE_DEFAULT_VIEWPORT_HEIGHT = 220;
const LUCIDE_DEFAULT_COLUMNS = 6;

export function LucideGallery({ iconRegistry, value, onChange, icons, columns, maxHeight }) {
	const [query, setQuery] = useState("");
	const [scrollTop, setScrollTop] = useState(0);
	const [viewportHeight, setViewportHeight] = useState(LUCIDE_DEFAULT_VIEWPORT_HEIGHT);
	const [resolvedColumns, setResolvedColumns] = useState(LUCIDE_DEFAULT_COLUMNS);
	const [rowHeight, setRowHeight] = useState(33);
	const gridRef = useRef(null);
	const lastAutoScrollKeyRef = useRef("");
	const normalizedQuery = query.trim().toLowerCase();

	const allOptions = useMemo(() => createLucideOptions(iconRegistry), [iconRegistry]);

	const baseIcons = useMemo(() => {
		if (!Array.isArray(icons) || icons.length === 0) {
			return allOptions;
		}

		const iconsByName = new Map(allOptions.map((icon) => [icon.name, icon]));
		const orderedNames = icons.map(normalizeLucideIconName).filter(Boolean);
		const uniqueOrderedNames = Array.from(new Set(orderedNames));

		return uniqueOrderedNames.map((name) => iconsByName.get(name)).filter(Boolean);
	}, [allOptions, icons]);

	const filteredIcons = useMemo(() => {
		if (!normalizedQuery) {
			return baseIcons;
		}

		return baseIcons.filter((icon) => icon.name.includes(normalizedQuery));
	}, [baseIcons, normalizedQuery]);

	const iconRows = useMemo(() => {
		const rows = [];
		for (let index = 0; index < filteredIcons.length; index += resolvedColumns) {
			rows.push(filteredIcons.slice(index, index + resolvedColumns));
		}
		return rows;
	}, [filteredIcons, resolvedColumns]);

	useEffect(() => {
		const measure = () => {
			if (!gridRef.current) {
				return;
			}

			setViewportHeight(gridRef.current.clientHeight || LUCIDE_DEFAULT_VIEWPORT_HEIGHT);
			const firstRow = gridRef.current.querySelector(".motto-lucide-gallery__row");
			if (!firstRow) {
				return;
			}

			const cssColumns = Number.parseInt(
				window.getComputedStyle(firstRow).getPropertyValue("--columns"),
				10
			);
			if (Number.isFinite(cssColumns) && cssColumns > 0) {
				setResolvedColumns((previousColumns) => {
					if (previousColumns === cssColumns) {
						return previousColumns;
					}
					// Re-measure after row regrouping when effective column count changes.
					window.requestAnimationFrame(measure);
					return cssColumns;
				});
			}

			const rowStyles = window.getComputedStyle(firstRow);
			const marginBottom = Number.parseFloat(rowStyles.marginBottom || "0") || 0;
			const measuredHeight = Math.max(
				1,
				Math.round(firstRow.getBoundingClientRect().height + marginBottom)
			);
			setRowHeight((previousHeight) =>
				previousHeight === measuredHeight ? previousHeight : measuredHeight
			);
		};

		measure();
		const frameId = window.requestAnimationFrame(measure);
		window.addEventListener("resize", measure);
		return () => {
			window.cancelAnimationFrame(frameId);
			window.removeEventListener("resize", measure);
		};
	}, [filteredIcons.length, columns, maxHeight]);

	useEffect(() => {
		if (!gridRef.current || !value) {
			lastAutoScrollKeyRef.current = "";
			return;
		}

		const selectedIndex = filteredIcons.findIndex((icon) => icon.name === value);
		if (selectedIndex < 0) {
			lastAutoScrollKeyRef.current = "";
			return;
		}

		const selectedRow = Math.floor(selectedIndex / resolvedColumns);
		const rowTop = selectedRow * rowHeight;
		const rowBottom = rowTop + rowHeight;
		const currentScrollTop = gridRef.current.scrollTop;
		const currentScrollBottom = currentScrollTop + viewportHeight;

		if (rowTop >= currentScrollTop && rowBottom <= currentScrollBottom) {
			lastAutoScrollKeyRef.current = `${value}|${normalizedQuery}|${selectedIndex}|visible`;
			return;
		}

		const autoScrollKey = `${value}|${normalizedQuery}|${selectedIndex}|${resolvedColumns}|${viewportHeight}|${rowHeight}`;
		if (lastAutoScrollKeyRef.current === autoScrollKey) {
			return;
		}

		const maxScrollTop = Math.max(0, iconRows.length * rowHeight - viewportHeight);
		const targetScrollTop =
			rowTop < currentScrollTop ? rowTop : Math.max(0, rowBottom - viewportHeight);
		const clampedScrollTop = Math.max(0, Math.min(maxScrollTop, targetScrollTop));

		if (Math.abs(currentScrollTop - clampedScrollTop) > 1) {
			lastAutoScrollKeyRef.current = autoScrollKey;
			gridRef.current.scrollTop = clampedScrollTop;
			setScrollTop(clampedScrollTop);
		}
	}, [
		filteredIcons,
		iconRows.length,
		normalizedQuery,
		resolvedColumns,
		rowHeight,
		value,
		viewportHeight,
	]);

	const visibleRowCount = Math.max(1, Math.ceil(viewportHeight / rowHeight));
	const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - LUCIDE_OVERSCAN_ROWS);
	const endRow = Math.min(iconRows.length, startRow + visibleRowCount + LUCIDE_OVERSCAN_ROWS * 2);
	const topSpacer = startRow * rowHeight;
	const bottomSpacer = Math.max(0, (iconRows.length - endRow) * rowHeight);
	const hasFilteredIcons = filteredIcons.length > 0;

	const wrapperStyle = {
		...(columns ? { "--motto-lucide-row-columns": String(columns) } : null),
		...(maxHeight !== undefined && maxHeight !== null
			? {
					"--motto-lucide-grid-max-height":
						typeof maxHeight === "number" ? `${maxHeight}px` : String(maxHeight),
				}
			: null),
	};

	return (
		<BaseControl label={__("Lucide Icon", "motto-blocks")}>
			<div className="motto-lucide-gallery" style={wrapperStyle}>
				<TextControl
					aria-label={__("Search Lucide icons", "motto-blocks")}
					value={query}
					onChange={setQuery}
					placeholder={__("Search by name...", "motto-blocks")}
					className="motto-input motto-lucide-gallery__search"
				/>
				<div
					ref={gridRef}
					className="motto-lucide-gallery__grid"
					onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
				>
					{hasFilteredIcons ? (
						<>
							{topSpacer > 0 && <div style={{ height: `${topSpacer}px` }} />}
							{iconRows.slice(startRow, endRow).map((row, rowIndex) => (
								<div
									key={`row-${startRow + rowIndex}`}
									className="motto-lucide-gallery__row"
								>
									{row.map((icon) => (
										<Button
											key={icon.name}
											isPressed={value === icon.name}
											onClick={() => onChange(icon.name)}
											className="motto-ui-button is-icon-only motto-lucide-gallery__button"
											aria-label={icon.name}
											title={icon.name}
											label={icon.name}
											showTooltip
										>
											<LucideIcon
												iconRegistry={iconRegistry}
												iconName={icon.name}
												aria-hidden="true"
											/>
										</Button>
									))}
								</div>
							))}
							{bottomSpacer > 0 && <div style={{ height: `${bottomSpacer}px` }} />}
						</>
					) : (
						<div className="motto-lucide-gallery__empty" role="status">
							{__("No icons match your search.", "motto-blocks")}
						</div>
					)}
				</div>
			</div>
		</BaseControl>
	);
}
