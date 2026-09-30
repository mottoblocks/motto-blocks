export const handleSuggestionListKeyDown = ({
	event,
	items = [],
	activeIndex = -1,
	onActiveIndexChange = () => {},
	onAccept = () => {},
	onEscape = () => {},
}) => {
	const list = Array.isArray(items) ? items : [];
	if (list.length === 0) return false;
	const hasActiveItem =
		Number.isInteger(activeIndex) && activeIndex >= 0 && activeIndex < list.length;

	if (event.key === "ArrowDown") {
		event.preventDefault();
		if (!hasActiveItem) {
			onActiveIndexChange(0);
			return true;
		}
		onActiveIndexChange(Math.min(list.length - 1, activeIndex + 1));
		return true;
	}

	if (event.key === "ArrowUp") {
		event.preventDefault();
		if (!hasActiveItem) {
			onActiveIndexChange(list.length - 1);
			return true;
		}
		onActiveIndexChange(Math.max(0, activeIndex - 1));
		return true;
	}

	if (event.key === "Tab") {
		if (!hasActiveItem) {
			if (event.shiftKey) return false;
			event.preventDefault();
			onActiveIndexChange(0);
			return true;
		}

		if (event.shiftKey) {
			if (activeIndex > 0) {
				event.preventDefault();
				onActiveIndexChange(activeIndex - 1);
				return true;
			}
			onActiveIndexChange(-1);
			return false;
		}

		if (activeIndex < list.length - 1) {
			event.preventDefault();
			onActiveIndexChange(activeIndex + 1);
			return true;
		}
		onActiveIndexChange(-1);
		return false;
	}

	if (event.key === "Enter") {
		if (!hasActiveItem) return false;
		event.preventDefault();
		onAccept(list[activeIndex] || list[0] || null);
		return true;
	}

	if (event.key === "Escape") {
		event.preventDefault();
		onActiveIndexChange(-1);
		onEscape();
		return true;
	}

	return false;
};
