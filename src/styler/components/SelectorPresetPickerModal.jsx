import { Button, Modal, TabPanel } from "@wordpress/components";
import { __ } from "@wordpress/i18n";

export const SelectorPresetPickerModal = ({
	selectorPresetGroups,
	onApplyPreset,
	onRequestClose,
}) => (
	<Modal
		title={__("Block Selector Presets", "motto-blocks")}
		onRequestClose={onRequestClose}
		className="motto-popup motto-presets-popup"
		overlayClassName="motto-popup-overlay"
	>
		<div className="motto-popup-content motto-inner-selector-presets">
			<TabPanel
				className="motto-inner-selector-presets-tabs motto-popup-tabs"
				tabs={selectorPresetGroups.map((group) => ({
					name: group.key,
					title: group.label,
					className: `motto-inner-selector-tab-${group.key}`,
				}))}
			>
				{(tab) => {
					const activeGroup = selectorPresetGroups.find(
						(group) => group.key === tab.name
					);
					if (!activeGroup) return null;
					return (
						<div className="motto-presets-list motto-inner-selector-presets-list">
							{activeGroup.items.map((preset) => (
								<Button
									key={`${activeGroup.key}-${preset.label}-${preset.selector}`}
									variant="secondary"
									className="motto-ui-button motto-apply-preset-button"
									aria-label={preset.selector}
									title={preset.selector}
									onClick={() => onApplyPreset(preset)}
								>
									<span className="motto-preset-text">
										<span className="motto-preset-name">{preset.label}</span>
										<span className="motto-preset-description">
											{preset.selector}
										</span>
									</span>
								</Button>
							))}
						</div>
					);
				}}
			</TabPanel>
		</div>
	</Modal>
);
