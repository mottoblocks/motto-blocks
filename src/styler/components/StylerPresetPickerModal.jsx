import { Button, Modal, TabPanel } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { SwatchBook } from "lucide-react";

export const StylerPresetPickerModal = ({
	presetGroups,
	activePresetTab,
	onActiveTabChange,
	presetIconMap,
	onApplyPreset,
	onRequestClose,
}) => (
	<Modal
		title={__("Style Presets", "motto-blocks")}
		onRequestClose={onRequestClose}
		className="motto-popup motto-presets-popup"
		overlayClassName="motto-popup-overlay"
	>
		<div className="motto-popup-content motto-css-presets-row">
			<TabPanel
				className="motto-css-presets-tabs motto-popup-tabs"
				tabs={presetGroups.map((group) => ({
					name: group.key,
					title: group.label,
					className: `motto-preset-tab-${group.key}`,
				}))}
				initialTabName={activePresetTab || presetGroups[0]?.key}
				onSelect={onActiveTabChange}
			>
				{(tab) => {
					const activeGroup = presetGroups.find((group) => group.key === tab.name);
					if (!activeGroup) return null;
					return (
						<div className="motto-presets-list motto-styler-presets-list">
							{activeGroup.items.map((preset) => {
								const iconName =
									typeof preset?.icon === "string" ? preset.icon : "";
								const Icon = presetIconMap[iconName] || SwatchBook;
								const presetLabel = String(
									preset?.label || preset?.name || ""
								).trim();
								return (
									<Button
										key={preset.slug}
										variant="secondary"
										onClick={() => onApplyPreset(preset.slug)}
										className="motto-ui-button motto-apply-preset-button"
									>
										<span className="motto-preset-icon" aria-hidden="true">
											<Icon size={14} />
										</span>
										<span className="motto-preset-text">
											<span className="motto-preset-name">{presetLabel}</span>
											{preset.description ? (
												<span className="motto-preset-description">
													{preset.description}
												</span>
											) : null}
										</span>
									</Button>
								);
							})}
						</div>
					);
				}}
			</TabPanel>
		</div>
	</Modal>
);
