<?php

if (! defined('ABSPATH')) {
	exit;
}

/**
 * Build a normalized CSS variable row payload for the admin table.
 *
 * @param int $post_id Variable post ID.
 * @return array<string,mixed>|null
 */
function motto_styler_get_css_variable_row_payload($post_id) {
	$post_id = (int) $post_id;
	if ($post_id <= 0) {
		return null;
	}

	$post = get_post($post_id);
	if (! $post || $post->post_type !== 'motto_css_variable') {
		return null;
	}

	$raw_label = isset($post->post_title) ? (string) $post->post_title : '';
	$raw_name  = get_post_meta($post_id, 'motto_variable_name', true);
	$raw_value = get_post_meta($post_id, 'motto_variable_value', true);

	if ('' === trim((string) $raw_name)) {
		$raw_name = $raw_label;
	}

	$slug = function_exists('motto_styler_normalize_css_variable_name')
		? motto_styler_normalize_css_variable_name($raw_name)
		: trim((string) $raw_name);
	$value      = is_scalar($raw_value) ? (string) $raw_value : '';
	$delete_url = get_delete_post_link($post_id);

	return array(
		'postId'    => $post_id,
		'label'     => $raw_label,
		'slug'      => $slug,
		'value'     => $value,
		'menuOrder' => isset($post->menu_order) ? (int) $post->menu_order : 0,
		'deleteUrl' => is_string($delete_url) ? $delete_url : '',
	);
}

/**
 * Update menu order for CSS variable rows.
 *
 * @param array<mixed> $order_rows Raw posted order map.
 * @return void
 */
function motto_styler_update_css_variable_order_rows($order_rows) {
	if (! is_array($order_rows) || empty($order_rows)) {
		return;
	}

	foreach ($order_rows as $post_id_raw => $order_raw) {
		$post_id = (int) $post_id_raw;
		if ($post_id <= 0 || ! current_user_can('edit_post', $post_id)) {
			continue;
		}

		$post = get_post($post_id);
		if (! $post || $post->post_type !== 'motto_css_variable') {
			continue;
		}

		$menu_order = max(0, (int) $order_raw);
		wp_update_post(
			array(
				'ID'         => $post_id,
				'menu_order' => $menu_order,
			)
		);
	}
}

/**
 * Save a single CSS variable row payload.
 *
 * @param string       $row_key    Posted row key.
 * @param array<mixed> $row        Raw row payload.
 * @param array<mixed> $order_rows Optional raw order values.
 * @return array<string,mixed>|WP_Error
 */
function motto_styler_save_css_variable_row_payload($row_key, $row, $order_rows = array()) {
	$row_key = sanitize_text_field((string) $row_key);
	if ($row_key === '') {
		return new WP_Error('motto_styler_invalid_row_key', __('Invalid CSS variable row.', 'motto-blocks'));
	}

	if (! is_array($row)) {
		return new WP_Error('motto_styler_invalid_row_payload', __('Invalid CSS variable payload.', 'motto-blocks'));
	}

	$label = isset($row['label']) ? sanitize_text_field((string) $row['label']) : '';
	$slug  = isset($row['slug']) ? motto_styler_normalize_css_variable_name((string) $row['slug']) : '';
	$value = isset($row['value']) ? (string) $row['value'] : '';
	$value = function_exists('motto_styler_sanitize_css_value')
		? motto_styler_sanitize_css_value($value)
		: trim($value);

	if ($label === '') {
		$label = $slug !== '' ? ltrim($slug, '-') : '';
	}

	if ($slug === '') {
		$slug = $label !== '' ? motto_styler_normalize_css_variable_name($label) : '';
	}

	$post_id = (int) $row_key;
	$post    = $post_id > 0 ? get_post($post_id) : null;

	if ($post_id > 0) {
		if (! current_user_can('edit_post', $post_id)) {
			return new WP_Error('motto_styler_cannot_edit_variable', __('You do not have permission to edit this CSS variable.', 'motto-blocks'));
		}
		if (! $post || $post->post_type !== 'motto_css_variable') {
			return new WP_Error('motto_styler_missing_variable', __('The requested CSS variable could not be found.', 'motto-blocks'));
		}
	} else {
		if (! function_exists('motto_blocks_can_manage_styler_library') || ! motto_blocks_can_manage_styler_library()) {
			return new WP_Error('motto_styler_cannot_create_variable', __('You do not have permission to create CSS variables.', 'motto-blocks'));
		}

		$menu_order = isset($order_rows[$row_key]) ? max(0, (int) $order_rows[$row_key]) : 0;
		$seed_title = $label !== '' ? $label : ($slug !== '' ? ltrim($slug, '-') : __('New Variable', 'motto-blocks'));
		$post_id    = wp_insert_post(
			array(
				'post_type'   => 'motto_css_variable',
				'post_status' => 'publish',
				'post_title'  => $seed_title,
				'menu_order'  => $menu_order,
			),
			true
		);

		if (is_wp_error($post_id) || (int) $post_id <= 0) {
			return new WP_Error('motto_styler_variable_insert_failed', __('The CSS variable could not be created.', 'motto-blocks'));
		}

		$post_id = (int) $post_id;
		$post    = get_post($post_id);
	}

	if ($post && $label !== '' && $label !== $post->post_title) {
		wp_update_post(
			array(
				'ID'         => $post_id,
				'post_title' => $label,
			)
		);
	}

	if (isset($order_rows[$row_key]) || isset($order_rows[(string) $post_id])) {
		$menu_order = isset($order_rows[$row_key]) ? $order_rows[$row_key] : $order_rows[(string) $post_id];
		wp_update_post(
			array(
				'ID'         => $post_id,
				'menu_order' => max(0, (int) $menu_order),
			)
		);
	}

	if ($slug !== '') {
		update_post_meta($post_id, 'motto_variable_name', $slug);
	}

	update_post_meta($post_id, 'motto_variable_value', $value);

	$payload = motto_styler_get_css_variable_row_payload($post_id);
	if (! is_array($payload)) {
		return new WP_Error('motto_styler_variable_payload_missing', __('The saved CSS variable could not be loaded.', 'motto-blocks'));
	}

	return $payload;
}

/**
 * Save inline CSS variable table values from Settings page.
 *
 * @return void
 */
function motto_styler_handle_save_css_variables() {
	motto_styler_verify_admin_request( 'motto_styler_save_css_variables' );

	$rows = isset($_POST['motto_variable_rows']) && is_array($_POST['motto_variable_rows'])
		? wp_unslash($_POST['motto_variable_rows'])
		: array();
	$order_rows = isset($_POST['motto_variable_order']) && is_array($_POST['motto_variable_order'])
		? wp_unslash($_POST['motto_variable_order'])
		: array();
	$target_row_key = isset($_POST['motto_variable_row_target']) ? sanitize_text_field((string) wp_unslash($_POST['motto_variable_row_target'])) : '';

	motto_styler_update_css_variable_order_rows($order_rows);

	if (! empty($rows)) {
		foreach ($rows as $row_key_raw => $row) {
			$row_key = sanitize_text_field((string) $row_key_raw);
			if ($target_row_key !== '' && $row_key !== $target_row_key) {
				continue;
			}
			if (! is_array($row)) {
				continue;
			}

			$saved_row = motto_styler_save_css_variable_row_payload($row_key, $row, $order_rows);
			if (is_wp_error($saved_row)) {
				continue;
			}
		}
	}

	$redirect = motto_styler_get_settings_page_url(
		'styler',
		array(
			'styler_tab' => 'variables',
			'notice'     => 'css-variables-saved',
		)
	);

	wp_safe_redirect($redirect);
	exit;
}
add_action('admin_post_motto_styler_save_css_variables', 'motto_styler_handle_save_css_variables');

/**
 * Save a single CSS variable row over AJAX.
 *
 * @return void
 */
function motto_styler_handle_ajax_save_css_variable_row() {
	if (! current_user_can('manage_options')) {
		wp_send_json_error(
			array(
				'message' => __('You do not have permission to update these settings.', 'motto-blocks'),
			),
			403
		);
	}

	check_ajax_referer('motto_styler_save_css_variables');

	$row_key = isset($_POST['row_key']) ? sanitize_text_field((string) wp_unslash($_POST['row_key'])) : '';
	$row     = isset($_POST['row']) && is_array($_POST['row'])
		? wp_unslash($_POST['row'])
		: array();
	$order_rows = isset($_POST['order_rows']) && is_array($_POST['order_rows'])
		? wp_unslash($_POST['order_rows'])
		: array();

	if ($row_key === '') {
		wp_send_json_error(
			array(
				'message' => __('Invalid CSS variable row.', 'motto-blocks'),
			),
			400
		);
	}

	motto_styler_update_css_variable_order_rows($order_rows);
	$saved_row = motto_styler_save_css_variable_row_payload($row_key, $row, $order_rows);

	if (is_wp_error($saved_row)) {
		wp_send_json_error(
			array(
				'message' => $saved_row->get_error_message(),
			),
			400
		);
	}

	wp_send_json_success(
		array(
			'message' => __('CSS variable saved.', 'motto-blocks'),
			'row'     => $saved_row,
		)
	);
}
add_action('wp_ajax_motto_styler_save_css_variable_row', 'motto_styler_handle_ajax_save_css_variable_row');
