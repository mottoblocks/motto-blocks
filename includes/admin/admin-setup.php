<?php

if (! defined('ABSPATH')) {
	exit;
}

/**
 * Register admin menu for MottoBlocks settings.
 *
 * @return void
 */
function motto_styler_register_admin_menu() {
	$capability = 'manage_options';
	$slug       = 'motto-blocks-settings';
	$icon       = function_exists('motto_styler_get_cpt_menu_icon') ? motto_styler_get_cpt_menu_icon() : 'dashicons-admin-generic';

	add_menu_page(
		__('Motto Blocks', 'motto-blocks'),
		__('Motto Blocks', 'motto-blocks'),
		$capability,
		$slug,
		'motto_styler_render_settings_page',
		$icon,
		58
	);

	foreach (motto_styler_get_admin_tabs() as $tab_slug => $tab_label) {
		$tab_slug = sanitize_key($tab_slug);
		if ('' === $tab_slug) {
			continue;
		}

		add_submenu_page(
			$slug,
			$tab_label,
			$tab_label,
			$capability,
			'general' === $tab_slug ? $slug : $slug . '&tab=' . $tab_slug,
			'motto_styler_render_settings_page'
		);
	}
}
add_action('admin_menu', 'motto_styler_register_admin_menu');

/**
 * Enqueue a plain admin JS file from assets/js/, versioned by filemtime.
 *
 * @param string $handle   Script handle.
 * @param string $filename File name under assets/js/.
 * @return void
 */
function motto_styler_enqueue_admin_tab_script($handle, $filename) {
	$file_path = defined('MOTTO_BLOCKS_DIR') ? MOTTO_BLOCKS_DIR . 'assets/js/' . $filename : '';
	$file_url  = defined('MOTTO_BLOCKS_URL') ? MOTTO_BLOCKS_URL . 'assets/js/' . $filename : '';

	if ($file_path === '' || $file_url === '' || ! file_exists($file_path)) {
		return;
	}

	wp_enqueue_script($handle, $file_url, array(), filemtime($file_path), true);
}

/**
 * Enqueue styles only for MottoBlocks settings page.
 *
 * @param string $hook_suffix Current admin page hook suffix.
 * @return void
 */
function motto_styler_enqueue_admin_settings_assets($hook_suffix) {
	if ($hook_suffix !== 'toplevel_page_motto-blocks-settings') {
		return;
	}

	$css_path = defined('MOTTO_BLOCKS_DIR') ? MOTTO_BLOCKS_DIR . 'assets/css/styler/motto-admin-settings.css' : '';
	$css_url  = defined('MOTTO_BLOCKS_URL') ? MOTTO_BLOCKS_URL . 'assets/css/styler/motto-admin-settings.css' : '';

	if ($css_path === '' || $css_url === '' || ! file_exists($css_path)) {
		return;
	}

	wp_enqueue_style(
		'motto-styler-admin-settings',
		$css_url,
		array(),
		filemtime($css_path)
	);

	$active_tab        = motto_styler_get_admin_active_tab();
	$active_style_tab  = motto_styler_get_admin_active_styler_tab();
	$is_classes_tab = ('classes' === $active_tab) || ('styler' === $active_tab && 'classes' === $active_style_tab);
	if ($is_classes_tab) {
		$preview_css         = motto_styler_build_admin_classes_preview_css();
		$core_variables_css  = motto_styler_get_admin_gutenberg_core_variables_css();
		$motto_variables_css = motto_styler_get_admin_motto_cpt_variables_css();
		$inline_css          = $core_variables_css . $motto_variables_css . $preview_css;
		if ($inline_css !== '') {
			wp_add_inline_style('motto-styler-admin-settings', $inline_css);
		}
	}

	if ('blocks' === $active_tab) {
		motto_styler_enqueue_admin_tab_script('motto-blocks-admin-blocks-tab', 'admin-blocks-tab.js');
	}

	if ('styler' === $active_tab) {
		motto_styler_enqueue_admin_tab_script('motto-blocks-admin-legacy-assistant-tab', 'admin-legacy-assistant-tab.js');

		if ($is_classes_tab) {
			motto_styler_enqueue_admin_tab_script('motto-blocks-admin-classes-tab', 'admin-classes-tab.js');
		} elseif ('variables' === $active_style_tab) {
			motto_styler_enqueue_admin_tab_script('motto-blocks-admin-variables-tab', 'admin-variables-tab.js');
		} elseif ('target' === $active_style_tab) {
			motto_styler_enqueue_admin_tab_script('motto-blocks-admin-target-blocks-tab', 'admin-target-blocks-tab.js');
		} elseif ('cache' === $active_style_tab) {
			motto_styler_enqueue_admin_tab_script('motto-blocks-admin-cache-tab', 'admin-cache-tab.js');
		}
	}
}
add_action('admin_enqueue_scripts', 'motto_styler_enqueue_admin_settings_assets');

/**
 * Enqueue the CSS Variable meta box's duplicate-name-check script.
 *
 * @param string $hook_suffix Current admin page hook suffix.
 * @return void
 */
function motto_styler_enqueue_css_variable_meta_box_script($hook_suffix) {
	if (! in_array($hook_suffix, array('post.php', 'post-new.php'), true)) {
		return;
	}

	$screen = get_current_screen();
	if (! $screen || 'motto_css_variable' !== $screen->post_type) {
		return;
	}

	motto_styler_enqueue_admin_tab_script('motto-blocks-admin-css-variable-meta-box', 'admin-css-variable-meta-box.js');
}
add_action('admin_enqueue_scripts', 'motto_styler_enqueue_css_variable_meta_box_script');

/**
 * Get Gutenberg core variables stylesheet for admin previews.
 *
 * @return string
 */
function motto_styler_get_admin_gutenberg_core_variables_css() {
	if (! function_exists('wp_get_global_stylesheet')) {
		return '';
	}

	$css = wp_get_global_stylesheet(array('variables'));
	return is_string($css) ? trim($css) : '';
}

/**
 * Get Motto CPT variable rules for admin previews.
 *
 * @return string
 */
function motto_styler_get_admin_motto_cpt_variables_css() {
	if (! function_exists('motto_styler_build_css_variables_rules')) {
		return '';
	}

	$css = motto_styler_build_css_variables_rules();
	return is_string($css) ? trim($css) : '';
}

/**
 * Build class preview CSS for the Classes settings tab cards.
 *
 * @return string
 */
function motto_styler_build_admin_classes_preview_css() {
	$posts = get_posts(
		array(
			'post_type'        => 'motto_css_class',
			'post_status'      => array('publish', 'draft', 'pending', 'private', 'future'),
			'numberposts'      => 200,
			'orderby'          => 'name',
			'order'            => 'ASC',
			'suppress_filters' => false,
		)
	);

	if (empty($posts)) {
		return '';
	}

	$css = '';
	foreach ($posts as $post) {
		$slug = isset($post->post_name) ? sanitize_html_class((string) $post->post_name) : '';
		if ($slug === '') {
			continue;
		}

		$motto_styler = function_exists('motto_styler_get_css_class_meta_value')
			? motto_styler_get_css_class_meta_value((int) $post->ID)
			: get_post_meta((int) $post->ID, 'motto_styler', true);
		if (! is_array($motto_styler) || empty($motto_styler)) {
			continue;
		}

		$selector = ':where(.motto-admin-card--class).' . $slug;
		$css     .= motto_styler_build_block_css($selector, $motto_styler);
	}

	return $css;
}
