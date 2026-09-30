<?php

if (! defined('ABSPATH')) {
	exit;
}

/**
 * Save target block settings.
 *
 * @return void
 */
function motto_styler_handle_save_target_blocks() {
	motto_styler_verify_admin_request( 'motto_styler_save_target_blocks' );

	$apply_all = ! empty($_POST['apply_all_blocks']);
	$raw_namespaces = isset($_POST['target_namespaces']) && is_array($_POST['target_namespaces'])
		? wp_unslash($_POST['target_namespaces'])
		: array();
	$raw_blocks = isset($_POST['target_blocks']) && is_array($_POST['target_blocks'])
		? wp_unslash($_POST['target_blocks'])
		: array();

	$targets = array();

	if ($apply_all) {
		$targets = array('all');
	} else {
		$namespaces = array();
		foreach ($raw_namespaces as $namespace) {
			$namespace = sanitize_key((string) $namespace);
			if ($namespace !== '') {
				$namespaces[] = $namespace;
			}
		}
		$namespaces = array_values(array_unique($namespaces));

		$exact_blocks = array();
		foreach ($raw_blocks as $block) {
			$normalized = function_exists('motto_styler_normalize_target_pattern')
				? motto_styler_normalize_target_pattern($block)
				: '';
			if ($normalized === '' || strpos($normalized, '/') === false || substr($normalized, -2) === '/*') {
				continue;
			}

			list($namespace) = explode('/', $normalized, 2);
			if (in_array($namespace, $namespaces, true)) {
				continue;
			}

			$exact_blocks[] = $normalized;
		}
		$exact_blocks = array_values(array_unique($exact_blocks));

		foreach ($namespaces as $namespace) {
			$targets[] = $namespace . '/*';
		}
		$targets = array_merge($targets, $exact_blocks);
	}

	$targets = function_exists('motto_styler_sanitize_target_blocks')
		? motto_styler_sanitize_target_blocks($targets)
		: array();
	if (empty($targets)) {
		$targets = array('all');
	}

	update_option('motto_styler_target_blocks', $targets, false);

	$redirect = motto_styler_get_settings_page_url(
		'styler',
		array(
			'styler_tab' => 'target',
			'notice'     => 'target-saved',
		)
	);

	wp_safe_redirect($redirect);
	exit;
}
add_action('admin_post_motto_styler_save_target_blocks', 'motto_styler_handle_save_target_blocks');

/**
 * Save enabled Motto block settings.
 *
 * @return void
 */
function motto_blocks_handle_save_enabled_blocks() {
	motto_styler_verify_admin_request( 'motto_blocks_save_enabled_blocks' );

	$enable_all = ! empty($_POST['enable_all_blocks']);
	$raw_namespaces = isset($_POST['motto_block_namespaces']) && is_array($_POST['motto_block_namespaces'])
		? wp_unslash($_POST['motto_block_namespaces'])
		: array();
	$raw_blocks = isset($_POST['motto_blocks']) && is_array($_POST['motto_blocks'])
		? wp_unslash($_POST['motto_blocks'])
		: array();

	if ($enable_all) {
		update_option('motto_blocks_enabled_blocks', 'all', false);
		wp_safe_redirect(motto_styler_get_settings_page_url('blocks', array('notice' => 'blocks-saved')));
		exit;
	}

	$definitions = function_exists('motto_blocks_get_available_block_definitions')
		? motto_blocks_get_available_block_definitions()
		: array();
	$enabled = array();

	$selected_namespaces = array();
	foreach ($raw_namespaces as $namespace) {
		$namespace = sanitize_key((string) $namespace);
		if ($namespace !== '') {
			$selected_namespaces[] = $namespace;
		}
	}
	$selected_namespaces = array_values(array_unique($selected_namespaces));

	foreach ($definitions as $block_name => $definition) {
		$namespace = isset($definition['namespace']) ? sanitize_key((string) $definition['namespace']) : '';
		if ($namespace !== '' && in_array($namespace, $selected_namespaces, true)) {
			$enabled[] = $block_name;
		}
	}

	foreach ($raw_blocks as $block_name) {
		$block_name = strtolower(trim((string) $block_name));
		if ($block_name !== '') {
			$enabled[] = $block_name;
		}
	}

	$enabled = function_exists('motto_blocks_sanitize_enabled_blocks')
		? motto_blocks_sanitize_enabled_blocks($enabled)
		: array();

	update_option('motto_blocks_enabled_blocks', $enabled, false);

	$redirect = motto_styler_get_settings_page_url(
		'blocks',
		array(
			'notice' => 'blocks-saved',
		)
	);

	wp_safe_redirect($redirect);
	exit;
}
add_action('admin_post_motto_blocks_save_enabled_blocks', 'motto_blocks_handle_save_enabled_blocks');

/**
 * Parse selected namespaces and block names from target patterns.
 *
 * @param string[] $targets Target patterns.
 * @return array{namespaces:string[],blocks:string[]}
 */
function motto_styler_parse_target_selections(array $targets) {
	$selected_namespaces = array();
	$selected_blocks     = array();

	foreach ($targets as $pattern) {
		$pattern = strtolower(trim((string) $pattern));
		if ($pattern === '' || $pattern === 'all' || $pattern === '*') {
			continue;
		}

		if (substr($pattern, -2) === '/*') {
			$selected_namespaces[] = substr($pattern, 0, -2);
			continue;
		}

		if (strpos($pattern, '/') === false) {
			$selected_namespaces[] = $pattern;
			continue;
		}

		$selected_blocks[] = $pattern;
	}

	return array(
		'namespaces' => array_values(array_unique($selected_namespaces)),
		'blocks'     => array_values(array_unique($selected_blocks)),
	);
}

/**
 * Parse enabled Motto block selections into namespace and block lists.
 *
 * @param string[] $enabled_blocks Enabled block names.
 * @return array{namespaces:string[],blocks:string[]}
 */
function motto_blocks_parse_enabled_selections(array $enabled_blocks) {
	$definitions = function_exists('motto_blocks_get_available_block_definitions_by_namespace')
		? motto_blocks_get_available_block_definitions_by_namespace()
		: array();
	$enabled_lookup = array_fill_keys($enabled_blocks, true);
	$selected_namespaces = array();
	$selected_blocks = array();

	foreach ($definitions as $namespace => $blocks) {
		$namespace_enabled = ! empty($blocks);
		foreach ($blocks as $definition) {
			$block_name = isset($definition['name']) ? strtolower(trim((string) $definition['name'])) : '';
			if ($block_name === '' || empty($enabled_lookup[$block_name])) {
				$namespace_enabled = false;
				break;
			}
		}

		if ($namespace_enabled) {
			$selected_namespaces[] = $namespace;
			continue;
		}

		foreach ($blocks as $definition) {
			$block_name = isset($definition['name']) ? strtolower(trim((string) $definition['name'])) : '';
			if ($block_name !== '' && ! empty($enabled_lookup[$block_name])) {
				$selected_blocks[] = $block_name;
			}
		}
	}

	return array(
		'namespaces' => array_values(array_unique($selected_namespaces)),
		'blocks'     => array_values(array_unique($selected_blocks)),
	);
}

/**
 * Return required target namespaces that cannot be disabled.
 *
 * @return string[]
 */
function motto_styler_get_required_target_namespaces() {
	$required = array();
	$patterns = function_exists('motto_styler_get_required_target_patterns')
		? motto_styler_get_required_target_patterns()
		: array('motto/*');

	if (! is_array($patterns)) {
		$patterns = array();
	}

	foreach ($patterns as $pattern) {
		$normalized = function_exists('motto_styler_normalize_target_pattern')
			? motto_styler_normalize_target_pattern($pattern)
			: '';
		if ($normalized === '' || $normalized === 'all' || $normalized === '*') {
			continue;
		}
		if (substr($normalized, -2) === '/*') {
			$required[] = substr($normalized, 0, -2);
			continue;
		}
		if (strpos($normalized, '/') === false) {
			$required[] = $normalized;
		}
	}

	return array_values(array_unique(array_filter($required)));
}
