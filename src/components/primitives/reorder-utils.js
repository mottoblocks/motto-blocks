export const moveItemById = (list, id, direction) => {
	const source = Array.isArray(list) ? list : [];
	const fromIndex = source.findIndex((entry) => String(entry?.id || "") === String(id || ""));
	if (fromIndex < 0) return source;
	const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
	if (toIndex < 0 || toIndex >= source.length) return source;
	const next = [...source];
	const [moved] = next.splice(fromIndex, 1);
	next.splice(toIndex, 0, moved);
	return next;
};

export const moveItemToId = (list, fromId, toId) => {
	const source = Array.isArray(list) ? list : [];
	const fromIndex = source.findIndex((entry) => String(entry?.id || "") === String(fromId || ""));
	const toIndex = source.findIndex((entry) => String(entry?.id || "") === String(toId || ""));
	if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return source;
	const next = [...source];
	const [moved] = next.splice(fromIndex, 1);
	next.splice(toIndex, 0, moved);
	return next;
};
