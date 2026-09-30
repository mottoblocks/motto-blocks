import { __ } from "@wordpress/i18n";
import { useEffect, useMemo, useState } from "@wordpress/element";
import { LayerTabs } from "../../primitives/LayerTabs.jsx";
import { TransitionPropertyField } from "../../primitives/TransitionPropertyField.jsx";
import { TransitionEasingField } from "../../primitives/TransitionEasingField.jsx";
import { TransitionDurationField } from "../../primitives/TransitionDurationField.jsx";

// ─── Parse / build ────────────────────────────────────────────────────────────

const EASING_KEYWORDS = new Set([
	"ease",
	"ease-in",
	"ease-out",
	"ease-in-out",
	"linear",
	"step-start",
	"step-end",
	"initial",
	"inherit",
	"unset",
	"none",
]);

const isEasingToken = (token) => {
	if (EASING_KEYWORDS.has(token.toLowerCase())) return true;
	return /^(?:cubic-bezier|steps|linear)\s*\(/i.test(token);
};

const isTimeToken = (token) => /^-?[\d.]+m?s$/i.test(token);

/** Split a string by delimiter char at paren depth 0. */
const splitAtDepthZero = (raw, delimiter) => {
	const value = String(raw || "").trim();
	if (!value) return [];
	const parts = [];
	let current = "";
	let depth = 0;
	for (const char of value) {
		if (char === "(") depth += 1;
		if (char === ")") depth = Math.max(0, depth - 1);
		if (depth === 0 && char === delimiter) {
			if (current.trim()) parts.push(current.trim());
			current = "";
		} else {
			current += char;
		}
	}
	if (current.trim()) parts.push(current.trim());
	return parts;
};

const parseTransition = (raw) => {
	const value = String(raw || "").trim();
	const result = { property: "", duration: "", easing: "", delay: "" };
	if (!value || value === "none") return result;

	const tokens = splitAtDepthZero(value, " ");
	let timeCount = 0;

	for (const token of tokens) {
		if (isEasingToken(token)) {
			result.easing = token;
		} else if (isTimeToken(token)) {
			if (timeCount === 0) result.duration = token;
			else result.delay = token;
			timeCount += 1;
		} else if (token !== "none") {
			result.property = token;
		}
	}

	return result;
};

const buildTransition = ({ property, duration, easing, delay }) => {
	const parts = [];
	if (property) parts.push(property);
	if (duration) parts.push(duration);
	if (easing) parts.push(easing);
	if (delay) parts.push(delay);
	return parts.join(" ").trim();
};

const buildTransitionList = (list) =>
	(Array.isArray(list) ? list : [])
		.map(buildTransition)
		.filter((v) => v !== "")
		.join(", ");

// ─── Component ────────────────────────────────────────────────────────────────

const DEFAULT_TRANSITION = { property: "all", duration: "300ms", easing: "ease", delay: "" };

export const TransitionControl = ({ value, onChange }) => {
	const rawValue = String(value || "").trim();

	const transitions = useMemo(() => {
		const parts = splitAtDepthZero(rawValue, ",");
		return parts.length > 0 ? parts.map(parseTransition) : [{ ...DEFAULT_TRANSITION }];
	}, [rawValue]);

	const [activeIndex, setActiveIndex] = useState(0);

	useEffect(() => {
		if (activeIndex < transitions.length) return;
		setActiveIndex(Math.max(0, transitions.length - 1));
	}, [activeIndex, transitions.length]);

	const getParsed = () => {
		const parts = splitAtDepthZero(rawValue, ",");
		return parts.length > 0 ? parts.map(parseTransition) : [{ ...DEFAULT_TRANSITION }];
	};

	const updateTransition = (index, patch) => {
		const current = getParsed();
		if (!current[index]) return;
		const next = current.map((item, idx) => (idx === index ? { ...item, ...patch } : item));
		onChange(buildTransitionList(next));
	};

	const addTransition = () => {
		const current = getParsed();
		const next = [...current, { ...DEFAULT_TRANSITION }];
		onChange(buildTransitionList(next));
		setActiveIndex(next.length - 1);
	};

	const removeTransition = (index) => {
		const current = getParsed();
		const next = current.filter((_, idx) => idx !== index);
		onChange(next.length > 0 ? buildTransitionList(next) : "");
		if (activeIndex >= next.length) setActiveIndex(Math.max(0, next.length - 1));
	};

	const duplicateTransition = (index) => {
		const current = getParsed();
		if (!current[index]) return;
		const next = [...current];
		next.splice(index + 1, 0, { ...current[index] });
		onChange(buildTransitionList(next));
		setActiveIndex(index + 1);
	};

	const reorderTransitions = (fromIndex, toIndex) => {
		const current = getParsed();
		if (!current[fromIndex]) return;
		const next = [...current];
		const [moved] = next.splice(fromIndex, 1);
		next.splice(Math.max(0, Math.min(next.length, toIndex)), 0, moved);
		onChange(buildTransitionList(next));
		setActiveIndex(Math.max(0, Math.min(next.length - 1, toIndex)));
	};

	const resolvedActiveIndex = transitions[activeIndex] ? activeIndex : 0;
	const activeTransition = transitions[resolvedActiveIndex] || null;

	return (
		<div className="motto-transition-control">
			<LayerTabs
				items={transitions}
				activeIndex={resolvedActiveIndex}
				onActiveChange={setActiveIndex}
				onAdd={addTransition}
				onDuplicate={duplicateTransition}
				onRemove={removeTransition}
				onReorder={reorderTransitions}
				getItemLabel={(item) => item?.property || __("Transition", "motto-blocks")}
				ariaLabel={__("Transitions", "motto-blocks")}
				addAriaLabel={__("Add transition", "motto-blocks")}
				duplicateAriaLabel={__("Duplicate transition", "motto-blocks")}
				removeAriaLabel={__("Remove transition", "motto-blocks")}
				tabBehavior={{ allowNoTabs: true, draggable: true }}
			/>
			{activeTransition ? (
				<div className="motto-transition-panel motto-grid gap-sm">
					<TransitionPropertyField
						label={__("Property", "motto-blocks")}
						value={activeTransition.property}
						onChange={(next) =>
							updateTransition(resolvedActiveIndex, { property: next })
						}
					/>
					<TransitionDurationField
						label={__("Duration", "motto-blocks")}
						value={activeTransition.duration}
						onChange={(next) =>
							updateTransition(resolvedActiveIndex, { duration: next })
						}
					/>
					<TransitionDurationField
						label={__("Delay", "motto-blocks")}
						value={activeTransition.delay}
						onChange={(next) => updateTransition(resolvedActiveIndex, { delay: next })}
					/>
					<TransitionEasingField
						label={__("Easing", "motto-blocks")}
						value={activeTransition.easing}
						onChange={(next) => updateTransition(resolvedActiveIndex, { easing: next })}
					/>
				</div>
			) : null}
		</div>
	);
};
