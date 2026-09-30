import { __experimentalVStack as VStack } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { ImageSourceControl, normalizeImageSourceValue } from "./ImageSourceControl.jsx";

export const BackgroundImageControl = ({
	value,
	onChange,
	i18nDomain = "motto-blocks",
	showPreview = false,
	previewAspectRatio = "16 / 9",
	onBeforeOpenMediaModal,
}) => {
	const current = normalizeImageSourceValue(value);
	const emitPatch = (patch) => {
		if (typeof onChange !== "function") return;
		onChange(patch || {});
	};

	return (
		<div className="motto-background-image-control">
			<VStack spacing={3}>
				<ImageSourceControl
					value={current}
					onChange={(nextSource) =>
						emitPatch({
							id: nextSource.id,
							url: nextSource.url,
							alt: nextSource.alt,
							title: nextSource.title,
							width: nextSource.width,
							height: nextSource.height,
						})
					}
					i18nDomain={i18nDomain}
					onBeforeOpenMediaModal={onBeforeOpenMediaModal}
					rootClassName="motto-background-image-control__source"
					labels={{
						placeholderTitle: __("Background image", i18nDomain),
						placeholderInstructions: __(
							"Upload, pick from media library, or paste an image URL.",
							i18nDomain
						),
						urlAriaLabel: __("Background image URL", i18nDomain),
						urlPlaceholder: __("Image URL", i18nDomain),
						replaceButtonLabel: __("Replace image", i18nDomain),
						removeButtonLabel: __("Remove image", i18nDomain),
					}}
					renderAfterUrlRow={({ value: previewValue, hasUrl }) =>
						showPreview && hasUrl ? (
							<div
								className="motto-background-image-control__preview"
								aria-hidden="true"
								style={{
									width: "100%",
									aspectRatio: previewAspectRatio,
									overflow: "hidden",
								}}
							>
								<img
									src={previewValue.url}
									alt=""
									style={{
										display: "block",
										width: "100%",
										height: "100%",
										objectFit: "contain",
									}}
								/>
							</div>
						) : null
					}
				/>
			</VStack>
		</div>
	);
};
