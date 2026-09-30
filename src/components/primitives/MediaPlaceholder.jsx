import { MediaPlaceholder as WPMediaPlaceholder } from "@wordpress/block-editor";

export const MediaPlaceholder = ({
	isVisible = true,
	onSelect,
	onSelectURL,
	accept = "image/*",
	allowedTypes = ["image"],
	multiple = false,
	labels,
}) => {
	if (!isVisible) return null;

	return (
		<WPMediaPlaceholder
			onSelect={onSelect}
			onSelectURL={onSelectURL}
			accept={accept}
			allowedTypes={allowedTypes}
			multiple={multiple}
			labels={labels}
		/>
	);
};
