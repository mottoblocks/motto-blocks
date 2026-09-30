import { Button, Icon } from "@wordpress/components";
import { iconLink, iconLinkOff } from "../utils/core-icon-nodes.jsx";

/**
 * Link/unlink toggle shared by SpacingControl (sides) and BorderRadiusControl
 * (corners). Labels stay as separate translatable strings per caller so i18n
 * extraction keeps seeing literal `__()` calls.
 */
export const LinkToggleButton = ({ isLinked, linkedLabel, unlinkedLabel, className, onClick }) => (
	<Button
		variant="tertiary"
		className={`motto-ui-button is-icon-only${className ? ` ${className}` : ""}`}
		aria-label={isLinked ? unlinkedLabel : linkedLabel}
		title={isLinked ? unlinkedLabel : linkedLabel}
		onClick={onClick}
	>
		<Icon icon={isLinked ? iconLinkOff : iconLink} size={18} />
	</Button>
);
