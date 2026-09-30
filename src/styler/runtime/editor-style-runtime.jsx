/**
 * Editor Style Collector (ported from the legacy standalone Styler runtime)
 *
 * - Subscribes to block-editor store changes
 * - Walks blocks recursively
 * - Caches per-instanceId signature + CSS
 * - Updates a single style tag via the registry
 */

import { buildEditorCss } from "./style-engine";
import { isStylerCoreMvpBlock } from "./supported-blocks";
import { setEditorBlockStylesBatch } from "./editor-style-registry";
import { walkEditorInstances } from "./instance-tree-runtime";
import { buildMottoStylerCssSignature } from "./motto-styler-signature";
import cssOutputOrderConfig from "../data/motto-css-output-order.json";
import { resolveRawStylerAttributes } from "./styler-attributes";
import { hasAnyMottoContent } from "../utils/motto-content";
import { resolveClassMetaStyler } from "../classes/class-meta";
import { normalizeMottoBaseLayout } from "../layout/base-layout";
import { scheduleEditorFrameTask } from "./editor-frame-scheduler";
import { resolveValidInstanceId } from "../utils/instance-id";

const CLASS_RECORD_FIELDS = ["id", "meta"];

const resolveClassMottoStylers = (mp, coreStore) => {
	const cssClasses = Array.isArray(mp?.cssClasses) ? mp.cssClasses : [];
	if (cssClasses.length === 0) return [];
	return cssClasses.reduce((acc, { id }) => {
		if (!(id > 0)) return acc;
		// _fields skips `content` so core-data does not parse block markup of
		// the CSS class entity (which can be invalid and would log block-
		// validation warnings unrelated to the post being edited).
		const record =
			coreStore.getEntityRecord?.("postType", "motto_css_class", id, {
				_fields: CLASS_RECORD_FIELDS,
			}) ?? null;
		if (record) {
			const classStyler = resolveClassMetaStyler(record.meta);
			if (classStyler) acc.push(classStyler);
		}
		return acc;
	}, []);
};

export const initEditorStyleCollector = () => {
	if (!window.wp?.data) return;

	const { select, subscribe } = window.wp.data;

	const cache = {
		propsSigById: {},
		cssById: {},
	};

	let lastGlobalSignature = "";
	let prevIds = [];
	const instanceSort = Array.isArray(cssOutputOrderConfig?.order?.instanceSort)
		? cssOutputOrderConfig.order.instanceSort
		: ["depthAsc", "treeIndexAsc"];

	const run = () => {
		const blockEditor = select("core/block-editor");
		const coreStore = select("core");

		const nextIds = [];
		const nextCssById = {};
		const instanceMetaById = new Map();
		const resolveStyleInstanceId = (blockMp, fallbackClientId) => {
			const explicit = resolveValidInstanceId(blockMp?.instanceId);
			if (explicit) return explicit;
			return resolveValidInstanceId(fallbackClientId);
		};
		const resolveBlockBaseLayout = (blockName) => {
			const registered = window?.wp?.blocks?.getBlockType?.(blockName);
			return normalizeMottoBaseLayout(registered?.mottoBaseLayout);
		};

		walkEditorInstances(coreStore, blockEditor, (block, meta = {}) => {
			const mp = resolveRawStylerAttributes(block?.attributes);
			if (!mp || typeof mp !== "object") return;
			const supportedByTarget = isStylerCoreMvpBlock(block?.name);
			const hasExistingStylerContent = hasAnyMottoContent(mp);
			if (!supportedByTarget && !hasExistingStylerContent) return;

			const instanceId = resolveStyleInstanceId(mp, block?.clientId);
			if (typeof instanceId !== "string" || !instanceId) return;

			nextIds.push(instanceId);
			if (!instanceMetaById.has(instanceId)) {
				instanceMetaById.set(instanceId, {
					depth: Number.isFinite(meta?.depth) ? Number(meta.depth) : 0,
					treeIndex: Number.isFinite(meta?.treeIndex)
						? Number(meta.treeIndex)
						: Number.MAX_SAFE_INTEGER,
				});
			}

			const classMottoStylers = resolveClassMottoStylers(mp, coreStore);
			const classCssSig = classMottoStylers.map(buildMottoStylerCssSignature).join("|");
			const propsSig =
				buildMottoStylerCssSignature(mp) + (classCssSig ? `:c:${classCssSig}` : "");
			if (cache.propsSigById[instanceId] !== propsSig) {
				cache.propsSigById[instanceId] = propsSig;
				cache.cssById[instanceId] =
					buildEditorCss(instanceId, mp, classMottoStylers, {
						baseLayout: resolveBlockBaseLayout(block?.name),
					}) || "";
			}

			if (cache.cssById[instanceId]) {
				nextCssById[instanceId] = cache.cssById[instanceId];
			}
		});

		const ids = Array.from(new Set(nextIds));
		ids.sort((a, b) => {
			const aMeta = instanceMetaById.get(a) || {
				depth: 0,
				treeIndex: Number.MAX_SAFE_INTEGER,
			};
			const bMeta = instanceMetaById.get(b) || {
				depth: 0,
				treeIndex: Number.MAX_SAFE_INTEGER,
			};

			for (const rule of instanceSort) {
				if (rule === "depthAsc" && aMeta.depth !== bMeta.depth) {
					return aMeta.depth - bMeta.depth;
				}
				if (rule === "treeIndexAsc" && aMeta.treeIndex !== bMeta.treeIndex) {
					return aMeta.treeIndex - bMeta.treeIndex;
				}
			}

			return String(a).localeCompare(String(b));
		});

		const globalSignature = ids.map((id) => `${id}:${cache.propsSigById[id] || ""}`).join("|");
		if (globalSignature === lastGlobalSignature) return;
		lastGlobalSignature = globalSignature;

		const idsSet = new Set(ids);
		const updates = [];
		prevIds.forEach((id) => {
			if (!idsSet.has(id)) {
				delete cache.propsSigById[id];
				delete cache.cssById[id];
				updates.push([id, ""]);
			}
		});

		ids.forEach((id) => {
			updates.push([id, nextCssById[id] || ""]);
		});
		setEditorBlockStylesBatch(updates);

		prevIds = ids;
	};

	const schedule = () => {
		scheduleEditorFrameTask("editor-style-runtime", run);
	};

	subscribe(schedule);
	run();
};
