export const reorderArrayItem = (arr, fromIndex, toIndex) => {
	const next = [...arr];
	const [moved] = next.splice(fromIndex, 1);
	next.splice(Math.max(0, Math.min(next.length, toIndex)), 0, moved);
	return next;
};
