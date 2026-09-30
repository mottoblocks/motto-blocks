export function withMottoPopupClass(...classNames) {
	return ["motto-popup", ...classNames]
		.flatMap((value) => String(value || "").split(/\s+/))
		.map((value) => value.trim())
		.filter(Boolean)
		.filter((value, index, values) => values.indexOf(value) === index)
		.join(" ");
}
