import { Button } from "@wordpress/components";
import { __ } from "@wordpress/i18n";
import { applyFilters } from "@wordpress/hooks";
import { STYLER_HOOKS } from "@lib/freepro-ids.js";
import { Rocket } from "lucide-react";

const DEFAULT_UPGRADE_URL = "https://mottoblocks.com/pro";

export function ProFeatureCta({
	featureId = "",
	title = "",
	description = "",
	buttonLabel = "",
	href = "",
}) {
	const resolvedHref = String(
		applyFilters(STYLER_HOOKS.proCtaUrl, href || DEFAULT_UPGRADE_URL, { featureId }) || ""
	).trim();

	const resolvedTitle = title || __("Pro feature", "motto-blocks");
	const resolvedDescription =
		description || __("Unlock this feature in Motto Blocks Pro.", "motto-blocks");
	const resolvedButtonLabel = buttonLabel || __("Get Pro", "motto-blocks");

	return (
		<div className="motto-pro-cta">
			<p className="motto-pro-cta__text">
				<strong>{resolvedTitle}</strong> — {resolvedDescription}
			</p>
			{resolvedHref ? (
				<Button
					className="motto-pro-cta__button"
					variant="secondary"
					href={resolvedHref}
					target="_blank"
					rel="noreferrer"
				>
					{resolvedButtonLabel}
					<Rocket size={16} />
				</Button>
			) : null}
		</div>
	);
}
