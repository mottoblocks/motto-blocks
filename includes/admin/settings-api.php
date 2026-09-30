<?php

if (! defined('ABSPATH')) {
	exit;
}

function motto_styler_update_secret_option_from_post($option_name, $post_field) {
	$existing_value = get_option($option_name, '');
	if (! is_scalar($existing_value)) {
		$existing_value = '';
	}

	$submitted_value = isset($_POST[$post_field])
		? trim((string) wp_unslash($_POST[$post_field]))
		: '';

	$next_value = $submitted_value !== ''
		? sanitize_text_field($submitted_value)
		: (string) $existing_value;

	update_option($option_name, $next_value, false);

	return $next_value;
}

function motto_styler_get_masked_secret_placeholder($secret_value, $empty_placeholder = '') {
	$secret_value = is_scalar($secret_value) ? (string) $secret_value : '';
	if ($secret_value === '') {
		return (string) $empty_placeholder;
	}

	$key_length = function_exists('mb_strlen')
		? (int) mb_strlen($secret_value, 'UTF-8')
		: strlen($secret_value);

	if ($key_length <= 0) {
		return (string) $empty_placeholder;
	}

	if ($key_length <= 4) {
		return str_repeat('*', $key_length);
	}

	$tail = function_exists('mb_substr')
		? (string) mb_substr($secret_value, -4, null, 'UTF-8')
		: substr($secret_value, -4);

	return str_repeat('*', $key_length - 4) . $tail;
}

function motto_styler_handle_save_api_settings() {
	motto_styler_verify_admin_request( 'motto_styler_save_api_settings' );

	motto_styler_update_secret_option_from_post(
		'motto_blocks_google_maps_api_key',
		'motto_blocks_google_maps_api_key'
	);

	$redirect = motto_styler_get_settings_page_url(
		'api',
		array(
			'notice' => 'api-saved',
		)
	);

	wp_safe_redirect($redirect);
	exit;
}
add_action('admin_post_motto_styler_save_api_settings', 'motto_styler_handle_save_api_settings');
