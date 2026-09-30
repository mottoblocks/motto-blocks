import metadata from "./block.json";
import { BlockIcon } from "@components/primitives/BlockIcon";
import blockIcon from "@block-icons/tabs.svg?raw";
import { createBlock, registerBlockType } from "@wordpress/blocks";
import {
	InnerBlocks,
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from "@wordpress/block-editor";
import { PanelBody, ToggleControl } from "@wordpress/components";
import { useDispatch, useSelect } from "@wordpress/data";
import { useEffect, useMemo } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { generateTabId, normalizeTabId } from "./utils";
import { getMottoBaseLayoutClassName } from "../../styler/layout/base-layout";

const TAB_CONTAINER_BLOCK = "motto/tab-container";
const TAB_BUTTON_BLOCK = "motto/tab-button";
const TAB_PANELS_BLOCK = "motto/tab-panels";
const TAB_PANEL_BLOCK = "motto/tab";
const BASE_LAYOUT_CLASS = getMottoBaseLayoutClassName(metadata.mottoBaseLayout);

// Deliberately shallow: motto/tabs uses templateLock: "all", and WordPress re-applies this
// TEMPLATE via synchronizeBlocksWithTemplate() on every mount (not just first insert) — that
// function does `template.map(...)`, so any nested array here caps tab-container/tab-panels'
// children at that literal length forever, silently deleting any button/panel added beyond it
// (confirmed empirically: a manually-added 3rd tab survives the same editing session but is
// deleted the next time the post is reopened). Giving tab-container/tab-panels no nested
// template keeps this WP-native mechanism a no-op for their contents at every depth, so it can
// never touch real button/panel content. The default 2-tab seed is done by our own effect
// below instead, which only fires once (when both sides are actually empty) and never re-truncates.
const TEMPLATE = [[TAB_CONTAINER_BLOCK], [TAB_PANELS_BLOCK]];
const DEFAULT_TAB_SEEDS = [
	{ tabId: "tab-1", label: __("Tab 1", "motto-blocks") },
	{ tabId: "tab-2", label: __("Tab 2", "motto-blocks") },
];

function buildTabButtonAttributesFromPanel(panelBlock) {
	return {
		tabId: normalizeTabId(panelBlock.attributes.tabId),
	};
}

function buildTabButtonFromPanel(panelBlock) {
	return createBlock(TAB_BUTTON_BLOCK, buildTabButtonAttributesFromPanel(panelBlock), [
		createBlock("core/paragraph", { content: __("Tab", "motto-blocks") }),
	]);
}

function buildTabPanelAttributesFromButton(buttonBlock) {
	return {
		tabId: normalizeTabId(buttonBlock.attributes.tabId),
	};
}

function buildTabPanelFromButton(buttonBlock) {
	return createBlock(TAB_PANEL_BLOCK, buildTabPanelAttributesFromButton(buttonBlock), [
		createBlock("core/paragraph", { placeholder: __("Tab content…", "motto-blocks") }),
	]);
}

function Edit({ clientId, attributes, setAttributes }) {
	const directChildren = useSelect(
		(select) => select("core/block-editor").getBlocks(clientId),
		[clientId]
	);
	const { replaceInnerBlocks, updateBlockAttributes } = useDispatch("core/block-editor");
	const activeTabId = normalizeTabId(attributes.activeTabId);
	const tabContainerBlock =
		directChildren.find((block) => block.name === TAB_CONTAINER_BLOCK) || null;
	const tabPanelsBlock = directChildren.find((block) => block.name === TAB_PANELS_BLOCK) || null;
	const tabContainerInnerBlocks = useMemo(
		() => (Array.isArray(tabContainerBlock?.innerBlocks) ? tabContainerBlock.innerBlocks : []),
		[tabContainerBlock]
	);
	const tabPanelsInnerBlocks = useMemo(
		() => (Array.isArray(tabPanelsBlock?.innerBlocks) ? tabPanelsBlock.innerBlocks : []),
		[tabPanelsBlock]
	);
	const tabButtonBlocks = useMemo(() => tabContainerInnerBlocks, [tabContainerInnerBlocks]);
	const tabPanelBlocks = useMemo(() => tabPanelsInnerBlocks, [tabPanelsInnerBlocks]);

	const blockProps = useBlockProps({ className: `motto-tabs ${BASE_LAYOUT_CLASS}` });
	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		allowedBlocks: [TAB_CONTAINER_BLOCK, TAB_PANELS_BLOCK],
		template: TEMPLATE,
		templateLock: "all",
		renderAppender: false,
	});

	useEffect(() => {
		const seenButtonTabIds = new Set();
		tabButtonBlocks.forEach((buttonBlock) => {
			const currentId = normalizeTabId(buttonBlock.attributes.tabId);
			if (!currentId || seenButtonTabIds.has(currentId)) {
				updateBlockAttributes(buttonBlock.clientId, { tabId: generateTabId() });
				return;
			}
			seenButtonTabIds.add(currentId);
		});

		const seenPanelTabIds = new Set();
		tabPanelBlocks.forEach((panelBlock) => {
			const currentId = normalizeTabId(panelBlock.attributes.tabId);
			if (!currentId || seenPanelTabIds.has(currentId)) {
				updateBlockAttributes(panelBlock.clientId, { tabId: generateTabId() });
				return;
			}
			seenPanelTabIds.add(currentId);
		});
		if (!tabButtonBlocks.length && !tabPanelBlocks.length && activeTabId) {
			setAttributes({ activeTabId: "" });
		}
	}, [activeTabId, setAttributes, tabButtonBlocks, tabPanelBlocks, updateBlockAttributes]);

	useEffect(() => {
		const availableTabIds = [...tabButtonBlocks, ...tabPanelBlocks]
			.map((block) => normalizeTabId(block.attributes.tabId))
			.filter(Boolean);

		if (!availableTabIds.length) {
			return;
		}

		if (!activeTabId || !availableTabIds.includes(activeTabId)) {
			setAttributes({ activeTabId: availableTabIds[0] });
		}
	}, [activeTabId, setAttributes, tabButtonBlocks, tabPanelBlocks]);

	useEffect(() => {
		if (!tabContainerBlock || !tabPanelsBlock) {
			return;
		}

		// Fresh insert: TEMPLATE deliberately creates tab-container/tab-panels with no children
		// (see TEMPLATE's comment), so seed the default 2 tabs here instead, once, the first time
		// both sides are actually empty. Never fires again once real content exists.
		if (!tabButtonBlocks.length && !tabPanelBlocks.length) {
			replaceInnerBlocks(
				tabContainerBlock.clientId,
				DEFAULT_TAB_SEEDS.map(({ tabId, label }) =>
					createBlock(TAB_BUTTON_BLOCK, { tabId }, [
						createBlock("core/paragraph", { content: label }),
					])
				),
				false
			);
			replaceInnerBlocks(
				tabPanelsBlock.clientId,
				DEFAULT_TAB_SEEDS.map(({ tabId }) =>
					createBlock(TAB_PANEL_BLOCK, { tabId }, [
						createBlock("core/paragraph", {
							placeholder: __("Tab content…", "motto-blocks"),
						}),
					])
				),
				false
			);
			return;
		}

		// A button/panel list containing a missing OR duplicate tabId is mid-repair (see the
		// ID-repair effect above) and hasn't committed its fix to the store yet. Acting on it
		// here is unsafe either way: an empty id gets filtered out of desiredTabIds (read as
		// "doesn't exist", deleted), and a duplicate id collapses in the tabId->block Map (only
		// one of the two same-id blocks survives desiredButtons/desiredPanels) — both delete
		// content the ID-repair effect was about to fix (e.g. right after "Duplicate" on a
		// tab-button, which clones its tabId too). Bail out this pass; the next render (after
		// the id-repair commits) re-runs with valid, unique data.
		const hasUnrepairedTabId = (blocks) => {
			const seenTabIds = new Set();
			return blocks.some((block) => {
				const tabId = normalizeTabId(block.attributes.tabId);
				if (!tabId || seenTabIds.has(tabId)) {
					return true;
				}
				seenTabIds.add(tabId);
				return false;
			});
		};
		if (hasUnrepairedTabId(tabButtonBlocks) || hasUnrepairedTabId(tabPanelBlocks)) {
			return;
		}

		const panelsByTabId = new Map(
			tabPanelBlocks
				.map((panelBlock) => [normalizeTabId(panelBlock.attributes.tabId), panelBlock])
				.filter(([tabId]) => tabId)
		);
		const buttonsByTabId = new Map(
			tabButtonBlocks
				.map((buttonBlock) => [normalizeTabId(buttonBlock.attributes.tabId), buttonBlock])
				.filter(([tabId]) => tabId)
		);

		const orderedButtonTabIds = tabButtonBlocks
			.map((buttonBlock) => normalizeTabId(buttonBlock.attributes.tabId))
			.filter(Boolean);
		const panelOnlyTabIds = tabPanelBlocks
			.map((panelBlock) => normalizeTabId(panelBlock.attributes.tabId))
			.filter((tabId) => tabId && !buttonsByTabId.has(tabId));
		const desiredTabIds = [...new Set([...orderedButtonTabIds, ...panelOnlyTabIds])];
		const desiredButtons = desiredTabIds
			.map(
				(tabId) =>
					buttonsByTabId.get(tabId) || buildTabButtonFromPanel(panelsByTabId.get(tabId))
			)
			.filter(Boolean);
		const desiredPanels = desiredTabIds
			.map(
				(tabId) =>
					panelsByTabId.get(tabId) || buildTabPanelFromButton(buttonsByTabId.get(tabId))
			)
			.filter(Boolean);
		const currentButtonOrder = tabButtonBlocks
			.map((buttonBlock) => normalizeTabId(buttonBlock.attributes.tabId))
			.filter(Boolean)
			.join("|");
		const desiredButtonOrder = desiredTabIds.join("|");
		const currentPanelOrder = tabPanelBlocks
			.map((panelBlock) => normalizeTabId(panelBlock.attributes.tabId))
			.filter(Boolean)
			.join("|");
		const desiredPanelOrder = desiredTabIds.join("|");

		if (
			tabButtonBlocks.length !== desiredButtons.length ||
			currentButtonOrder !== desiredButtonOrder
		) {
			replaceInnerBlocks(tabContainerBlock.clientId, desiredButtons, false);
		}

		if (
			tabPanelBlocks.length !== desiredPanels.length ||
			currentPanelOrder !== desiredPanelOrder
		) {
			replaceInnerBlocks(tabPanelsBlock.clientId, desiredPanels, false);
		}
	}, [replaceInnerBlocks, tabButtonBlocks, tabContainerBlock, tabPanelBlocks, tabPanelsBlock]);

	return (
		<>
			<InspectorControls>
				<PanelBody
					title={__("Tabs Settings", "motto-blocks")}
					className="motto-panel-body"
					initialOpen
				>
					<div className="motto-panel-section">
						<ToggleControl
							className="motto-toggle"
							label={__("Sync active tab with URL hash", "motto-blocks")}
							checked={!!attributes.syncUrlHash}
							onChange={(syncUrlHash) => setAttributes({ syncUrlHash })}
						/>
					</div>
				</PanelBody>
			</InspectorControls>
			<div {...innerBlocksProps} />
		</>
	);
}

function Save({ attributes }) {
	const blockProps = useBlockProps.save({
		className: `motto-tabs ${BASE_LAYOUT_CLASS}`,
		...(attributes.syncUrlHash ? { "data-sync-url-hash": "true" } : {}),
	});

	return (
		<div {...blockProps}>
			<InnerBlocks.Content />
		</div>
	);
}

registerBlockType(metadata.name, {
	...metadata,
	icon: {
		src: <BlockIcon svg={blockIcon} />,
	},
	edit: Edit,
	save: Save,
	deprecated: [
		{
			attributes: {
				activeTabId: { type: "string", default: "" },
				mottoStyler: { type: "object", default: {} },
			},
			save() {
				const blockProps = useBlockProps.save({
					className: `motto-tabs ${BASE_LAYOUT_CLASS}`,
				});

				return (
					<div {...blockProps}>
						<div className="motto-tabs__panels">
							<InnerBlocks.Content />
						</div>
					</div>
				);
			},
			migrate(attributes, innerBlocks = []) {
				const migratedPanels = innerBlocks.map((block) => {
					const tabId = normalizeTabId(block.attributes?.tabId) || generateTabId();
					return createBlock(
						TAB_PANEL_BLOCK,
						{ ...block.attributes, tabId },
						block.innerBlocks
					);
				});

				const migratedButtons = migratedPanels.map((panelBlock) =>
					buildTabButtonFromPanel(panelBlock)
				);

				return [
					{
						...attributes,
						activeTabId: migratedPanels[0]?.attributes?.tabId || "",
					},
					[
						createBlock(TAB_CONTAINER_BLOCK, {}, migratedButtons),
						createBlock(TAB_PANELS_BLOCK, {}, migratedPanels),
					],
				];
			},
		},
	],
});
