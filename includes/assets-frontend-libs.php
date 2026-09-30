<?php
/**
 * Frontend asset registration for shared vendor libraries (Swiper) and
 * block-specific runtime scripts (Container parallax, Classic Menu, Maps, Counter).
 *
 * Functions are invoked from motto_blocks_register() on the `init` hook in
 * motto-blocks.php. Filters that augment script/style tags register at module
 * load time when this file is required.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register Swiper assets from the plugin's bundled local copy.
 *
 * WordPress.org Plugin Check disallows offloading enqueued scripts/styles to
 * any remote server, so this only ever registers the local file — no CDN
 * option.
 */
function motto_blocks_register_swiper_assets() {
	$swiper_css_handle = 'motto-blocks-swiper-css';
	$swiper_js_handle  = 'motto-blocks-swiper-js';
	$slider_view_file  = MOTTO_BLOCKS_DIR . 'assets/js/slider-frontend.js';
	$swiper_css_file   = MOTTO_BLOCKS_DIR . 'assets/vendor/swiper/swiper-bundle.min.css';
	$swiper_js_file    = MOTTO_BLOCKS_DIR . 'assets/vendor/swiper/swiper-bundle.min.js';

	if ( file_exists( $swiper_css_file ) ) {
		wp_register_style(
			$swiper_css_handle,
			MOTTO_BLOCKS_URL . 'assets/vendor/swiper/swiper-bundle.min.css',
			array(),
			filemtime( $swiper_css_file )
		);
	}

	if ( file_exists( $swiper_js_file ) ) {
		wp_register_script(
			$swiper_js_handle,
			MOTTO_BLOCKS_URL . 'assets/vendor/swiper/swiper-bundle.min.js',
			array(),
			filemtime( $swiper_js_file ),
			true
		);
	}

	if ( file_exists( $slider_view_file ) && wp_script_is( $swiper_js_handle, 'registered' ) ) {
		wp_register_script(
			'motto-blocks-slider-view',
			MOTTO_BLOCKS_URL . 'assets/js/slider-frontend.js',
			array( $swiper_js_handle ),
			filemtime( $slider_view_file ),
			true
		);
	}
}

/**
 * Register parallax view scripts for the Container block.
 */
function motto_blocks_register_container_assets() {
	$parallax_runtime_file = MOTTO_BLOCKS_DIR . 'assets/js/parallax-runtime.js';

	if ( file_exists( $parallax_runtime_file ) ) {
		wp_register_script(
			'motto-blocks-parallax-runtime',
			MOTTO_BLOCKS_URL . 'assets/js/parallax-runtime.js',
			array(),
			filemtime( $parallax_runtime_file ),
			true
		);
	}
}

/**
 * Register Classic Menu frontend behavior script.
 */
function motto_blocks_register_classic_menu_assets() {
	$classic_menu_runtime_file = MOTTO_BLOCKS_DIR . 'assets/js/classic-menu-runtime.js';
	$classic_menu_file = MOTTO_BLOCKS_DIR . 'assets/js/classic-menu-frontend.js';

	if ( file_exists( $classic_menu_runtime_file ) ) {
		wp_register_script(
			'motto-blocks-classic-menu-runtime',
			MOTTO_BLOCKS_URL . 'assets/js/classic-menu-runtime.js',
			array(),
			filemtime( $classic_menu_runtime_file ),
			true
		);
	}

	if ( ! file_exists( $classic_menu_file ) ) {
		return;
	}

	wp_register_script(
		'motto-blocks-classic-menu-view',
		MOTTO_BLOCKS_URL . 'assets/js/classic-menu-frontend.js',
		array( 'motto-blocks-classic-menu-runtime' ),
		filemtime( $classic_menu_file ),
		true
	);
}

/**
 * Register Google Maps frontend runtime script.
 */
function motto_blocks_register_maps_assets() {
	$maps_runtime_file = MOTTO_BLOCKS_DIR . 'assets/js/maps-frontend.js';

	if ( ! file_exists( $maps_runtime_file ) ) {
		return;
	}

	wp_register_script(
		'motto-blocks-maps-view',
		MOTTO_BLOCKS_URL . 'assets/js/maps-frontend.js',
		array(),
		filemtime( $maps_runtime_file ),
		true
	);

	wp_add_inline_script(
		'motto-blocks-maps-view',
		'window.__MOTTO_BLOCKS_LUCIDE_ICON_BASE_URL__ = ' . wp_json_encode( MOTTO_BLOCKS_URL . 'assets/vendor/lucide/icons/' ) . ';',
		'before'
	);
}

/**
 * Register Counter frontend runtime script.
 */
function motto_blocks_register_counter_assets() {
	$counter_runtime_file = MOTTO_BLOCKS_DIR . 'assets/js/counter-frontend.js';

	if ( ! file_exists( $counter_runtime_file ) ) {
		return;
	}

	wp_register_script(
		'motto-blocks-counter-view',
		MOTTO_BLOCKS_URL . 'assets/js/counter-frontend.js',
		array(),
		filemtime( $counter_runtime_file ),
		true
	);
}

