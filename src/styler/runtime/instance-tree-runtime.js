const PARSE_CACHE = {
	reusable: {
		signatureByKey: {},
		blocksByKey: {},
	},
	templatePart: {
		signatureByKey: {},
		blocksByKey: {},
	},
};

const hashString = (str) => {
	let hash = 5381;
	for (let i = 0; i < str.length; i += 1) {
		hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
	}
	return (hash >>> 0).toString(36);
};

const getRawContent = (record, edits) => {
	if (typeof edits?.content?.raw === "string") return edits.content.raw;
	if (typeof record?.content?.raw === "string") return record.content.raw;
	return "";
};

const getContentSignature = (record, edits, raw) => {
	const modified = String(edits?.modified || record?.modified || "");
	return `${modified}:${raw.length}:${hashString(raw)}`;
};

const readCachedBlocks = (bucket, key, signature, raw) => {
	if (bucket.signatureByKey[key] !== signature) {
		bucket.signatureByKey[key] = signature;
		bucket.blocksByKey[key] =
			raw && window.wp?.blocks?.parse ? window.wp.blocks.parse(raw) : [];
	}
	return Array.isArray(bucket.blocksByKey[key]) ? bucket.blocksByKey[key] : [];
};

const getReusableBlocks = (selectCore, block) => {
	const refId = Number(block?.attributes?.ref || 0);
	if (!refId) return [];
	const record = selectCore?.getEntityRecord?.("postType", "wp_block", refId);
	if (!record) return [];
	const edits = selectCore?.getEntityRecordEdits?.("postType", "wp_block", refId) || null;
	const raw = getRawContent(record, edits);
	const signature = getContentSignature(record, edits, raw);
	return readCachedBlocks(PARSE_CACHE.reusable, `id:${refId}`, signature, raw);
};

const getTemplatePartRef = (block = {}) => {
	const attrs = block?.attributes || {};
	const idCandidate = Number(
		attrs?.templatePartId || attrs?.postId || attrs?.id || attrs?.ref || 0
	);
	if (idCandidate > 0) {
		return { key: `id:${idCandidate}`, id: idCandidate, slug: "", theme: "" };
	}

	const slug = typeof attrs?.slug === "string" ? attrs.slug.trim() : "";
	const theme = typeof attrs?.theme === "string" ? attrs.theme.trim() : "";
	if (!slug) return null;
	return { key: `slug:${theme || "any"}:${slug}`, id: 0, slug, theme };
};

const findTemplatePartRecord = (selectCore, ref) => {
	if (!selectCore || !ref) return null;
	if (ref.id > 0) {
		return selectCore.getEntityRecord?.("postType", "wp_template_part", ref.id) || null;
	}
	if (!ref.slug) return null;
	const query = { per_page: 1, slug: ref.slug, _embed: false };
	if (ref.theme) query.wp_theme = ref.theme;
	const records = selectCore.getEntityRecords?.("postType", "wp_template_part", query) || [];
	return Array.isArray(records) && records.length > 0 ? records[0] : null;
};

const getBlockEditorChildren = (selectBlockEditor, block) => {
	const clientId = typeof block?.clientId === "string" ? block.clientId.trim() : "";
	if (!clientId || typeof selectBlockEditor?.getBlocks !== "function") return [];
	const blocks = selectBlockEditor.getBlocks(clientId);
	return Array.isArray(blocks) ? blocks : [];
};

const getTemplatePartBlocks = (selectCore, block) => {
	const ref = getTemplatePartRef(block);
	if (!ref) return [];
	const record = findTemplatePartRecord(selectCore, ref);
	if (!record) return [];
	const edits =
		selectCore?.getEntityRecordEdits?.("postType", "wp_template_part", record.id) || null;
	const raw = getRawContent(record, edits);
	const signature = getContentSignature(record, edits, raw);
	return readCachedBlocks(PARSE_CACHE.templatePart, ref.key, signature, raw);
};

const walkBlockList = (blocks, visit, ctx, depth = 0, synthetic = false) => {
	if (!Array.isArray(blocks) || blocks.length === 0) return;
	blocks.forEach((block) => {
		const treeIndex = ctx.visitCounter++;
		visit(block, { depth, treeIndex, synthetic });

		if (block?.name === "core/block") {
			const refId = Number(block?.attributes?.ref || 0);
			if (refId) {
				if (ctx.dedupeReusableRefs && ctx.visitedReusableRefs.has(refId)) return;
				if (ctx.dedupeReusableRefs) ctx.visitedReusableRefs.add(refId);
				const reusableBlocks = getReusableBlocks(ctx.selectCore, block);
				if (reusableBlocks.length > 0) {
					// Parsed from raw post content: these clientIds are not tracked by the
					// block-editor store, so attribute updates targeting them are no-ops.
					walkBlockList(reusableBlocks, visit, ctx, depth + 1, true);
					return;
				}
			}
			if (Array.isArray(block?.innerBlocks) && block.innerBlocks.length > 0) {
				walkBlockList(block.innerBlocks, visit, ctx, depth + 1, synthetic);
			}
			return;
		}
		if (block?.name === "core/template-part") {
			const ref = getTemplatePartRef(block);
			if (ref) {
				if (ctx.dedupeTemplatePartRefs && ctx.visitedTemplatePartRefs.has(ref.key)) return;
				if (ctx.dedupeTemplatePartRefs) ctx.visitedTemplatePartRefs.add(ref.key);
				const liveBlocks = getBlockEditorChildren(ctx.selectBlockEditor, block);
				if (liveBlocks.length > 0) {
					walkBlockList(liveBlocks, visit, ctx, depth + 1, false);
					return;
				}
				const templatePartBlocks = getTemplatePartBlocks(ctx.selectCore, block);
				if (templatePartBlocks.length > 0) {
					walkBlockList(templatePartBlocks, visit, ctx, depth + 1, true);
					return;
				}
			}
			if (Array.isArray(block?.innerBlocks) && block.innerBlocks.length > 0) {
				walkBlockList(block.innerBlocks, visit, ctx, depth + 1, synthetic);
			}
			return;
		}
		if (block?.name === "core/post-content") {
			const liveBlocks = getBlockEditorChildren(ctx.selectBlockEditor, block);
			if (liveBlocks.length > 0) {
				walkBlockList(liveBlocks, visit, ctx, depth + 1, false);
				return;
			}
			if (Array.isArray(block?.innerBlocks) && block.innerBlocks.length > 0) {
				walkBlockList(block.innerBlocks, visit, ctx, depth + 1, synthetic);
			}
			return;
		}
		if (Array.isArray(block?.innerBlocks) && block.innerBlocks.length > 0) {
			walkBlockList(block.innerBlocks, visit, ctx, depth + 1, synthetic);
		}
	});
};

export const walkEditorInstances = (selectCore, selectBlockEditor, visit, options = {}) => {
	const blocks = selectBlockEditor?.getBlocks?.() || [];
	const ctx = {
		selectCore,
		selectBlockEditor,
		visitedReusableRefs: new Set(),
		visitedTemplatePartRefs: new Set(),
		dedupeReusableRefs: options.dedupeReusableRefs !== false,
		dedupeTemplatePartRefs: options.dedupeTemplatePartRefs !== false,
		visitCounter: 0,
	};
	walkBlockList(blocks, visit, ctx, 0, false);
};
