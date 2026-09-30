import { __ } from "@wordpress/i18n";
import { Button, ProgressBar, Spinner } from "@wordpress/components";
import { useCallback, useMemo } from "@wordpress/element";
import { applyFilters } from "@wordpress/hooks";
import { Check, X, CircleAlert } from "lucide-react";

import { ProFeatureCta } from "@components";
import { STYLER_FEATURE_IDS, STYLER_HOOKS } from "../../freepro/freepro-ids";
import { BlockSelectorsList } from "../../components/BlockSelectorsList";
import { StylerCssList } from "../../components/StylerCssList";

export function ClassEditorPanel({
	editingClassId,
	editingClassLabel,
	isSavingEditingClass,
	cancelEditingClass,
	closeEditingClass,
	editingClassSaveProgress,
	editingClassDraft,
	editingClassRecord,
	mode,
	editingClassMottoStyler,
	updateEditingClassMottoStyler,
}) {
	const mainPopupScope = useMemo(
		() => `class-editor:${String(editingClassId || "unknown")}:main`,
		[editingClassId]
	);
	const selectorPopupScope = useMemo(
		() => `class-editor:${String(editingClassId || "unknown")}:selectors`,
		[editingClassId]
	);
	const shouldWarnForBlockSpacingConflicts =
		editingClassMottoStyler?.blockSpacing?.enabled === true;
	const handleCssByBreakpointChange = useCallback(
		(nextCss) => {
			updateEditingClassMottoStyler({
				css: nextCss && typeof nextCss === "object" ? nextCss : {},
			});
		},
		[updateEditingClassMottoStyler]
	);

	if (!editingClassId) return null;

	return (
		<div className="motto-class-editor">
			<div className="motto-class-editor-header">
				<div className="motto-class-editor-title">
					{editingClassLabel
						? `${__("Edit class", "motto-blocks")} .${editingClassLabel}`
						: __("Edit class", "motto-blocks")}
				</div>
				<div className="motto-class-editor-actions">
					<Button
						variant="tertiary"
						className="motto-ui-button is-icon-only motto-class-editor-close"
						onClick={cancelEditingClass}
						disabled={isSavingEditingClass}
						aria-label={__("Cancel", "motto-blocks")}
						title={__("Cancel", "motto-blocks")}
					>
						<X size={16} aria-hidden="true" />
					</Button>
					<Button
						variant="secondary"
						className="motto-ui-button is-icon-only"
						onClick={closeEditingClass}
						disabled={isSavingEditingClass}
						aria-label={__("Save", "motto-blocks")}
						title={__("Save", "motto-blocks")}
					>
						<Check size={16} aria-hidden="true" />
					</Button>
				</div>
			</div>
			<div className="motto-class-editor-content">
				{isSavingEditingClass ? (
					<div className="motto-class-editor-save-progress">
						<ProgressBar
							value={editingClassSaveProgress}
							className="motto-class-editor-save-progress-control"
						/>
					</div>
				) : null}
				{!editingClassDraft && !editingClassRecord ? (
					<div className="motto-class-editor-loading">
						<Spinner />
						<span>{__("Loading class…", "motto-blocks")}</span>
					</div>
				) : (
					<>
						<div className="motto-panel-section motto-class-editor-section">
							<StylerCssList
								key={mode}
								mode={mode}
								rows={editingClassMottoStyler?.css?.[mode] || []}
								onRowsChange={(nextRows) => {
									updateEditingClassMottoStyler((current) => ({
										css: {
											...(current?.css || {}),
											[mode]: Array.isArray(nextRows) ? nextRows : [],
										},
									}));
								}}
								cssByBreakpoint={editingClassMottoStyler?.css}
								onCssByBreakpointChange={handleCssByBreakpointChange}
								popupScope={mainPopupScope}
								blockSpacingEnabled={shouldWarnForBlockSpacingConflicts}
							/>
							<div className="motto-notice motto-class-editor-warning">
								<CircleAlert className="motto-notice-icon"></CircleAlert>
								<p className="motto-notice-text">
									{__(
										"Changes here apply to all instances using this class.",
										"motto-blocks"
									)}
								</p>
							</div>
						</div>
						<div className="motto-panel-section motto-class-editor-section">
							<BlockSelectorsList
								mode={mode}
								mottoStyler={editingClassMottoStyler}
								updateMottoStyler={updateEditingClassMottoStyler}
								title={__("Class Selectors", "motto-blocks")}
								popupScope={selectorPopupScope}
							/>
						</div>
						<div className="motto-panel-section motto-class-editor-section">
							{applyFilters(STYLER_HOOKS.blockSpacingSection, null, {
								mode,
								blockSpacing: editingClassMottoStyler?.blockSpacing,
								cssByBreakpoint: editingClassMottoStyler?.css,
								onChange: (nextBlockSpacing) => {
									updateEditingClassMottoStyler((current) => ({
										blockSpacing:
											typeof nextBlockSpacing === "function"
												? nextBlockSpacing(current?.blockSpacing || {})
												: nextBlockSpacing,
									}));
								},
							}) ?? (
								<ProFeatureCta
									featureId={STYLER_FEATURE_IDS.blockSpacing}
									title={__("Block Spacing", "motto-blocks")}
									description={__(
										"Unlock custom spacing controls in MottoBlocks Pro.",
										"motto-blocks"
									)}
									buttonLabel={__("Get Pro", "motto-blocks")}
								/>
							)}
						</div>
					</>
				)}
			</div>
		</div>
	);
}
