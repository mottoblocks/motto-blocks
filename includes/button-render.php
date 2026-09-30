<?php
/**
 * motto/button render extension: Free-owned data hook for a dynamic link.
 * See docs/specs/SDD-031 §5.3.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Splice a resolved dynamic link into a rendered motto/button's <a> href.
 *
 * @param string $html Rendered block HTML.
 * @param string $url  Resolved link URL (already validated non-empty).
 * @return string
 */
function motto_blocks_apply_button_link_override( $html, $url ) {
	if ( class_exists( 'WP_HTML_Tag_Processor' ) ) {
		$processor = new WP_HTML_Tag_Processor( $html );
		if ( $processor->next_tag( 'a' ) ) {
			$processor->set_attribute( 'href', $url );
			return $processor->get_updated_html();
		}
	}

	return preg_replace(
		'/(<a\b[^>]*)\bhref="[^"]*"/i',
		'$1href="' . esc_url( $url ) . '"',
		$html,
		1
	);
}

add_filter(
	'render_block_motto/button',
	function ( $html, $parsed_block, $block_instance ) {
		$attrs = isset( $parsed_block['attrs'] ) && is_array( $parsed_block['attrs'] ) ? $parsed_block['attrs'] : array();
		$url   = apply_filters( MOTTO_HOOK_BUTTON_LINK, null, $attrs, $block_instance );
		$url   = is_string( $url ) ? trim( $url ) : '';

		if ( '' === $url ) {
			return $html;
		}

		return motto_blocks_apply_button_link_override( $html, $url );
	},
	10,
	3
);
