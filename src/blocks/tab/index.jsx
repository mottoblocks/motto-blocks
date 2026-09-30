import metadata from "./block.json";
import { BlockIcon } from "@components/primitives/BlockIcon";
import blockIcon from "@block-icons/tab.svg?raw";
import { registerBlockType } from "@wordpress/blocks";
import { InnerBlocks, useBlockProps, useInnerBlocksProps } from "@wordpress/block-editor";
import { clsx } from "clsx";
import { useDispatch, useSelect } from "@wordpress/data";
import { __ } from "@wordpress/i18n";
import { normalizeTabId } from "../tabs/utils";
import { getMottoBaseLayoutClassName } from "../../styler/layout/base-layout";

const TEMPLATE = [["core/paragraph", { placeholder: __("Tab content…", "motto-blocks") }]];
const BASE_LAYOUT_CLASS = getMottoBaseLayoutClassName(metadata.mottoBaseLayout);

function useTabsParentClientId(clientId) {
	return useSelect(
		(select) => {
			const store = select("core/block-editor");
			const parents = store?.getBlockParents?.(clientId) || [];
			return parents.find((id) => store?.getBlockName?.(id) === "motto/tabs") || "";
		},
		[clientId]
	);
}

registerBlockType(metadata.name, {
	...metadata,
	icon: {
		src: <BlockIcon svg={blockIcon} />,
	},
	edit: ({ attributes, clientId, context }) => {
		const parentClientId = useTabsParentClientId(clientId);
		const { updateBlockAttributes } = useDispatch("core/block-editor");
		const isActive =
			normalizeTabId(context["motto/tabs-activeTabId"]) === normalizeTabId(attributes.tabId);

		const blockProps = useBlockProps({
			className: clsx("motto-tab", BASE_LAYOUT_CLASS, isActive && "is-active"),
			onClick: () => {
				if (parentClientId && normalizeTabId(attributes.tabId)) {
					updateBlockAttributes(parentClientId, {
						activeTabId: normalizeTabId(attributes.tabId),
					});
				}
			},
			"data-tab-id": normalizeTabId(attributes.tabId),
		});
		const innerBlocksProps = useInnerBlocksProps(
			{ className: "motto-tab__content" },
			{
				template: TEMPLATE,
				templateLock: false,
			}
		);

		return (
			<div {...blockProps}>
				<div {...innerBlocksProps} />
			</div>
		);
	},
	save: ({ attributes }) => {
		const blockProps = useBlockProps.save({
			className: `motto-tab ${BASE_LAYOUT_CLASS}`,
			"data-tab-id": normalizeTabId(attributes.tabId),
		});

		return (
			<div {...blockProps}>
				<InnerBlocks.Content />
			</div>
		);
	},
});
