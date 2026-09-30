import apiFetch from "@wordpress/api-fetch";
import { Button, Popover, TabPanel } from "@wordpress/components";
import { useState, useRef, useMemo, useEffect } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { BookOpenText } from "lucide-react";

const getCats = (w) => {
	if (Array.isArray(w.category) && w.category.length > 0) return w.category;
	if (typeof w.category === "string" && w.category.trim()) return [w.category.trim()];
	return ["other"];
};

const humanizeCategory = (id) => (id ? id.charAt(0).toUpperCase() + id.slice(1) : id);

// Engine-level operators (resolved by the parsing engine, not the wildcard registry)
// shown once above the categories, using the same row format as regular wildcards.
const ENGINE_OPERATORS = [
	{
		token: "${PATH:${WILDCARD},path}",
		label: "PATH",
		description: __(
			"Nested values use PATH, for example ${PATH:${ACF_FIELD_ARRAY:contact},info}",
			"motto-blocks"
		),
	},
	{
		token: "${FORMAT:${WILDCARD},mode}",
		label: "FORMAT",
		description: __(
			"Formats text output, for example ${FORMAT:${ACF_FIELD:category},title} turns this_value into This Value",
			"motto-blocks"
		),
	},
];

export function WildcardsPopup({ wildcards = [], allowedCategories, disabled = false }) {
	const [isOpen, setIsOpen] = useState(false);
	const buttonRef = useRef(null);

	// Category labels come from the shared registry (motto_blocks_wildcard_categories)
	// so consumer plugins never need to keep a local, easily-stale category list in sync.
	const [categoryLabels, setCategoryLabels] = useState({});
	useEffect(() => {
		apiFetch({ path: "/motto-blocks/v1/wildcard-categories" })
			.then((data) => {
				if (!Array.isArray(data)) return;
				const map = {};
				data.forEach((entry) => {
					if (entry?.id) map[entry.id] = entry.label || entry.id;
				});
				setCategoryLabels(map);
			})
			.catch(() => {});
	}, []);

	const filtered = useMemo(() => {
		if (!Array.isArray(wildcards)) return [];
		if (!allowedCategories || allowedCategories.length === 0) return wildcards;
		const allowed = new Set(allowedCategories);
		return wildcards.filter((w) => getCats(w).some((cat) => allowed.has(cat)));
	}, [wildcards, allowedCategories]);

	const tabs = useMemo(() => {
		const seen = new Map();
		filtered.forEach((w) => {
			getCats(w).forEach((cat) => {
				if (!seen.has(cat)) {
					seen.set(cat, categoryLabels[cat] || humanizeCategory(cat));
				}
			});
		});
		return Array.from(seen.entries()).map(([name, title]) => ({ name, title }));
	}, [filtered, categoryLabels]);

	if (filtered.length === 0) return null;

	const renderItem = (wildcard) => (
		<div className="motto-wildcard-item" key={wildcard.token}>
			<code className="motto-wildcard-token">{wildcard.token}</code>
			{wildcard.description && (
				<div className="motto-wildcard-description">{wildcard.description}</div>
			)}
		</div>
	);

	const renderItemList = (items, extraClassName) => (
		<div
			className={
				extraClassName
					? `motto-wildcards-popup__list ${extraClassName}`
					: "motto-wildcards-popup__list"
			}
		>
			{items.map(renderItem)}
		</div>
	);

	return (
		<div className="motto-wildcards-popup-wrapper">
			<Button
				ref={buttonRef}
				variant="secondary"
				className="motto-wildcards-popup__trigger"
				onClick={() => setIsOpen((v) => !v)}
				aria-expanded={isOpen}
				disabled={disabled}
			>
				<BookOpenText size={16} />
				{__("Available wildcards", "motto-blocks")}
			</Button>
			{isOpen && (
				<Popover
					anchor={buttonRef.current}
					placement="left-start"
					offset={8}
					onClose={() => setIsOpen(false)}
					className="motto-wildcards-popup"
				>
					<div className="motto-wildcards-popup__content">
						{tabs.length > 1 ? (
							<TabPanel className="motto-wildcards-popup__tabs" tabs={tabs}>
								{(tab) =>
									renderItemList(
										filtered.filter((w) => getCats(w).includes(tab.name))
									)
								}
							</TabPanel>
						) : (
							renderItemList(filtered)
						)}
						{renderItemList(ENGINE_OPERATORS, "motto-wildcards-popup__list--operators")}
					</div>
				</Popover>
			)}
		</div>
	);
}
