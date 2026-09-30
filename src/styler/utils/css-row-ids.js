export const createItemId = (prefix = "item") =>
	`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const createUniqueId = (usedIds, prefix = "css") => {
	let id = "";
	do {
		id = createItemId(prefix);
	} while (usedIds.has(id));
	usedIds.add(id);
	return id;
};

export const takeIncomingIdOrCreate = (usedIds, incomingId, prefix) => {
	const normalizedId = String(incomingId || "").trim();
	if (normalizedId && !usedIds.has(normalizedId)) {
		usedIds.add(normalizedId);
		return normalizedId;
	}
	return createUniqueId(usedIds, prefix);
};

export const repairCssRowIds = (rows) => {
	const source = Array.isArray(rows) ? rows : [];
	if (source.length === 0) {
		return {
			changed: false,
			rows: source,
		};
	}

	const usedIds = new Set();
	let changed = false;
	const repairedRows = source.map((item) => {
		const currentId = String(item?.id || "").trim();
		if (currentId && !usedIds.has(currentId)) {
			usedIds.add(currentId);
			return item;
		}
		changed = true;
		return { ...item, id: createUniqueId(usedIds, "css") };
	});

	return {
		changed,
		rows: changed ? repairedRows : source,
	};
};
