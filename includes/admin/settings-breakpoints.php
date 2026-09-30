<?php

if (! defined('ABSPATH')) {
	exit;
}

/**
 * Save breakpoint settings.
 *
 * @return void
 */
function motto_styler_handle_save_breakpoints() {
	motto_styler_verify_admin_request( 'motto_styler_save_breakpoints' );

	$raw_rows = isset($_POST['motto_breakpoint_rows']) && is_array($_POST['motto_breakpoint_rows'])
		? wp_unslash($_POST['motto_breakpoint_rows'])
		: array();

	$editable_keys = array('tablet', 'landscapePhone', 'phone');
	foreach ($editable_keys as $key) {
		$raw_entry = isset($raw_rows[$key]) && is_array($raw_rows[$key]) ? $raw_rows[$key] : array();
		$raw_width = isset($raw_entry['maxWidth']) ? $raw_entry['maxWidth'] : null;
		$width     = is_numeric($raw_width) ? (float) $raw_width : 0;

		if ($width <= 0) {
			$redirect = motto_styler_get_settings_page_url(
				'styler',
				array(
					'styler_tab' => 'breakpoints',
					'notice'     => 'breakpoints-invalid',
				)
			);
			wp_safe_redirect($redirect);
			exit;
		}
	}

	$sanitized = function_exists('motto_styler_sanitize_breakpoint_overrides')
		? motto_styler_sanitize_breakpoint_overrides($raw_rows)
		: array();

	$is_valid_order = function_exists('motto_styler_has_valid_breakpoint_width_order')
		? motto_styler_has_valid_breakpoint_width_order($sanitized)
		: true;

	if (! $is_valid_order) {
		$redirect = motto_styler_get_settings_page_url(
			'styler',
			array(
				'styler_tab' => 'breakpoints',
				'notice'     => 'breakpoints-invalid',
			)
		);
		wp_safe_redirect($redirect);
		exit;
	}

	update_option('motto_styler_breakpoint_overrides', $sanitized, false);

	if (function_exists('motto_styler_invalidate_frontend_cache_for_breakpoint_change')) {
		motto_styler_invalidate_frontend_cache_for_breakpoint_change();
	} elseif (function_exists('motto_styler_refresh_frontend_cache_for_breakpoint_change')) {
		motto_styler_refresh_frontend_cache_for_breakpoint_change();
	}

	$redirect = motto_styler_get_settings_page_url(
		'styler',
		array(
			'styler_tab' => 'breakpoints',
			'notice'     => 'breakpoints-saved',
		)
	);

	wp_safe_redirect($redirect);
	exit;
}
add_action('admin_post_motto_styler_save_breakpoints', 'motto_styler_handle_save_breakpoints');
