import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { walkEditorInstances } from "./instance-tree-runtime";

const createSelectBlockEditor = (rootBlocks = [], childBlocksByClientId = {}) => ({
	getBlocks(clientId) {
		if (typeof clientId === "string" && clientId) {
			return childBlocksByClientId[clientId] || [];
		}
		return rootBlocks;
	},
});

describe("walkEditorInstances", () => {
	beforeEach(() => {
		global.window = {
			wp: {
				blocks: {
					parse: vi.fn(() => []),
				},
			},
		};
	});

	afterEach(() => {
		delete global.window;
	});

	it("prefers live block-editor children for template parts", () => {
		const parse = vi.fn(() => [
			{
				name: "core/paragraph",
				clientId: "entity-child",
				attributes: {},
				innerBlocks: [],
			},
		]);
		global.window.wp.blocks.parse = parse;

		const rootBlocks = [
			{
				name: "core/template-part",
				clientId: "template-part-1",
				attributes: {
					slug: "header",
					theme: "twentytwentyfive",
				},
				innerBlocks: [],
			},
		];
		const liveChild = {
			name: "core/group",
			clientId: "live-child",
			attributes: {},
			innerBlocks: [],
		};
		const selectBlockEditor = createSelectBlockEditor(rootBlocks, {
			"template-part-1": [liveChild],
		});
		const selectCore = {
			getEntityRecords: vi.fn(() => [
				{
					id: 15,
					content: { raw: "<!-- wp:paragraph --><p>Entity</p><!-- /wp:paragraph -->" },
				},
			]),
			getEntityRecordEdits: vi.fn(() => null),
		};

		const visited = [];
		walkEditorInstances(selectCore, selectBlockEditor, (block, meta) => {
			visited.push({
				name: block.name,
				clientId: block.clientId,
				depth: meta.depth,
				treeIndex: meta.treeIndex,
			});
		});

		expect(visited).toEqual([
			{ name: "core/template-part", clientId: "template-part-1", depth: 0, treeIndex: 0 },
			{ name: "core/group", clientId: "live-child", depth: 1, treeIndex: 1 },
		]);
		expect(parse).not.toHaveBeenCalled();
	});

	it("falls back to parsed template-part entity blocks when live children are unavailable", () => {
		const entityChild = {
			name: "core/group",
			clientId: "entity-child",
			attributes: {},
			innerBlocks: [],
		};
		const parse = vi.fn(() => [entityChild]);
		global.window.wp.blocks.parse = parse;

		const rootBlocks = [
			{
				name: "core/template-part",
				clientId: "template-part-2",
				attributes: {
					slug: "footer",
					theme: "twentytwentyfive",
				},
				innerBlocks: [],
			},
		];
		const selectBlockEditor = createSelectBlockEditor(rootBlocks, {
			"template-part-2": [],
		});
		const selectCore = {
			getEntityRecords: vi.fn(() => [
				{
					id: 20,
					content: { raw: "<!-- wp:group --><div></div><!-- /wp:group -->" },
				},
			]),
			getEntityRecordEdits: vi.fn(() => null),
		};

		const visited = [];
		walkEditorInstances(selectCore, selectBlockEditor, (block, meta) => {
			visited.push({
				name: block.name,
				clientId: block.clientId,
				depth: meta.depth,
				treeIndex: meta.treeIndex,
			});
		});

		expect(visited).toEqual([
			{ name: "core/template-part", clientId: "template-part-2", depth: 0, treeIndex: 0 },
			{ name: "core/group", clientId: "entity-child", depth: 1, treeIndex: 1 },
		]);
		expect(parse).toHaveBeenCalledTimes(1);
	});

	it("prefers live block-editor children for post content in template view", () => {
		const rootBlocks = [
			{
				name: "core/template-part",
				clientId: "template-header",
				attributes: { slug: "header", theme: "twentytwentyfive" },
				innerBlocks: [],
			},
			{
				name: "core/post-content",
				clientId: "post-content-1",
				attributes: {},
				innerBlocks: [],
			},
			{
				name: "core/template-part",
				clientId: "template-footer",
				attributes: { slug: "footer", theme: "twentytwentyfive" },
				innerBlocks: [],
			},
		];
		const liveContentChild = {
			name: "core/group",
			clientId: "post-content-child",
			attributes: {},
			innerBlocks: [],
		};
		const selectBlockEditor = createSelectBlockEditor(rootBlocks, {
			"post-content-1": [liveContentChild],
		});
		const selectCore = {
			getEntityRecords: vi.fn(() => []),
			getEntityRecordEdits: vi.fn(() => null),
		};

		const visited = [];
		walkEditorInstances(selectCore, selectBlockEditor, (block, meta) => {
			visited.push({
				name: block.name,
				clientId: block.clientId,
				depth: meta.depth,
				treeIndex: meta.treeIndex,
			});
		});

		expect(visited).toContainEqual({
			name: "core/post-content",
			clientId: "post-content-1",
			depth: 0,
			treeIndex: 1,
		});
		expect(visited).toContainEqual({
			name: "core/group",
			clientId: "post-content-child",
			depth: 1,
			treeIndex: 2,
		});
	});
});
