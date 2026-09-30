const GROUP_DEFAULT = "css-rule-row";

const openByGroup = new Map();
const listeners = new Set();

const notify = (event) => {
	listeners.forEach((listener) => {
		try {
			listener(event);
		} catch {
			// Keep manager resilient if one subscriber fails.
		}
	});
};

const normalizeGroup = (groupId) => {
	const raw = String(groupId || "").trim();
	return raw || GROUP_DEFAULT;
};

const normalizeOwner = (ownerId) => String(ownerId || "").trim();

export const popupManager = {
	open({ ownerId, groupId } = {}) {
		const nextOwnerId = normalizeOwner(ownerId);
		if (!nextOwnerId) return;
		const nextGroupId = normalizeGroup(groupId);
		const currentOwnerId = openByGroup.get(nextGroupId);
		if (currentOwnerId === nextOwnerId) return;

		if (currentOwnerId) {
			notify({ type: "close", ownerId: currentOwnerId, groupId: nextGroupId });
		}

		openByGroup.set(nextGroupId, nextOwnerId);
		notify({ type: "open", ownerId: nextOwnerId, groupId: nextGroupId });
	},

	close({ ownerId, groupId } = {}) {
		const nextOwnerId = normalizeOwner(ownerId);
		const nextGroupId = normalizeGroup(groupId);
		const currentOwnerId = openByGroup.get(nextGroupId);

		if (nextOwnerId && currentOwnerId && currentOwnerId !== nextOwnerId) return;
		if (!currentOwnerId) return;

		openByGroup.delete(nextGroupId);
		notify({ type: "close", ownerId: currentOwnerId, groupId: nextGroupId });
	},

	isOpen({ ownerId, groupId } = {}) {
		const nextOwnerId = normalizeOwner(ownerId);
		if (!nextOwnerId) return false;
		const nextGroupId = normalizeGroup(groupId);
		return openByGroup.get(nextGroupId) === nextOwnerId;
	},

	subscribe(listener) {
		if (typeof listener !== "function") return () => {};
		listeners.add(listener);
		return () => {
			listeners.delete(listener);
		};
	},
};
