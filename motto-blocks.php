<?php
/**
 * Plugin Name: Motto Blocks
 * Plugin URI: https://mottoblocks.com/
 * Description: Advanced blocks and a reusable styling system for modern WordPress sites.
 * Version: 0.1.1
 * Requires at least: 6.5
 * Requires PHP: 7.4
 * Author: Motto Blocks
 * Author URI: https://sebastianpothe.com/
 * License: GPLv2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: motto-blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'MOTTO_BLOCKS_VERSION', '0.1.1' );
define( 'MOTTO_BLOCKS_FILE', __FILE__ );
define( 'MOTTO_BLOCKS_DIR', plugin_dir_path( MOTTO_BLOCKS_FILE ) );
define( 'MOTTO_BLOCKS_URL', plugin_dir_url( MOTTO_BLOCKS_FILE ) );

require_once MOTTO_BLOCKS_DIR . 'includes/freepro-hooks.php';
require_once MOTTO_BLOCKS_DIR . 'includes/wildcard-registry.php';
require_once MOTTO_BLOCKS_DIR . 'includes/helpers.php';
require_once MOTTO_BLOCKS_DIR . 'includes/styler-helpers.php';
require_once MOTTO_BLOCKS_DIR . 'includes/styler-frontend-responsive.php';
require_once MOTTO_BLOCKS_DIR . 'includes/class-post-type.php';
require_once MOTTO_BLOCKS_DIR . 'includes/motto-settings.php';
require_once MOTTO_BLOCKS_DIR . 'includes/styler-frontend-render.php';
require_once MOTTO_BLOCKS_DIR . 'includes/classic-menu.php';
require_once MOTTO_BLOCKS_DIR . 'includes/assets-frontend-libs.php';
require_once MOTTO_BLOCKS_DIR . 'includes/template-preview.php';
require_once MOTTO_BLOCKS_DIR . 'includes/media-focus-point.php';
require_once MOTTO_BLOCKS_DIR . 'includes/container-render.php';
require_once MOTTO_BLOCKS_DIR . 'includes/button-render.php';
require_once MOTTO_BLOCKS_DIR . 'includes/image-render.php';

/**
 * Register root-level Styler attributes for supported blocks on the server.
 *
 * @param array  $args       Block type args.
 * @param string $block_type Registered block name.
 * @return array
 */
function motto_blocks_register_styler_root_attribute( $args, $block_type ) {
	if ( ! isset( $args['attributes'] ) || ! is_array( $args['attributes'] ) ) {
		$args['attributes'] = array();
	}

	// Always enforce stdClass default. json_decode( '{}', true ) returns [] in PHP,
	// which fails rest_is_object() validation. stdClass passes it correctly.
	if (
		isset( $args['attributes']['mottoStyler'] ) &&
		is_array( $args['attributes']['mottoStyler'] ) &&
		isset( $args['attributes']['mottoStyler']['type'] ) &&
		'object' === $args['attributes']['mottoStyler']['type']
	) {
		$args['attributes']['mottoStyler']['default'] = new stdClass();
	}

	if ( function_exists( 'motto_styler_is_target_block' ) && ! motto_styler_is_target_block( (string) $block_type ) ) {
		return $args;
	}

	$args['attributes']['mottoStyler'] = array(
		'type'    => 'object',
		'default' => new stdClass(),
	);

	return $args;
}
add_filter( 'register_block_type_args', 'motto_blocks_register_styler_root_attribute', 10, 2 );

/**
 * Register shared editor script for all blocks.
 */
function motto_blocks_register_editor_script() {
	$editor_script_file = MOTTO_BLOCKS_DIR . 'build/motto-blocks.js';

	if ( ! file_exists( $editor_script_file ) ) {
		return false;
	}

	$deps = array( 'wp-blocks', 'wp-block-editor', 'wp-components', 'wp-data', 'wp-editor', 'wp-element', 'wp-hooks', 'wp-i18n' );

	wp_register_script(
		'motto-blocks-editor',
		MOTTO_BLOCKS_URL . 'build/motto-blocks.js',
		$deps,
		filemtime( $editor_script_file ),
		true
	);

	wp_add_inline_script(
		'motto-blocks-editor',
		'window.process = window.process || { env: {} }; window.process.env.NODE_ENV = window.process.env.NODE_ENV || "production";',
		'before'
	);

	$target_blocks = function_exists( 'motto_styler_get_target_blocks' )
		? motto_styler_get_target_blocks()
		: array( 'all' );

	wp_add_inline_script(
		'motto-blocks-editor',
		'window.__MOTTO_STYLER_TARGET_BLOCKS__ = ' . wp_json_encode( array_values( $target_blocks ) ) . ';',
		'before'
	);

	$breakpoints = function_exists( 'motto_styler_get_breakpoint_config' )
		? motto_styler_get_breakpoint_config()
		: array();
	wp_add_inline_script(
		'motto-blocks-editor',
		'window.__MOTTO_BREAKPOINTS__ = ' . wp_json_encode( $breakpoints ) . ';',
		'before'
	);

	$custom_css = function_exists( 'motto_blocks_get_custom_css' )
		? wp_strip_all_tags( motto_blocks_get_custom_css() )
		: '';
	wp_add_inline_script(
		'motto-blocks-editor',
		'window.__MOTTO_BLOCKS_CUSTOM_CSS__ = ' . wp_json_encode( $custom_css ) . ';',
		'before'
	);

	$google_maps_api_key_capability = apply_filters( 'motto_blocks_google_maps_api_key_capability', 'edit_posts' );
	$can_read_google_maps_api_key   = is_string( $google_maps_api_key_capability ) && '' !== $google_maps_api_key_capability
		? current_user_can( $google_maps_api_key_capability )
		: false;
	$api_settings = array(
		'googleMapsApiKey' => $can_read_google_maps_api_key && function_exists( 'motto_blocks_get_google_maps_api_key' ) ? motto_blocks_get_google_maps_api_key() : '',
		'settingsApiUrl'   => admin_url( 'admin.php?page=motto-blocks-settings&tab=api' ),
	);
	wp_add_inline_script(
		'motto-blocks-editor',
		'window.__MOTTO_BLOCKS_API_SETTINGS__ = ' . wp_json_encode( $api_settings ) . ';',
		'before'
	);

	wp_add_inline_script(
		'motto-blocks-editor',
		'window.__MOTTO_BLOCKS_LUCIDE_ICON_BASE_URL__ = ' . wp_json_encode( MOTTO_BLOCKS_URL . 'assets/vendor/lucide/icons/' ) . ';',
		'before'
	);

	return true;
}

/**
 * Register shared Motto editor UI styles.
 */
function motto_blocks_register_editor_ui_style() {
	$editor_ui_file = MOTTO_BLOCKS_DIR . 'assets/css/styler/styles/editor-ui.css';

	if ( ! file_exists( $editor_ui_file ) ) {
		return;
	}

	wp_register_style(
		'motto-blocks-editor-ui',
		MOTTO_BLOCKS_URL . 'assets/css/styler/styles/editor-ui.css',
		array( 'wp-components' ),
		filemtime( $editor_ui_file )
	);
}

/**
 * Register shared MottoStyler block base styles for editor and frontend.
 */
function motto_blocks_register_styler_block_base_style() {
	$styler_block_base_file = MOTTO_BLOCKS_DIR . 'assets/css/styler/styles/motto-styler-block-base.css';

	if ( ! file_exists( $styler_block_base_file ) ) {
		return;
	}

	wp_register_style(
		'motto-blocks-styler-block-base',
		MOTTO_BLOCKS_URL . 'assets/css/styler/styles/motto-styler-block-base.css',
		array(),
		filemtime( $styler_block_base_file )
	);
}

/**
 * Append responsive spacing rules for conditional layout classes to the block base stylesheet.
 *
 * Generates gap / margin-block-start rules for .motto-is-layout-flex--{bp} and
 * .motto-is-layout-flow--{bp} wrapped in the appropriate @media query per breakpoint.
 * This mirrors the static rules for .motto-base-layout-* but is generated at runtime
 * because breakpoints are configurable.
 */
function motto_blocks_add_conditional_layout_spacing_styles() {
	if ( ! wp_style_is( 'motto-blocks-styler-block-base', 'registered' ) ) {
		return;
	}
	if ( ! function_exists( 'motto_styler_get_breakpoints' ) ) {
		return;
	}
	$breakpoints = motto_styler_get_breakpoints();
	if ( empty( $breakpoints ) || ! is_array( $breakpoints ) ) {
		return;
	}

	$gap_value = 'var(--wp--style--block-gap, 1em)';
	$css       = '';

	foreach ( $breakpoints as $key => $bp ) {
		$media        = ( isset( $bp['media'] ) && is_string( $bp['media'] ) ) ? trim( $bp['media'] ) : '';
		$flex_classes = ".motto-is-layout-flex--{$key},.motto-is-layout-inline-flex--{$key},.motto-is-layout-grid--{$key},.motto-is-layout-inline-grid--{$key}";
		$flow_class   = ".motto-is-layout-flow--{$key}";

		$rule  = ":root :is({$flex_classes})>*{margin-block:0;}:is({$flex_classes}){gap:{$gap_value};}";
		$rule .= "{$flow_class} > * {margin-block:0;}";
		$rule .= "{$flow_class} > * + * {margin-block-start:{$gap_value};}";

		$css .= $media !== '' ? "{$media}{{$rule}}" : $rule;
	}

	if ( $css !== '' ) {
		wp_add_inline_style( 'motto-blocks-styler-block-base', $css );
	}
}

/**
 * Return whether third-party frontend assets should load from CDN.
 *
 * @return bool
 */
/**
 * Parse a single block.json file into a block definition.
 *
 * Shared by Free's own catalog scan and, via `MOTTO_HOOK_BLOCK_DEFINITIONS`,
 * by Pro's contribution of its own blocks to the same catalog.
 *
 * @param string $path Path to a block.json file.
 * @return array{name:string,slug:string,title:string,description:string,namespace:string,parents:string[],tier:string}|null
 */
function motto_blocks_parse_block_definition_file( $path ) {
	$contents = file_get_contents( $path );
	if ( ! is_string( $contents ) || '' === $contents ) {
		return null;
	}

	$metadata = json_decode( $contents, true );
	if ( ! is_array( $metadata ) ) {
		return null;
	}

	$name = isset( $metadata['name'] ) ? strtolower( trim( (string) $metadata['name'] ) ) : '';
	if ( '' === $name || false === strpos( $name, '/' ) ) {
		return null;
	}

	list( $namespace, $slug ) = explode( '/', $name, 2 );
	$parents = array();
	if ( isset( $metadata['parent'] ) && is_array( $metadata['parent'] ) ) {
		foreach ( $metadata['parent'] as $parent_name ) {
			$parent_name = strtolower( trim( (string) $parent_name ) );
			if ( '' !== $parent_name ) {
				$parents[] = $parent_name;
			}
		}
	}

	return array(
		'name'        => $name,
		'slug'        => $slug,
		'title'       => isset( $metadata['title'] ) ? trim( (string) $metadata['title'] ) : $name,
		'description' => isset( $metadata['description'] ) ? trim( (string) $metadata['description'] ) : '',
		'namespace'   => $namespace,
		'parents'     => array_values( array_unique( $parents ) ),
		'tier'        => 'free',
	);
}

/**
 * Return build-backed Motto block definitions keyed by block name.
 *
 * Free's own `build/blocks/*` are scanned directly; other plugins (e.g.
 * MottoBlocks Pro) contribute their own via `MOTTO_HOOK_BLOCK_DEFINITIONS`.
 *
 * @return array<string,array{name:string,slug:string,title:string,icon:string,description:string,namespace:string,parents:string[],tier:string}>
 */
function motto_blocks_get_available_block_definitions() {
	static $definitions = null;

	if ( null !== $definitions ) {
		return $definitions;
	}

	$definitions = array();
	$paths       = glob( MOTTO_BLOCKS_DIR . 'build/blocks/*/block.json' );
	if ( is_array( $paths ) ) {
		foreach ( $paths as $path ) {
			$definition = motto_blocks_parse_block_definition_file( $path );
			if ( null !== $definition ) {
				$definitions[ $definition['name'] ] = $definition;
			}
		}
	}

	/** This filter is documented in includes/freepro-hooks.php. */
	$definitions = apply_filters( MOTTO_HOOK_BLOCK_DEFINITIONS, $definitions );
	if ( ! is_array( $definitions ) ) {
		$definitions = array();
	}

	uasort(
		$definitions,
		static function ( $left, $right ) {
			return strnatcasecmp( $left['title'], $right['title'] );
		}
	);

	return $definitions;
}

/**
 * Return Motto block definitions grouped by namespace.
 *
 * @return array<string,array<int,array{name:string,slug:string,title:string,namespace:string,parents:string[]}>>
 */
function motto_blocks_get_available_block_definitions_by_namespace() {
	$groups = array();

	foreach ( motto_blocks_get_available_block_definitions() as $definition ) {
		$namespace = $definition['namespace'];
		if ( ! isset( $groups[ $namespace ] ) ) {
			$groups[ $namespace ] = array();
		}

		$groups[ $namespace ][] = $definition;
	}

	ksort( $groups, SORT_NATURAL | SORT_FLAG_CASE );

	return $groups;
}

/**
 * Sanitize enabled Motto blocks.
 *
 * Child blocks are never stored explicitly — they are auto-enabled whenever
 * all of their parents are enabled. Only parent blocks appear in the admin UI
 * and are accepted from submitted data.
 *
 * @param mixed $blocks Raw enabled parent block names (or null for default).
 * @return string[]
 */
function motto_blocks_sanitize_enabled_blocks( $blocks ) {
	$definitions = motto_blocks_get_available_block_definitions();
	if ( empty( $definitions ) ) {
		return array();
	}

	$legacy_block_map = array(
		'motto/custom-list'      => 'motto/list',
		'motto/custom-list-item' => 'motto/list-item',
	);

	// Default enabled = all parent blocks (children are auto-managed).
	$parent_definitions = array_filter(
		$definitions,
		static function ( $def ) {
			return empty( $def['parents'] );
		}
	);
	$default_enabled = array_keys( $parent_definitions );

	if ( null === $blocks || ! is_array( $blocks ) ) {
		$enabled = $default_enabled;
	} else {
		$enabled       = array();
		$raw_submitted = array();
		foreach ( $blocks as $block_name ) {
			$block_name = strtolower( trim( (string) $block_name ) );
			if ( isset( $legacy_block_map[ $block_name ] ) ) {
				$block_name = $legacy_block_map[ $block_name ];
			}
			$raw_submitted[] = $block_name;
			// Only accept parent blocks; children are auto-managed.
			if ( '' !== $block_name && isset( $definitions[ $block_name ] ) && empty( $definitions[ $block_name ]['parents'] ) ) {
				$enabled[] = $block_name;
			}
		}
		$enabled = array_values( array_unique( $enabled ) );

		// Back-compat: a saved array from before Pro blocks joined this catalog
		// (via MOTTO_HOOK_BLOCK_DEFINITIONS) has zero overlap with pro-tier block
		// names, since those checkboxes didn't exist yet to uncheck. Treat every
		// currently available Pro parent block as enabled until the admin saves
		// the Blocks tab again with Pro blocks actually visible in it.
		$pro_parent_names = array();
		foreach ( $definitions as $definition_name => $def ) {
			if ( empty( $def['parents'] ) && isset( $def['tier'] ) && 'pro' === $def['tier'] ) {
				$pro_parent_names[] = $definition_name;
			}
		}
		if ( ! empty( $pro_parent_names ) && empty( array_intersect( $pro_parent_names, $raw_submitted ) ) ) {
			$enabled = array_values( array_unique( array_merge( $enabled, $pro_parent_names ) ) );
		}
	}

	// Auto-enable child blocks whose parents are all enabled. Iterates to a
	// fixed point (not a single pass) so multi-level nesting resolves correctly
	// regardless of the definitions' alphabetical-by-title iteration order
	// (e.g. a grandchild processed before its parent gets enabled).
	do {
		$added = false;
		foreach ( $definitions as $child_name => $def ) {
			if ( empty( $def['parents'] ) || in_array( $child_name, $enabled, true ) ) {
				continue;
			}
			$all_parents_enabled = true;
			foreach ( $def['parents'] as $parent_name ) {
				if ( ! in_array( $parent_name, $enabled, true ) ) {
					$all_parents_enabled = false;
					break;
				}
			}
			if ( $all_parents_enabled ) {
				$enabled[] = $child_name;
				$added      = true;
			}
		}
	} while ( $added );

	return array_values( $enabled );
}

/**
 * Return enabled Motto block names.
 *
 * @return string[]
 */
function motto_blocks_get_enabled_blocks() {
	$option = get_option( 'motto_blocks_enabled_blocks', null );

	return motto_blocks_sanitize_enabled_blocks( $option );
}

/**
 * Check whether a Motto block is enabled in admin settings.
 *
 * @param string $block_name Full block name.
 * @return bool
 */
function motto_blocks_is_block_enabled( $block_name ) {
	$block_name = strtolower( trim( (string) $block_name ) );
	if ( '' === $block_name ) {
		return false;
	}

	return in_array( $block_name, motto_blocks_get_enabled_blocks(), true );
}

/**
 * Build default block registration args from block slug.
 *
 * @param string $slug Block slug.
 * @return array
 */
function motto_blocks_get_base_block_args( $slug ) {
	return motto_blocks_build_block_registration_args(
		$slug,
		MOTTO_BLOCKS_DIR,
		MOTTO_BLOCKS_URL,
		'motto-blocks-editor',
		'motto-blocks'
	);
}

/**
 * Register block with default args.
 *
 * @param string $slug Block slug.
 * @param array  $args Extra args.
 * @return void
 */
function motto_blocks_register_block( $slug, $args = array() ) {
	motto_blocks_do_register_block(
		$slug,
		MOTTO_BLOCKS_DIR . 'build/blocks/',
		'motto_blocks_get_base_block_args',
		$args
	);
}

function motto_blocks_register_container_block() {
	motto_blocks_register_block(
		'container',
		array(
			'editor_script_handles' => array( 'motto-blocks-editor' ),
			'view_script_handles'   => array( 'motto-blocks-parallax-runtime' ),
		)
	);
}

function motto_blocks_register_classic_menu_block() {
	motto_blocks_register_block(
		'classic-menu',
		array(
			'render_callback'       => 'motto_blocks_render_classic_menu',
			'editor_script_handles' => array( 'motto-blocks-editor', 'motto-blocks-classic-menu-runtime' ),
			'view_script_handles'   => array( 'motto-blocks-classic-menu-view' ),
		)
	);
}

function motto_blocks_register_list_blocks() {
	motto_blocks_register_block( 'list' );
	motto_blocks_register_block( 'list-item' );
}

function motto_blocks_register_buttons_blocks() {
	$args          = motto_blocks_get_base_block_args( 'buttons' );
	$base_styles   = isset( $args['style_handles'] ) ? (array) $args['style_handles'] : array();
	$style_handles = array_merge( array( 'wp-block-buttons' ), $base_styles );

	$args['style_handles'] = $style_handles;

	motto_blocks_register_block( 'buttons', $args );

	$button_args          = motto_blocks_get_base_block_args( 'button' );
	$button_base_styles   = isset( $button_args['style_handles'] ) ? (array) $button_args['style_handles'] : array();
	$button_style_handles = array_merge( array( 'wp-block-button' ), $button_base_styles );

	$button_args['style_handles'] = $button_style_handles;

	motto_blocks_register_block( 'button', $button_args );
}

function motto_blocks_register_slider_block() {
	$args          = motto_blocks_get_base_block_args( 'slider' );
	$styles        = isset( $args['style_handles'] ) ? (array) $args['style_handles'] : array();
	$editor_styles = isset( $args['editor_style_handles'] ) ? (array) $args['editor_style_handles'] : array();

	$args['view_script_handles']  = array( 'motto-blocks-slider-view' );
	$args['render_callback']      = 'motto_blocks_render_slider';
	$args['style_handles']        = array_merge( $styles, array( 'motto-blocks-swiper-css' ) );
	$args['editor_style_handles'] = array_merge( $editor_styles, array( 'motto-blocks-swiper-css' ) );

	motto_blocks_register_block( 'slider', $args );
	motto_blocks_register_block( 'slide' );
}

function motto_blocks_register_svg_block() {
	motto_blocks_register_block(
		'svg',
		array(
			'render_callback' => 'motto_blocks_render_svg',
		)
	);
}

function motto_blocks_register_maps_block() {
	motto_blocks_register_block(
		'maps',
		array(
			'view_script_handles' => array( 'motto-blocks-maps-view' ),
			'render_callback'     => 'motto_blocks_render_maps',
		)
	);
}

function motto_blocks_register_counter_block() {
	motto_blocks_register_block(
		'counter',
		array(
			'editor_script_handles' => array( 'motto-blocks-editor' ),
			'view_script_handles'   => array( 'motto-blocks-counter-view' ),
		)
	);
}

function motto_blocks_register_tabs_blocks() {
	motto_blocks_register_block( 'tabs' );
	motto_blocks_register_block( 'tab-container' );
	motto_blocks_register_block( 'tab-button' );
	motto_blocks_register_block( 'tab-panels' );
	motto_blocks_register_block( 'tab' );
}

function motto_blocks_register_accordion_blocks() {
	motto_blocks_register_block( 'accordion' );
	motto_blocks_register_block( 'accordion-item' );
}

/**
 * Register all blocks for this plugin.
 */
function motto_blocks_register() {
	// Shared vendor dependencies.
	motto_blocks_register_swiper_assets();

	$has_editor_script = motto_blocks_register_editor_script();
	if ( ! $has_editor_script ) {
		return;
	}

	// Shared editor and Styler styles.
	motto_blocks_register_editor_ui_style();
	motto_blocks_register_styler_block_base_style();
	motto_blocks_add_conditional_layout_spacing_styles();

	// Block-specific frontend/editor runtimes.
	motto_blocks_register_container_assets();
	motto_blocks_register_classic_menu_assets();
	motto_blocks_register_maps_assets();
	motto_blocks_register_counter_assets();

	// Basic content and layout blocks.
	motto_blocks_register_list_blocks();
	motto_blocks_register_buttons_blocks();
	motto_blocks_register_block( 'image' );

	// Interactive and dynamic blocks.
	motto_blocks_register_container_block();
	motto_blocks_register_classic_menu_block();
	motto_blocks_register_slider_block();
	motto_blocks_register_svg_block();
	motto_blocks_register_maps_block();
	motto_blocks_register_counter_block();

	// Composite block families.
	motto_blocks_register_tabs_blocks();
	motto_blocks_register_accordion_blocks();
}
add_action( 'init', 'motto_blocks_register' );

/**
 * Allow WordPress REST clients served from a dev-server origin to send method override headers.
 *
 * @param string[] $allow_headers Allowed CORS request headers.
 * @return string[]
 */
function motto_blocks_allow_rest_method_override_cors_header( $allow_headers ) {
	if ( ! is_array( $allow_headers ) ) {
		$allow_headers = array();
	}

	$allow_headers[] = 'X-HTTP-Method-Override';
	return array_values( array_unique( $allow_headers ) );
}
add_filter( 'rest_allowed_cors_headers', 'motto_blocks_allow_rest_method_override_cors_header' );

add_action(
	'after_setup_theme',
	static function () {
		add_theme_support( 'menus' );
	}
);

/**
 * Enqueue shared Motto editor UI styles in the editor admin document.
 *
 * Uses `enqueue_block_editor_assets` (not `admin_enqueue_scripts`) so Gutenberg
 * treats this as editor-chrome-only CSS and doesn't duplicate it into the
 * block editor iframe.
 */
function motto_blocks_enqueue_editor_ui_style() {
	if ( wp_style_is( 'motto-blocks-editor-ui', 'registered' ) ) {
		wp_enqueue_style( 'motto-blocks-editor-ui' );
	}
}
add_action( 'enqueue_block_editor_assets', 'motto_blocks_enqueue_editor_ui_style' );

/**
 * Remove legacy `wp-block-button` class from Motto Button frontend output.
 *
 * @param string $block_content Rendered block content.
 * @param array  $block         Parsed block data.
 * @return string
 */
function motto_blocks_filter_legacy_button_class( $block_content, $block ) {
	if ( ! is_array( $block ) || ( $block['blockName'] ?? '' ) !== 'motto/button' ) {
		return $block_content;
	}

	if ( false === strpos( $block_content, 'wp-block-button' ) ) {
		return $block_content;
	}

	return preg_replace_callback(
		'/class="([^"]*)"/',
		static function( $matches ) {
			$classes = preg_split( '/\s+/', trim( $matches[1] ) );
			if ( ! is_array( $classes ) ) {
				return $matches[0];
			}

			$filtered = array_values(
				array_filter(
					$classes,
					static function( $class_name ) {
						return 'wp-block-button' !== $class_name;
					}
				)
			);

			return 'class="' . esc_attr( implode( ' ', $filtered ) ) . '"';
		},
		$block_content,
		1
	);
}
add_filter( 'render_block', 'motto_blocks_filter_legacy_button_class', 10, 2 );

/**
 * Respect Query Loop "per page" value even when inherited queries default to Reading settings.
 *
 * @param array $query Query vars used by the Query Loop block.
 * @param array $block Parsed block.
 * @return array
 */
function motto_blocks_query_loop_respect_per_page( $query, $block ) {
	$parsed_block = array();
	if ( is_object( $block ) && isset( $block->parsed_block ) && is_array( $block->parsed_block ) ) {
		$parsed_block = $block->parsed_block;
	} elseif ( is_array( $block ) ) {
		$parsed_block = $block;
	}

	$block_name = isset( $parsed_block['blockName'] )
		? (string) $parsed_block['blockName']
		: ( isset( $block->name ) ? (string) $block->name : '' );
	if ( 'core/query' !== $block_name ) {
		return $query;
	}

	$per_page = isset( $parsed_block['attrs']['query']['perPage'] ) ? (int) $parsed_block['attrs']['query']['perPage'] : 0;

	if ( $per_page < 1 ) {
		return $query;
	}

	$query['posts_per_page'] = $per_page;

	return $query;
}
add_filter( 'query_loop_block_query_vars', 'motto_blocks_query_loop_respect_per_page', 10, 2 );

/**
 * Add a marker class to the frontend body element.
 *
 * @param string[] $classes Body classes.
 * @return string[]
 */
function motto_blocks_add_body_class( $classes ) {
	$classes[] = 'motto-body-front';
	return $classes;
}
add_filter( 'body_class', 'motto_blocks_add_body_class' );
