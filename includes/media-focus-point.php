<?php
/**
 * Expose the per-attachment focus point set by the "Media Focus Point" plugin
 * (postmeta `bg_pos_desktop`, e.g. "20% 80%") via REST, so the editor can read
 * it without depending on that plugin's own admin UI. No-op if the meta is
 * absent (plugin not installed or attachment never got a focus point).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

add_action(
	'init',
	function () {
		register_post_meta(
			'attachment',
			'bg_pos_desktop',
			array(
				'type'         => 'string',
				'single'       => true,
				'show_in_rest' => true,
			)
		);
	}
);
