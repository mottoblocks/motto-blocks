import { Notice } from "@wordpress/components";
import { __ } from "@wordpress/i18n";

export function MapPreviewNotice({ settingsUrl }) {
	return (
		<Notice status="warning" isDismissible={false}>
			<p>
				{__(
					"Google Maps API key is missing. Configure it before using this block.",
					"motto-blocks"
				)}
			</p>
			<p>
				<a href={settingsUrl}>{__("Open API settings", "motto-blocks")}</a>
			</p>
		</Notice>
	);
}
