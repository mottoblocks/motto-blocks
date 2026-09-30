import { __ } from "@wordpress/i18n";

import { BlockSelectorsList } from "./BlockSelectorsList";

export function SelectorsSection({
	mode,
	mottoStyler,
	updateMottoStyler,
	attributes,
	setAttributes,
	popupScope,
	showResetToDefaults,
	onResetToDefaults,
}) {
	return (
		<div className="motto-panel-section">
			<BlockSelectorsList
				mode={mode}
				mottoStyler={mottoStyler}
				updateMottoStyler={updateMottoStyler}
				attributes={attributes}
				setAttributes={setAttributes}
				title={__("Block selectors", "motto-blocks")}
				popupScope={popupScope}
				showResetToDefaults={showResetToDefaults}
				onResetToDefaults={onResetToDefaults}
			/>
		</div>
	);
}
