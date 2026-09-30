<?php

/**
 * MottoBlocks admin settings pages.
 */

if (! defined('ABSPATH')) {
	exit;
}

require_once __DIR__ . '/admin/legacy-assistant.php';
require_once __DIR__ . '/admin/settings-api.php';
require_once __DIR__ . '/admin/settings-css-variables.php';
require_once __DIR__ . '/admin/settings-breakpoints.php';
require_once __DIR__ . '/admin/settings-cache.php';
require_once __DIR__ . '/admin/settings-target-blocks.php';
require_once __DIR__ . '/admin/settings-classes.php';
require_once __DIR__ . '/admin/admin-setup.php';
require_once __DIR__ . '/admin/render-tabs.php';

function motto_styler_verify_admin_request( $nonce_action ) {
	if ( ! current_user_can( 'manage_options' ) ) {
		wp_die( esc_html__( 'You do not have permission to update these settings.', 'motto-blocks' ) );
	}
	check_admin_referer( $nonce_action );
}

/**
 * Group registered blocks by namespace.
 *
 * @return array<string,array<int,array{name:string,title:string}>>
 */
function motto_styler_get_registered_blocks_by_namespace() {
	$registry = WP_Block_Type_Registry::get_instance();
	$all      = $registry->get_all_registered();
	$groups   = array();

	foreach ($all as $block_name => $block_type) {
		$block_name = strtolower(trim((string) $block_name));
		if ($block_name === '' || strpos($block_name, '/') === false) {
			continue;
		}

		// Skip child blocks — they are auto-managed by their parent.
		if (! empty($block_type->parent)) {
			continue;
		}

		$title = isset($block_type->title) && '' !== $block_type->title
			? $block_type->title
			: $block_name;

		list($namespace) = explode('/', $block_name, 2);
		if (! isset($groups[$namespace])) {
			$groups[$namespace] = array();
		}
		$groups[$namespace][] = array(
			'name'  => $block_name,
			'title' => $title,
		);
	}

	ksort($groups, SORT_NATURAL | SORT_FLAG_CASE);
	foreach ($groups as $namespace => $blocks) {
		usort($blocks, static function ($a, $b) {
			return strnatcasecmp($a['title'], $b['title']);
		});
		$groups[$namespace] = $blocks;
	}

	return $groups;
}

/**
 * Return admin tabs.
 *
 * @return array<string,string>
 */
function motto_styler_get_admin_tabs() {
	return apply_filters( 'motto_blocks_admin_tabs', array(
		'general'    => __('General', 'motto-blocks'),
		'blocks'     => __('Blocks', 'motto-blocks'),
		'styler'     => __('Styler', 'motto-blocks'),
		'api'        => __('API', 'motto-blocks'),
	) );
}

/**
 * Resolve active admin tab.
 *
 * @return string
 */
function motto_styler_get_admin_active_tab() {
	$tabs = motto_styler_get_admin_tabs();
	$tab  = isset($_GET['tab']) ? sanitize_key(wp_unslash($_GET['tab'])) : 'general';
	if ('classes' === $tab || 'variables' === $tab || 'targeting' === $tab) {
		$tab = 'styler';
	}

	return isset($tabs[$tab]) ? $tab : 'general';
}

/**
 * Resolve active MottoStyler sub-tab.
 *
 * @return string
 */
function motto_styler_get_admin_active_styler_tab() {
	$legacy_tab = isset($_GET['tab']) ? sanitize_key(wp_unslash($_GET['tab'])) : '';
	if ('classes' === $legacy_tab || 'variables' === $legacy_tab) {
		return $legacy_tab;
	}
	if ('targeting' === $legacy_tab) {
		return 'target';
	}

	$sub_tab = isset($_GET['styler_tab']) ? sanitize_key(wp_unslash($_GET['styler_tab'])) : 'classes';
	if (! in_array($sub_tab, array('classes', 'variables', 'breakpoints', 'target', 'cache'), true)) {
		return 'classes';
	}

	return $sub_tab;
}

/**
 * Build settings page URL.
 *
 * @param string               $tab   Target tab slug.
 * @param array<string,string> $extra Extra query args.
 * @return string
 */
function motto_styler_get_settings_page_url($tab = 'general', array $extra = array()) {
	$args = array_merge(
		array(
			'page' => 'motto-blocks-settings',
		),
		$extra
	);

	if ($tab !== 'general') {
		$args['tab'] = $tab;
	}

	return add_query_arg($args, admin_url('admin.php'));
}

/**
 * Render settings-page notice from query args.
 *
 * @return void
 */
function motto_styler_render_admin_notice() {
	$notice = isset($_GET['notice']) ? sanitize_key(wp_unslash($_GET['notice'])) : '';

	if (isset($_GET['updated']) && $notice === '') {
		$notice = 'target-saved';
	}

	$notices = array(
		'target-saved'         => array('class' => 'notice-success', 'message' => __('Settings saved.', 'motto-blocks')),
		'blocks-saved'         => array('class' => 'notice-success', 'message' => __('Block settings updated.', 'motto-blocks')),
		'css-variables-saved'  => array('class' => 'notice-success', 'message' => __('CSS variables updated.', 'motto-blocks')),
		'breakpoints-saved'    => array('class' => 'notice-success', 'message' => ''),
		'breakpoints-invalid'  => array('class' => 'notice-error', 'message' => __('Breakpoint widths must descend from tablet to landscape/phone to phone.', 'motto-blocks')),
		'cache-rebuilt'        => array('class' => 'notice-success', 'message' => ''),
		'api-saved'            => array('class' => 'notice-success', 'message' => __('API settings updated.', 'motto-blocks')),
		// 'css-saved' is redirected to by Pro's Custom CSS tab (pro/includes/admin/settings-custom-css.php) — kept
		// here since this shared notice list has no Free/Pro split of its own, unlike the tabs array.
		'css-saved'            => array('class' => 'notice-success', 'message' => __('Custom CSS updated.', 'motto-blocks')),
	);

	if (! isset($notices[$notice])) {
		return;
	}

	$entry = $notices[$notice];
	if ($notice === 'breakpoints-saved') {
		$cache_tab_url = motto_styler_get_settings_page_url('styler', array('styler_tab' => 'cache'));
		$entry['message'] = sprintf(
			/* translators: %s: URL to the Cache tab */
			__('Breakpoints updated. Cached styles were invalidated and will rebuild as visitors reach each page; visit the <a href="%s">Cache</a> tab to rebuild them all at once.', 'motto-blocks'),
			esc_url($cache_tab_url)
		);
	} elseif ($notice === 'cache-rebuilt') {
		$scanned = isset($_GET['rebuild_scanned']) ? max(0, (int) wp_unslash($_GET['rebuild_scanned'])) : 0;
		$rebuilt = isset($_GET['rebuild_rebuilt']) ? max(0, (int) wp_unslash($_GET['rebuild_rebuilt'])) : 0;
		$invalidated = isset($_GET['rebuild_invalidated']) ? max(0, (int) wp_unslash($_GET['rebuild_invalidated'])) : 0;
		$skipped = isset($_GET['rebuild_skipped']) ? max(0, (int) wp_unslash($_GET['rebuild_skipped'])) : 0;
		$entry['message'] = motto_styler_format_frontend_cache_rebuild_summary(
			array(
				'scanned' => $scanned,
				'rebuilt' => $rebuilt,
				'invalidated' => $invalidated,
				'skipped' => $skipped,
			)
		);
	}
?>
	<div class="notice <?php echo esc_attr($entry['class']); ?> is-dismissible">
		<p><?php echo wp_kses_post($entry['message']); ?></p>
	</div>
<?php
}

/**
 * Get MottoBlocks logo URL for admin screens.
 *
 * @param string $slug Branding SVG file name without extension.
 * @return string
 */
function motto_styler_get_admin_logo_url($slug = 'mottoblocks-logo') {
	return defined('MOTTO_BLOCKS_URL')
		? MOTTO_BLOCKS_URL . 'assets/images/branding/' . $slug . '.svg'
		: '';
}

/**
 * Render MottoBlocks admin logo image when available.
 *
 * @param string $class_name Optional CSS class name.
 * @param string $slug       Branding SVG file name without extension.
 * @return void
 */
function motto_styler_render_admin_logo($class_name = '', $slug = 'mottoblocks-logo') {
	$logo_url = motto_styler_get_admin_logo_url($slug);
	if ($logo_url === '') {
		return;
	}
?>
	<img
		src="<?php echo esc_url($logo_url); ?>"
		alt="<?php echo esc_attr__('Motto Blocks logo', 'motto-blocks'); ?>"
		class="<?php echo esc_attr($class_name); ?> motto-blocks-logo" />
<?php
}
