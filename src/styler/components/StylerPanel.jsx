import { useSelect } from "@wordpress/data";
import { PanelBody } from "@wordpress/components";
import { useCallback, useEffect, useMemo, useRef } from "@wordpress/element";
import { __ } from "@wordpress/i18n";
import { persistStylerAttributes, resolveRawStylerAttributes } from "../runtime/styler-attributes";
import { DeviceToggleControl } from "@components";
import {
	withPersistedBlockSelectors,
	withRuntimeBlockSelectors,
} from "../utils/block-selectors-shape";
import { AttachedClassesSection } from "../classes/components/AttachedClassesSection";
import { ClassEditorPanel } from "../classes/components/ClassEditorPanel";
import { CreateClassModal } from "../classes/components/CreateClassModal";
import { useCssClassRegistry } from "../classes/use-css-class-registry";
import { useInlineCssClassEditor } from "../classes/use-inline-css-class-editor";
import {
	hasAnyMottoContent,
	hasBlockSelectorsByBreakpointContent,
	hasMainMottoContent,
	normalizeMottoStylerWithClasses,
} from "../utils/motto-content";
import { generateInstanceId, hasValidInstanceId } from "../utils/instance-id";
import { StylerCssList } from "./StylerCssList";
import { SelectorsSection } from "./SelectorsSection";
import { BlockSpacingSection } from "./BlockSpacingSection";
import { useClassManagement } from "../hooks/use-class-management";
import { useMainStyles } from "../hooks/use-main-styles";
import { usePanelBodyHeight } from "../hooks/use-panel-body-height";

const PREVIEW_STORE_KEY = "motto-styler/preview";

const stripSelectorAliases = (value = {}) => {
	const nextValue = value && typeof value === "object" ? { ...value } : {};
	delete nextValue.blockSelectors;
	delete nextValue.innerSelectors;
	return nextValue;
};

export const StylerPanel = ({ blockName, clientId, attributes, setAttributes }) => {
	const panelBodyRef = useRef(null);
	const classEditorRef = useRef(null);
	const mottoStylerRef = useRef(null);

	const mode = useSelect((select) => select(PREVIEW_STORE_KEY)?.getMode?.() || "desktop", []);

	const blockTypeMottoDefaults = useSelect(
		(select) => {
			const blockType = select("core/blocks")?.getBlockType?.(blockName);
			const fromSettings = blockType?.mottoDefaults;
			if (fromSettings && typeof fromSettings === "object") return fromSettings;
			const fromAttribute = blockType?.attributes?.mottoDefaults?.default;
			return fromAttribute && typeof fromAttribute === "object" ? fromAttribute : {};
		},
		[blockName]
	);

	const blockBaseLayout = useSelect(
		(select) => select("core/blocks")?.getBlockType?.(blockName)?.mottoBaseLayout || "",
		[blockName]
	);

	const sourceBlock = useSelect(
		(select) => (clientId ? select("core/block-editor")?.getBlock?.(clientId) : null),
		[clientId]
	);

	const mottoStyler = withRuntimeBlockSelectors(
		normalizeMottoStylerWithClasses(resolveRawStylerAttributes(attributes))
	);

	useEffect(() => {
		mottoStylerRef.current = mottoStyler;
	}, [mottoStyler]);

	const normalizedMottoDefaults = useMemo(() => {
		const fromAttributes = normalizeMottoStylerWithClasses(attributes?.mottoDefaults || {});
		if (hasAnyMottoContent(fromAttributes)) return fromAttributes;
		return normalizeMottoStylerWithClasses(blockTypeMottoDefaults || {});
	}, [attributes?.mottoDefaults, blockTypeMottoDefaults]);

	const hasMainMottoDefaults = useMemo(
		() => hasMainMottoContent(normalizedMottoDefaults),
		[normalizedMottoDefaults]
	);

	const hasInnerSelectorDefaults = useMemo(
		() => hasBlockSelectorsByBreakpointContent(normalizedMottoDefaults?.blockSelectors),
		[normalizedMottoDefaults]
	);

	const updateMottoStyler = useCallback(
		(nextPartial) => {
			const current = mottoStylerRef.current;
			const partial = typeof nextPartial === "function" ? nextPartial(current) : nextPartial;
			if (!partial || typeof partial !== "object") return;
			const touchesSelectors =
				partial.blockSelectors !== undefined || partial.innerSelectors !== undefined;
			const next = {
				...(touchesSelectors ? stripSelectorAliases(current) : current),
				...partial,
			};
			const hasNextContent = hasAnyMottoContent(next);
			const nextWithInstanceId =
				hasNextContent && !hasValidInstanceId(next)
					? { ...next, instanceId: generateInstanceId() }
					: next;
			mottoStylerRef.current = nextWithInstanceId;
			persistStylerAttributes(setAttributes, nextWithInstanceId);
		},
		[setAttributes]
	);

	const { classRecords, classRecordsById, classIdMap, classUidById, resolveLinkedClassRef } =
		useCssClassRegistry();

	const classEditor = useInlineCssClassEditor({
		normalizeMottoStylerWithClasses,
		resolveLinkedClassRef,
		withPersistedBlockSelectors,
		classRecordsById,
	});

	usePanelBodyHeight(panelBodyRef, classEditorRef, classEditor.editingClassId);

	const classManagement = useClassManagement({
		mottoStyler,
		updateMottoStyler,
		classRecords,
		classRecordsById,
		classIdMap,
		classUidById,
		resolveLinkedClassRef,
		sourceBlock,
		openEditingClass: classEditor.openEditingClass,
	});

	const mainPopupScope = useMemo(() => `block:${String(clientId || "unknown")}:main`, [clientId]);
	const selectorPopupScope = useMemo(
		() => `block:${String(clientId || "unknown")}:selectors`,
		[clientId]
	);

	const mainStyles = useMainStyles({
		mottoStyler,
		updateMottoStyler,
		mode,
		hasMainMottoDefaults,
		hasInnerSelectorDefaults,
		normalizedMottoDefaults,
		onSaveAsClass: classManagement.startCreatingClass,
	});

	return (
		<PanelBody
			title={__("Motto Styler", "motto-blocks")}
			className="motto-panel-body motto-styler-panel"
			initialOpen
			ref={panelBodyRef}
		>
			<div ref={classEditorRef}>
				<DeviceToggleControl variant="extended" storeKey={PREVIEW_STORE_KEY} />

				<div className="motto-panel-section">
					<StylerCssList
						key={mode}
						rows={mainStyles.cssRows}
						onRowsChange={mainStyles.handleRowsChange}
						cssByBreakpoint={mottoStyler?.css}
						onCssByBreakpointChange={mainStyles.handleCssByBreakpointChange}
						blockSelectorsByBreakpoint={mottoStyler?.blockSelectors}
						onBlockSelectorsByBreakpointChange={(nextBlockSelectors) => {
							updateMottoStyler({
								blockSelectors:
									nextBlockSelectors && typeof nextBlockSelectors === "object"
										? nextBlockSelectors
										: {},
							});
						}}
						mode={mode}
						popupScope={mainPopupScope}
						showResetToDefaults={hasMainMottoDefaults}
						onResetToDefaults={mainStyles.handleResetToDefaults}
						blockSpacingEnabled={mottoStyler?.blockSpacing?.enabled === true}
						classMottoStylers={classManagement.attachedClassMottoStylers}
						baseLayout={blockBaseLayout}
						extraControls={mainStyles.extraControls}
						actionsExtra={classManagement.addClassTrigger}
					>
						<AttachedClassesSection {...classManagement.attachedClassesSectionProps} />
					</StylerCssList>
				</div>

				<CreateClassModal {...classManagement.createClassModalProps} />

				<SelectorsSection
					mode={mode}
					mottoStyler={mottoStyler}
					updateMottoStyler={updateMottoStyler}
					attributes={attributes}
					setAttributes={setAttributes}
					popupScope={selectorPopupScope}
					showResetToDefaults={hasInnerSelectorDefaults}
					onResetToDefaults={mainStyles.handleResetSelectorsToDefaults}
				/>

				<BlockSpacingSection
					isHidden={Boolean(classEditor.editingClassId)}
					mode={mode}
					blockSpacing={mottoStyler?.blockSpacing}
					cssByBreakpoint={mottoStyler?.css}
					classMottoStylers={classManagement.attachedClassMottoStylers}
					baseLayout={blockBaseLayout}
					onChange={(nextBlockSpacing) => {
						updateMottoStyler((current) => ({
							blockSpacing:
								typeof nextBlockSpacing === "function"
									? nextBlockSpacing(current?.blockSpacing || {})
									: nextBlockSpacing,
						}));
					}}
				/>
				<ClassEditorPanel {...classEditor} mode={mode} />
			</div>
		</PanelBody>
	);
};
