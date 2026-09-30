import { createElement } from "@wordpress/element";

function toKebabCase(value) {
	return String(value || "")
		.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
		.replace(/([A-Z])([A-Z][a-z])/g, "$1-$2")
		.toLowerCase();
}

export function normalizeLucideIconName(iconName) {
	if (typeof iconName !== "string") {
		return "";
	}

	const trimmed = iconName.trim();
	if (!trimmed) {
		return "";
	}

	if (trimmed.includes("-")) {
		return trimmed.toLowerCase();
	}

	return toKebabCase(trimmed);
}

export function createLucideOptions(iconRegistry = {}) {
	const registry = iconRegistry && typeof iconRegistry === "object" ? iconRegistry : {};
	return Object.keys(registry)
		.filter((name) => name === normalizeLucideIconName(name))
		.sort((a, b) => a.localeCompare(b))
		.map((name) => ({
			name,
			component: registry[name],
		}));
}

export function getLucideComponent(iconRegistry, iconName) {
	const registry = iconRegistry && typeof iconRegistry === "object" ? iconRegistry : {};
	const normalizedName = normalizeLucideIconName(iconName);
	return registry[normalizedName] || null;
}

function escapeAttribute(value) {
	return String(value)
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function escapeText(value) {
	return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const SVG_ALLOWED_TAGS = new Set([
	"path",
	"circle",
	"rect",
	"line",
	"polyline",
	"polygon",
	"g",
	"ellipse",
]);
const SVG_ALLOWED_ATTRS = new Set([
	"class",
	"d",
	"fill",
	"stroke",
	"stroke-width",
	"stroke-linecap",
	"stroke-linejoin",
	"transform",
	"cx",
	"cy",
	"r",
	"rx",
	"ry",
	"x",
	"y",
	"width",
	"height",
	"x1",
	"y1",
	"x2",
	"y2",
	"points",
	"key",
]);

function serializeLucideNode(node) {
	if (!Array.isArray(node) || node.length < 2) {
		return "";
	}

	const [tagName, attributes] = node;
	const safeTag = String(tagName || "")
		.trim()
		.toLowerCase();
	if (!SVG_ALLOWED_TAGS.has(safeTag)) {
		return "";
	}

	const attrString = Object.entries(attributes || {})
		.filter(([name]) => {
			const normalizedName = String(name || "").toLowerCase();
			return SVG_ALLOWED_ATTRS.has(normalizedName);
		})
		.map(([name, value]) => `${String(name)}="${escapeAttribute(value)}"`)
		.join(" ");

	return attrString ? `<${safeTag} ${attrString}></${safeTag}>` : `<${safeTag}></${safeTag}>`;
}

export function buildLucideSvgMarkup(iconRegistry, iconName) {
	const IconComponent = getLucideComponent(iconRegistry, iconName);
	if (!IconComponent || typeof IconComponent.render !== "function") {
		return "";
	}

	const renderedIcon = IconComponent.render(
		{
			size: 24,
			strokeWidth: 2,
		},
		null
	);
	const iconNode = Array.isArray(renderedIcon?.props?.iconNode)
		? renderedIcon.props.iconNode
		: [];
	if (iconNode.length === 0) {
		return "";
	}

	const normalizedName = normalizeLucideIconName(iconName) || "icon";
	const label = escapeText(normalizedName);
	const innerMarkup = iconNode.map(serializeLucideNode).join("");

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><title>${label}</title>${innerMarkup}</svg>`;
}

export function LucideIcon({
	iconRegistry,
	iconName,
	className,
	size = 24,
	strokeWidth = 2,
	...rest
}) {
	const IconComponent = getLucideComponent(iconRegistry, iconName);
	if (!IconComponent) {
		return null;
	}

	return createElement(IconComponent, {
		className,
		size,
		strokeWidth,
		...rest,
	});
}
