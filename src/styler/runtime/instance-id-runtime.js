import { walkEditorInstances } from "./instance-tree-runtime";
import { resolveRawStylerAttributes } from "./styler-attributes";
import { generateInstanceId, resolveValidInstanceId } from "../utils/instance-id";
import { hasAnyMottoContent } from "../utils/motto-content";

const createUniqueInstanceId = (usedIds) => {
	let nextId = generateInstanceId();
	while (usedIds.has(nextId)) {
		nextId = generateInstanceId();
	}
	return nextId;
};

const collectEditorInstanceIds = (coreStore, blockEditorStore) => {
	const byClientId = new Map();
	const byInstanceId = new Map();
	const invalidEntries = [];

	walkEditorInstances(coreStore, blockEditorStore, (block, meta = {}) => {
		const clientId = typeof block?.clientId === "string" ? block.clientId.trim() : "";
		if (!clientId) return;

		const styler = resolveRawStylerAttributes(block?.attributes);
		if (!styler || typeof styler !== "object") return;

		const instanceId = resolveValidInstanceId(styler?.instanceId);

		const treeIndex = Number.isFinite(meta?.treeIndex)
			? Number(meta.treeIndex)
			: Number.MAX_SAFE_INTEGER;
		const entry = {
			clientId,
			instanceId,
			treeIndex,
			styler,
			// Parsed from raw post content (still-synced pattern/template part instances):
			// this clientId isn't tracked by the block-editor store, so updateBlockAttributes
			// on it is a silent no-op. Never pick these as a reassignment target.
			synthetic: Boolean(meta?.synthetic),
		};

		byClientId.set(clientId, entry);
		if (!instanceId) {
			invalidEntries.push(entry);
			return;
		}
		if (!byInstanceId.has(instanceId)) {
			byInstanceId.set(instanceId, [entry]);
			return;
		}
		byInstanceId.get(instanceId).push(entry);
	});

	return {
		byClientId,
		byInstanceId,
		invalidEntries,
	};
};

export const initInstanceIdCollisionRuntime = () => {
	if (!window.wp?.data) return;

	const { select, dispatch, subscribe } = window.wp.data;
	const pendingByClientId = new Map();

	let scheduled = false;
	let rafId = 0;

	const run = () => {
		const blockEditorStore = select("core/block-editor");
		const coreStore = select("core");
		const updateBlockAttributes = dispatch("core/block-editor")?.updateBlockAttributes;
		if (typeof updateBlockAttributes !== "function") return;

		const { byClientId, byInstanceId, invalidEntries } = collectEditorInstanceIds(
			coreStore,
			blockEditorStore
		);

		for (const [clientId, pendingInstanceId] of pendingByClientId.entries()) {
			const entry = byClientId.get(clientId);
			if (!entry || entry.instanceId === pendingInstanceId) {
				pendingByClientId.delete(clientId);
			}
		}

		const usedIds = new Set(byInstanceId.keys());
		const updates = [];

		invalidEntries.forEach((entry) => {
			if (entry.synthetic) return;
			if (!entry?.clientId || pendingByClientId.has(entry.clientId)) return;
			if (!hasAnyMottoContent(entry.styler)) return;

			const nextInstanceId = createUniqueInstanceId(usedIds);
			usedIds.add(nextInstanceId);
			pendingByClientId.set(entry.clientId, nextInstanceId);
			updates.push({
				clientId: entry.clientId,
				nextInstanceId,
				styler: entry.styler,
			});
		});

		for (const entries of byInstanceId.values()) {
			if (!Array.isArray(entries) || entries.length < 2) continue;
			const sortedEntries = [...entries].sort((a, b) => a.treeIndex - b.treeIndex);

			// A synthetic entry (still-synced pattern/template part content) can't be
			// reassigned, and it's the canonical source of this instanceId. When one is
			// present, every real entry in the group must move — keeping any of them
			// would leave it silently sharing CSS with the synced source. Otherwise, fall
			// back to the original "first stays, rest move" rule for real-vs-real dupes.
			const hasSyntheticAnchor = sortedEntries.some((entry) => entry.synthetic);
			const movable = hasSyntheticAnchor
				? sortedEntries.filter((entry) => !entry.synthetic)
				: sortedEntries.slice(1);

			movable.forEach((entry) => {
				if (!entry?.clientId || pendingByClientId.has(entry.clientId)) return;

				const nextInstanceId = createUniqueInstanceId(usedIds);
				usedIds.add(nextInstanceId);
				pendingByClientId.set(entry.clientId, nextInstanceId);
				updates.push({
					clientId: entry.clientId,
					nextInstanceId,
					styler: entry.styler,
				});
			});
		}

		if (updates.length === 0) return;

		updates.forEach(({ clientId, nextInstanceId, styler }) => {
			updateBlockAttributes(clientId, {
				mottoStyler: {
					...styler,
					instanceId: nextInstanceId,
				},
			});
		});
	};

	const schedule = () => {
		if (scheduled) return;
		scheduled = true;
		if (rafId) cancelAnimationFrame(rafId);
		rafId = requestAnimationFrame(() => {
			rafId = 0;
			scheduled = false;
			run();
		});
	};

	subscribe(schedule);
	run();
};
