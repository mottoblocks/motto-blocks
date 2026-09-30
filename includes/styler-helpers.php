<?php

/**
 * Shared helpers for MottoStyler.
 */

if (! defined('ABSPATH')) {
	exit;
}

/**
 * Return built-in fallback breakpoint config.
 *
 * @return array<string,array<string,mixed>>
 */
function motto_styler_get_builtin_breakpoint_fallback_config() {
	return array(
		'desktop'        => array(
			'media'    => '',
			'maxWidth' => null,
			'ui'       => array( 'color' => '#2563eb' ),
		),
		'tablet'         => array(
			'media'    => '@media (max-width: 900px)',
			'maxWidth' => 900,
			'ui'       => array( 'color' => '#0f766e' ),
		),
		'landscapePhone' => array(
			'media'    => '@media (max-width: 700px)',
			'maxWidth' => 700,
			'ui'       => array( 'color' => '#d97706' ),
		),
		'phone'          => array(
			'media'    => '@media (max-width: 430px)',
			'maxWidth' => 430,
			'ui'       => array( 'color' => '#dc2626' ),
		),
	);
}

/**
 * Extract a max-width breakpoint value from a media query string.
 *
 * @param mixed $media Media query string.
 * @return int|null
 */
function motto_styler_extract_max_width_from_media( $media ) {
	$media = is_string( $media ) ? trim( $media ) : '';
	if ( $media === '' ) {
		return null;
	}

	if ( preg_match( '/max-width:\s*([0-9]+)px/i', $media, $matches ) ) {
		$value = isset( $matches[1] ) ? (int) $matches[1] : 0;
		return $value > 0 ? $value : null;
	}

	return null;
}

/**
 * Normalize a single breakpoint entry.
 *
 * @param string               $key      Breakpoint key.
 * @param mixed                $raw      Raw breakpoint config.
 * @param array<string,mixed>  $fallback Fallback breakpoint config.
 * @return array<string,mixed>
 */
function motto_styler_normalize_breakpoint_entry( $key, $raw, array $fallback = array() ) {
	$key      = (string) $key;
	$source   = is_array( $raw ) ? $raw : array();
	$fallback = is_array( $fallback ) ? $fallback : array();
	$is_base  = ( $key === 'desktop' );

	$fallback_media = isset( $fallback['media'] ) && is_string( $fallback['media'] ) ? trim( $fallback['media'] ) : '';

	$source_width = is_array( $source ) && array_key_exists( 'maxWidth', $source ) ? (int) $source['maxWidth'] : 0;
	if ( $source_width <= 0 && ! is_array( $raw ) && is_scalar( $raw ) ) {
		$source_width = (int) $raw;
	}
	if ( $source_width <= 0 ) {
		$source_media = isset( $source['media'] ) && is_string( $source['media'] ) ? trim( $source['media'] ) : '';
		$source_width = (int) motto_styler_extract_max_width_from_media( $source_media );
	}

	$fallback_width = isset( $fallback['maxWidth'] ) ? (int) $fallback['maxWidth'] : 0;
	if ( $fallback_width <= 0 ) {
		$fallback_width = (int) motto_styler_extract_max_width_from_media( $fallback_media );
	}

	$max_width = null;
	if ( ! $is_base ) {
		if ( $source_width > 0 ) {
			$max_width = $source_width;
		} elseif ( $fallback_width > 0 ) {
			$max_width = $fallback_width;
		}
	}

	$media = '';
	if ( ! $is_base && $max_width !== null ) {
		$media = '@media (max-width: ' . $max_width . 'px)';
	}
	if ( ! $is_base && $media === '' && $fallback_media !== '' ) {
		$media = $fallback_media;
	}

	$fallback_color = '';
	if ( isset( $fallback['ui']['color'] ) ) {
		$fallback_color = sanitize_hex_color( (string) $fallback['ui']['color'] );
		$fallback_color = is_string( $fallback_color ) ? $fallback_color : '';
	}

	$color = '';
	if ( isset( $source['ui']['color'] ) ) {
		$color = sanitize_hex_color( (string) $source['ui']['color'] );
		$color = is_string( $color ) ? $color : '';
	}
	if ( $color === '' ) {
		$color = $fallback_color;
	}

	$normalized = array(
		'media'    => $media,
		'maxWidth' => $max_width,
	);

	if ( $color !== '' ) {
		$normalized['ui'] = array( 'color' => $color );
	}

	return $normalized;
}

/**
 * Normalize a breakpoint config map against fallback keys.
 *
 * @param mixed                         $raw  Raw breakpoint config map.
 * @param array<string,array<string,mixed>> $fallback Fallback config map.
 * @return array<string,array<string,mixed>>
 */
function motto_styler_normalize_breakpoint_config_map( $raw, array $fallback ) {
	$source     = is_array( $raw ) ? $raw : array();
	$normalized = array();

	foreach ( $fallback as $key => $fallback_entry ) {
		$entry              = isset( $source[ $key ] ) ? $source[ $key ] : array();
		$normalized[ $key ] = motto_styler_normalize_breakpoint_entry( $key, $entry, $fallback_entry );
	}

	return $normalized;
}

/**
 * Get default breakpoint config from shared JSON.
 *
 * @return array<string,array<string,mixed>>
 */
function motto_styler_get_default_breakpoint_config() {
	static $cached = null;

	if ( $cached !== null ) {
		return $cached;
	}

	$fallback = motto_styler_get_builtin_breakpoint_fallback_config();
	$raw      = motto_styler_read_shared_config_json( 'motto-breakpoints.json' );
	if ( empty( $raw ) || ! is_array( $raw ) ) {
		// Backward compatibility for older installs still using src/data.
		$raw = motto_styler_read_data_json( 'motto-breakpoints.json' );
	}
	if ( empty( $raw ) || ! is_array( $raw ) ) {
		$raw = $fallback;
	}

	$cached = motto_styler_normalize_breakpoint_config_map( $raw, $fallback );
	return $cached;
}

/**
 * Read theme.json breakpoint overrides.
 *
 * @return array<string,int>
 */
function motto_styler_get_theme_breakpoint_overrides() {
	$defaults = array(
		'tablet'         => 0,
		'landscapePhone' => 0,
		'phone'          => 0,
	);

	if ( ! class_exists( 'WP_Theme_JSON_Resolver' ) ) {
		return array();
	}

	$theme_json = WP_Theme_JSON_Resolver::get_merged_data();
	if ( ! $theme_json || ! method_exists( $theme_json, 'get_settings' ) ) {
		return array();
	}

	$settings = $theme_json->get_settings();
	$custom   = isset( $settings['custom'] ) && is_array( $settings['custom'] ) ? $settings['custom'] : array();

	$candidate = null;

	if ( isset( $custom['breakpoints'] ) && is_array( $custom['breakpoints'] ) ) {
		$candidate = $custom['breakpoints'];
	}

	if ( ! is_array( $candidate ) ) {
		return array();
	}

	$out = array();

	foreach ( $defaults as $key => $unused ) {
		if ( ! isset( $candidate[ $key ] ) ) {
			continue;
		}

		$val = (int) $candidate[ $key ];
		if ( $val > 0 ) {
			$out[ $key ] = $val;
		}
	}

	return $out;
}

/**
 * Sanitize breakpoint overrides saved from admin settings.
 *
 * @param mixed $value Raw option value.
 * @return array<string,array<string,mixed>>
 */
function motto_styler_sanitize_breakpoint_overrides( $value ) {
	$source   = is_array( $value ) ? $value : array();
	$defaults = motto_styler_get_default_breakpoint_config();
	$out      = array();

	foreach ( $defaults as $key => $fallback ) {
		$entry = isset( $source[ $key ] ) ? $source[ $key ] : null;

		$width = 0;
		if ( is_array( $entry ) && array_key_exists( 'maxWidth', $entry ) ) {
			$width = (int) $entry['maxWidth'];
		} elseif ( is_scalar( $entry ) ) {
			$width = (int) $entry;
		}
		if ( $width <= 0 && is_array( $entry ) && isset( $entry['media'] ) ) {
			$width = (int) motto_styler_extract_max_width_from_media( $entry['media'] );
		}

		$sanitized = array(
			'maxWidth' => null,
		);

		if ( $key !== 'desktop' && $width > 0 ) {
			$sanitized['maxWidth'] = $width;
		}

		$color = '';
		if ( is_array( $entry ) && isset( $entry['ui']['color'] ) ) {
			$color = sanitize_hex_color( (string) $entry['ui']['color'] );
			$color = is_string( $color ) ? $color : '';
		}
		if ( $color !== '' ) {
			$sanitized['ui'] = array( 'color' => $color );
		}

		if ( $key === 'desktop' || ( $key !== 'desktop' && $width > 0 ) ) {
			$out[ $key ] = $sanitized;
		} elseif ( isset( $sanitized['ui'] ) ) {
			$out[ $key ] = $sanitized;
		}
	}

	return $out;
}

/**
 * Validate built-in breakpoint width order.
 *
 * @param array<string,array<string,mixed>> $breakpoints Breakpoint config map.
 * @return bool
 */
function motto_styler_has_valid_breakpoint_width_order( array $breakpoints ) {
	$order      = array( 'tablet', 'landscapePhone', 'phone' );
	$prev_width = null;

	foreach ( $order as $key ) {
		if ( ! isset( $breakpoints[ $key ] ) || ! is_array( $breakpoints[ $key ] ) ) {
			continue;
		}

		$width = isset( $breakpoints[ $key ]['maxWidth'] ) ? (int) $breakpoints[ $key ]['maxWidth'] : 0;
		if ( $width <= 0 ) {
			return false;
		}

		if ( $prev_width !== null && $width >= $prev_width ) {
			return false;
		}

		$prev_width = $width;
	}

	return true;
}

/**
 * Get runtime breakpoint config (defaults + saved overrides).
 *
 * @return array<string,array<string,mixed>>
 */
function motto_styler_get_breakpoint_config() {
	static $cached = null;

	if ( $cached !== null ) {
		return $cached;
	}

	$defaults = motto_styler_get_default_breakpoint_config();
	$raw      = get_option( 'motto_styler_breakpoint_overrides', array() );
	$saved    = is_array( $raw ) ? motto_styler_sanitize_breakpoint_overrides( $raw ) : array();
	$theme    = motto_styler_get_theme_breakpoint_overrides();
	$resolved = $defaults;

	foreach ( $theme as $key => $width ) {
		if ( ! isset( $resolved[ $key ] ) ) {
			continue;
		}
		$resolved[ $key ] = motto_styler_normalize_breakpoint_entry(
			$key,
			array( 'maxWidth' => $width ),
			$resolved[ $key ]
		);
	}

	foreach ( $saved as $key => $entry ) {
		if ( ! isset( $resolved[ $key ] ) ) {
			continue;
		}
		$resolved[ $key ] = motto_styler_normalize_breakpoint_entry(
			$key,
			$entry,
			$resolved[ $key ]
		);
	}

	$cached = $resolved;
	return $cached;
}

/**
 * Read breakpoints from theme.json (if present).
 *
 * Expected shapes:
 * - settings.custom.breakpoints = [ 'tablet' => 1024, 'landscapePhone' => 768, 'phone' => 480 ]
 * - settings.custom.breakpoints           = same shape
 *
 * Returns an array of max-width breakpoints in pixels.
 *
 * @return array<string,int>
 */
function motto_styler_get_theme_breakpoints() {
	if ( function_exists( '_deprecated_function' ) ) {
		_deprecated_function( __FUNCTION__, '0.1.1', 'motto_styler_get_breakpoint_config' );
	}

	$defaults = array();
	$bp_defs  = function_exists( 'motto_styler_get_default_breakpoint_config' ) ? motto_styler_get_default_breakpoint_config() : array();

	foreach ( $bp_defs as $key => $def ) {
		if ( $key === 'desktop' || ! is_array( $def ) ) {
			continue;
		}
		$width = isset( $def['maxWidth'] ) ? (int) $def['maxWidth'] : 0;
		if ( $width > 0 ) {
			$defaults[ $key ] = $width;
		}
	}

	if ( empty( $defaults ) ) {
		$defaults = array(
			'tablet'         => 900,
			'landscapePhone' => 700,
			'phone'          => 430,
		);
	}

	if ( ! class_exists( 'WP_Theme_JSON_Resolver' ) ) {
		return $defaults;
	}

	$out = $defaults;

	foreach ( motto_styler_get_theme_breakpoint_overrides() as $key => $width ) {
		if ( isset( $out[ $key ] ) && $width > 0 ) {
			$out[ $key ] = $width;
		}
	}

	return $out;
}

/**
 * Basic sanitize for inner selector input to avoid breaking the stylesheet.
 *
 * Disallows: { } ;
 *
 * @param string $selector
 * @return string
 */
function motto_styler_sanitize_inner_selector( $selector ) {
	$selector = (string) $selector;
	$selector = preg_replace( '/[{};<]/', '', $selector );
	$selector = preg_replace( '/\s+/', ' ', $selector );
	$selector = substr( $selector, 0, 200 );
	return $selector;
}

/**
 * Back-compat wrapper for inner selector sanitizing.
 *
 * @param string $selector
 * @return string
 */
function motto_styler_sanitize_subselector( $selector ) {
	return motto_styler_sanitize_inner_selector( $selector );
}

/**
 * Sanitize a composite selector template string, preserving the &{BLOCK} token.
 *
 * @param string $selector
 * @return string
 */
function motto_styler_sanitize_composite_template( $selector ) {
	$selector    = is_string( $selector ) ? $selector : (string) $selector;
	$token       = '&{BLOCK}';
	$placeholder = "\x00";
	$selector    = str_replace( $token, $placeholder, $selector );
	$selector    = preg_replace( '/[{};<]/', '', $selector );
	$selector    = str_replace( $placeholder, $token, $selector );
	$selector    = preg_replace( '/\s+/', ' ', $selector );
	$selector    = substr( $selector, 0, 200 );
	return $selector;
}

/**
 * Migrates any selector entry format to a composite template string.
 * The template uses "&{BLOCK}" as a placeholder for the base selector class.
 *
 * Supported input formats:
 * - Template format: { selector: "...&{BLOCK}..." }  → pass-through
 * - Intermediate format: { before, after }            → "{before} &{BLOCK}{after}"
 * - Legacy format: { selector, selectorType }         → "&{BLOCK}{after}" (inferred)
 *
 * @param mixed $entry
 * @return string
 */
function motto_styler_migrate_entry_to_template( $entry ) {
	if ( ! is_array( $entry ) ) {
		return '';
	}

	$token = '&{BLOCK}';

	// Template format: selector already contains the token.
	$selector = isset( $entry['selector'] ) ? (string) $entry['selector'] : '';
	if ( $selector !== '' && strpos( $selector, $token ) !== false ) {
		return $selector;
	}

	// Intermediate before/after format.
	if ( array_key_exists( 'before', $entry ) || array_key_exists( 'after', $entry ) ) {
		$before = isset( $entry['before'] ) ? (string) $entry['before'] : '';
		$after  = isset( $entry['after'] ) ? (string) $entry['after'] : '';
		if ( $before === '' && $after === '' ) {
			return '';
		}
		return ( $before !== '' ? $before . ' ' : '' ) . $token . $after;
	}

	// Legacy selector/selectorType format.
	if ( $selector !== '' ) {
		$selector_type = isset( $entry['selectorType'] ) ? strtolower( trim( (string) $entry['selectorType'] ) ) : '';
		if ( $selector_type === '' && isset( $entry['scope'] ) ) {
			$scope = strtolower( trim( (string) $entry['scope'] ) );
			if ( $scope === 'root' ) {
				$selector_type = 'state';
			} elseif ( $scope === 'inner' ) {
				$selector_type = 'inner';
			}
		}

		// Selector with leading space was stored explicitly — inner descendant.
		if ( strlen( $selector ) > 0 && $selector[0] === ' ' ) {
			return $token . $selector;
		}

		$first            = strlen( $selector ) > 0 ? $selector[0] : '';
		$looks_like_state = in_array( $first, array( ':', '[', '>', '+', '~' ), true );
		$needs_space      = ( $selector_type === 'inner' ) ||
		                    ( $selector_type !== 'state' && ! $looks_like_state && $selector !== '' );
		return $token . ( $needs_space ? ' ' : '' ) . $selector;
	}

	return '';
}

/**
 * Polyfill-compatible list check.
 *
 * @param mixed $value
 * @return bool
 */
function motto_styler_array_is_list( $value ) {
	if ( ! is_array( $value ) ) {
		return false;
	}

	if ( function_exists( 'array_is_list' ) ) {
		return array_is_list( $value );
	}

	$index = 0;
	foreach ( array_keys( $value ) as $key ) {
		if ( $key !== $index ) {
			return false;
		}
		$index++;
	}

	return true;
}

/**
 * Resolve selector type from canonical/legacy selector payload.
 *
 * @param mixed $selector_type
 * @param mixed $legacy_scope
 * @param mixed $selector
 * @return string
 */
function motto_styler_resolve_selector_type( $selector_type, $legacy_scope, $selector ) {
	$type = strtolower( trim( (string) $selector_type ) );
	if ( $type === 'state' || $type === 'inner' ) {
		return $type;
	}

	$scope = strtolower( trim( (string) $legacy_scope ) );
	if ( $scope === 'root' ) {
		return 'state';
	}
	if ( $scope === 'inner' ) {
		return 'inner';
	}

	$selector = ltrim( (string) $selector );
	if ( $selector === '' ) {
		return 'inner';
	}

	$first = substr( $selector, 0, 1 );
	if ( $first === ':' || $first === '[' || $first === '>' || $first === '+' || $first === '~' ) {
		return 'state';
	}

	return 'inner';
}

/**
 * Normalize inner selectors to breakpoint-first runtime shape.
 *
 * Supports:
 * - Canonical selector-first:
 *   innerSelectors: [
 *     { selector, selectorType, label, description, css: { desktop:[], tablet:[], ... } }
 *   ]
 * - Legacy breakpoint-first:
 *   innerSelectors: { desktop:[{ selector, css:[] }], tablet:[...], ... }
 * - Legacy key fallback: selectors
 *
 * @param array $motto_styler
 * @return array<string,array<int,array<string,mixed>>>
 */
function motto_styler_normalize_inner_selectors_by_breakpoint( array $motto_styler ) {
	$bp_defs = function_exists( 'motto_styler_get_breakpoints' ) ? motto_styler_get_breakpoints() : array();
	$bp_keys = array_keys( is_array( $bp_defs ) ? $bp_defs : array() );

	if ( empty( $bp_keys ) ) {
		$bp_keys = array( 'desktop', 'tablet', 'landscapePhone', 'phone' );
	}

	$out = array();
	foreach ( $bp_keys as $bp_key ) {
		$out[ $bp_key ] = array();
	}

	$raw = array();
	if ( isset( $motto_styler['blockSelectors'] ) ) {
		$raw = $motto_styler['blockSelectors'];
	} elseif ( isset( $motto_styler['innerSelectors'] ) ) {
		$raw = $motto_styler['innerSelectors'];
	} elseif ( isset( $motto_styler['selectors'] ) ) {
		$raw = $motto_styler['selectors'];
	}

	if ( ! is_array( $raw ) || empty( $raw ) ) {
		return $out;
	}

	// Canonical selector-first list.
	if ( motto_styler_array_is_list( $raw ) ) {
		foreach ( $raw as $entry ) {
			if ( ! is_array( $entry ) ) {
				continue;
			}

			$meta = array(
				'id'          => isset( $entry['id'] ) ? (string) $entry['id'] : '',
				'selector'    => motto_styler_migrate_entry_to_template( $entry ),
				'label'       => isset( $entry['label'] ) ? (string) $entry['label'] : '',
				'description' => isset( $entry['description'] ) ? (string) $entry['description'] : '',
			);
			$css_by_bp = isset( $entry['css'] ) && is_array( $entry['css'] ) ? $entry['css'] : array();

			foreach ( $bp_keys as $bp_key ) {
				$rows = ( isset( $css_by_bp[ $bp_key ] ) && is_array( $css_by_bp[ $bp_key ] ) )
					? $css_by_bp[ $bp_key ]
					: array();

				$out[ $bp_key ][] = array(
					'id'          => $meta['id'],
					'selector'    => $meta['selector'],
					'label'       => $meta['label'],
					'description' => $meta['description'],
					'css'         => $rows,
				);
			}
		}

		return $out;
	}

	// Legacy breakpoint-first map.
	foreach ( $bp_keys as $bp_key ) {
		$list = ( isset( $raw[ $bp_key ] ) && is_array( $raw[ $bp_key ] ) ) ? $raw[ $bp_key ] : array();
		if ( empty( $list ) ) {
			continue;
		}

		foreach ( $list as $row ) {
			if ( ! is_array( $row ) ) {
				continue;
			}

			$out[ $bp_key ][] = array(
				'id'          => isset( $row['id'] ) ? (string) $row['id'] : '',
				'selector'    => motto_styler_migrate_entry_to_template( $row ),
				'label'       => isset( $row['label'] ) ? (string) $row['label'] : '',
				'description' => isset( $row['description'] ) ? (string) $row['description'] : '',
				'css'         => ( isset( $row['css'] ) && is_array( $row['css'] ) ) ? $row['css'] : array(),
			);
		}
	}

	return $out;
}

/**
 * Join base selector with a selector fragment using an explicit selector type.
 *
 * - selector_type "inner": descendant selector (adds one space).
 * - selector_type "state": direct concatenation.
 * - fallback (legacy rows without selector_type): infer from first character.
 *
 * @param string $base_selector
 * @param string $inner_selector
 * @param string $selector_type
 * @return string
 */
function motto_styler_join_inner_selector( $base_selector, $inner_selector, $selector_type = '' ) {
	$base_selector  = is_string( $base_selector ) ? $base_selector : (string) $base_selector;
	$inner_selector = is_string( $inner_selector ) ? $inner_selector : (string) $inner_selector;
	$selector_type  = is_string( $selector_type ) ? strtolower( trim( $selector_type ) ) : '';

	$inner_selector = motto_styler_sanitize_inner_selector( $inner_selector );
	$inner_selector = ltrim( $inner_selector );

	if ( trim( $inner_selector ) === '' ) {
		return $base_selector;
	}

	if ( $selector_type === 'inner' ) {
		return $base_selector . ' ' . $inner_selector;
	}

	if ( $selector_type === 'state' ) {
		return $base_selector . $inner_selector;
	}

	$first = substr( $inner_selector, 0, 1 );

	// Direct concatenation for common selector prefixes.
	if ( $first === '>' || $first === '+' || $first === '~' || $first === ':' || $first === '[' ) {
		return $base_selector . $inner_selector;
	}

	// Default: descendant selector.
	return $base_selector . ' ' . $inner_selector;
}

/**
 * Back-compat wrapper for joining inner selectors.
 *
 * @param string $base_selector
 * @param string $subselector Legacy inner selector input.
 * @return string
 */
function motto_styler_join_selector( $base_selector, $subselector ) {
	return motto_styler_join_inner_selector( $base_selector, $subselector );
}

/**
 * Resolve an SVG file path by slug.
 *
 * Example slugs:
 * - mottoblocks-logo
 * - mottoblocks-menu-icon
 *
 * @param string $icon_slug
 * @return string
 */
function motto_styler_get_svg_path( $icon_slug ) {
	$slug = sanitize_file_name( (string) $icon_slug );
	if ( $slug === '' ) {
		return '';
	}

	$base_dir = defined( 'MOTTO_BLOCKS_DIR' ) ? trailingslashit( MOTTO_BLOCKS_DIR ) : trailingslashit( dirname( __DIR__ ) );
	$candidates = array(
		$base_dir . 'assets/images/branding/' . $slug . '.svg',
		$base_dir . 'assets/images/icons/' . $slug . '.svg',
	);

	foreach ( $candidates as $path ) {
		if ( file_exists( $path ) ) {
			return $path;
		}
	}

	return '';
}

/**
 * Read raw SVG markup from assets/images with in-request cache.
 *
 * @param string $icon_slug
 * @return string
 */
function motto_styler_get_svg_markup( $icon_slug ) {
	static $cache = array();

	$key = (string) $icon_slug;
	if ( array_key_exists( $key, $cache ) ) {
		return $cache[ $key ];
	}

	$cache[ $key ] = '';
	$path = motto_styler_get_svg_path( $icon_slug );
	if ( $path === '' ) {
		return $cache[ $key ];
	}

	$raw = file_get_contents( $path );
	if ( ! is_string( $raw ) || $raw === '' ) {
		return $cache[ $key ];
	}

	$cache[ $key ] = trim( preg_replace( '/\s+/', ' ', $raw ) );
	return $cache[ $key ];
}

/**
 * Build a base64 SVG data URI from a motto icon slug.
 *
 * @param string $icon_slug
 * @return string
 */
function motto_styler_get_svg_data_uri( $icon_slug ) {
	$svg = motto_styler_get_svg_markup( $icon_slug );
	if ( $svg === '' ) {
		return '';
	}

	return 'data:image/svg+xml;base64,' . base64_encode( $svg );
}



/**
 * Read a data JSON file from src/data.
 *
 * @param string $filename
 * @return array<mixed>
 */
function motto_styler_read_data_json( $filename ) {
	static $cache = array();

	$key = (string) $filename;
	if ( array_key_exists( $key, $cache ) ) {
		return $cache[ $key ];
	}

	$cache[ $key ] = array();

	$base_dir = defined( 'MOTTO_BLOCKS_DIR' ) ? trailingslashit( MOTTO_BLOCKS_DIR ) : trailingslashit( dirname( __DIR__ ) );
	$paths    = array(
		$base_dir . 'src/data/' . $key,
		$base_dir . 'src/styler/data/' . $key,
		$base_dir . 'build/data/' . $key,
	);
	$path     = '';

	foreach ( $paths as $candidate_path ) {
		if ( file_exists( $candidate_path ) ) {
			$path = $candidate_path;
			break;
		}
	}

	if ( $path === '' ) {
		return $cache[ $key ];
	}

	$raw = file_get_contents( $path );
	if ( ! is_string( $raw ) || $raw === '' ) {
		return $cache[ $key ];
	}

	$decoded = json_decode( $raw, true );
	if ( is_array( $decoded ) ) {
		$cache[ $key ] = $decoded;
	}

	return $cache[ $key ];
}

/**
 * Read a config JSON file from /config.
 *
 * @param string $filename
 * @return array<mixed>
 */
function motto_styler_read_config_json( $filename ) {
	static $cache = array();

	$key = (string) $filename;
	if ( array_key_exists( $key, $cache ) ) {
		return $cache[ $key ];
	}

	$cache[ $key ] = array();

	$base_dir = defined( 'MOTTO_BLOCKS_DIR' ) ? trailingslashit( MOTTO_BLOCKS_DIR ) : trailingslashit( dirname( __DIR__ ) );
	$path     = $base_dir . 'config/' . $key;

	if ( ! file_exists( $path ) ) {
		return $cache[ $key ];
	}

	$raw = file_get_contents( $path );
	if ( ! is_string( $raw ) || $raw === '' ) {
		return $cache[ $key ];
	}

	$decoded = json_decode( $raw, true );
	if ( is_array( $decoded ) ) {
		$cache[ $key ] = $decoded;
	}

	return $cache[ $key ];
}

/**
 * Read a shared config JSON file from /config.
 *
 * @param string $filename
 * @return array<mixed>
 */
function motto_styler_read_shared_config_json( $filename ) {
	static $cache = array();

	$key = (string) $filename;
	if ( array_key_exists( $key, $cache ) ) {
		return $cache[ $key ];
	}

	$cache[ $key ] = array();

	$base_dir = defined( 'MOTTO_BLOCKS_DIR' ) ? trailingslashit( MOTTO_BLOCKS_DIR ) : trailingslashit( dirname( __DIR__ ) );
	$path     = $base_dir . 'config/' . $key;

	if ( ! file_exists( $path ) ) {
		return $cache[ $key ];
	}

	$raw = file_get_contents( $path );
	if ( ! is_string( $raw ) || $raw === '' ) {
		return $cache[ $key ];
	}

	$decoded = json_decode( $raw, true );
	if ( is_array( $decoded ) ) {
		$cache[ $key ] = $decoded;
	}

	return $cache[ $key ];
}

/**
 * Normalize and sanitize target block patterns.
 *
 * Supported values:
 * - all / *
 * - namespace
 * - namespace/*
 * - namespace/block
 *
 * @param mixed $value Raw pattern value.
 * @return string
 */
function motto_styler_normalize_target_pattern( $value ) {
	$pattern = strtolower( trim( (string) $value ) );
	if ( $pattern === '' ) {
		return '';
	}

	if ( $pattern === '*' || $pattern === 'all' ) {
		return 'all';
	}

	if ( substr( $pattern, -2 ) === '/*' ) {
		$namespace = sanitize_key( substr( $pattern, 0, -2 ) );
		return $namespace !== '' ? $namespace . '/*' : '';
	}

	if ( strpos( $pattern, '/' ) !== false ) {
		list( $namespace, $block ) = array_pad( explode( '/', $pattern, 2 ), 2, '' );
		$namespace = sanitize_key( $namespace );
		$block     = sanitize_key( $block );
		return ( $namespace !== '' && $block !== '' ) ? ( $namespace . '/' . $block ) : '';
	}

	$namespace = sanitize_key( $pattern );
	return $namespace !== '' ? $namespace : '';
}

/**
 * Required target patterns that must always remain enabled.
 *
 * @return string[]
 */
function motto_styler_get_required_target_patterns() {
	return array(
		'motto/*',
		'core/post-template',
	);
}

/**
 * Sanitize target block patterns list.
 *
 * @param mixed $targets Raw targets list.
 * @return string[]
 */
function motto_styler_sanitize_target_blocks( $targets ) {
	if ( ! is_array( $targets ) ) {
		return array();
	}

	$list = array();
	foreach ( $targets as $pattern ) {
		$normalized = motto_styler_normalize_target_pattern( $pattern );
		if ( $normalized !== '' ) {
			$list[] = $normalized;
		}
	}

	$list = array_values( array_unique( $list ) );
	if ( in_array( 'all', $list, true ) ) {
		return array( 'all' );
	}

	$required_patterns = motto_styler_get_required_target_patterns();
	if ( is_array( $required_patterns ) && ! empty( $required_patterns ) ) {
		$required_list = array();
		foreach ( $required_patterns as $pattern ) {
			$normalized = motto_styler_normalize_target_pattern( $pattern );
			if ( $normalized !== '' ) {
				$required_list[] = $normalized;
			}
		}
		if ( ! empty( $required_list ) ) {
			$list = array_values( array_unique( array_merge( $required_list, $list ) ) );
		}
	}

	return $list;
}

/**
 * Load target block patterns from JSON.
 *
 * @return string[]
 */
function motto_styler_get_target_blocks() {
	static $cached = null;

	if ( $cached !== null ) {
		return $cached;
	}

	$cached = array( 'all' );

	// Read from new key; fall back to legacy key for existing installs.
	$option_value = get_option( 'motto_styler_target_blocks', null );
	if ( ! is_array( $option_value ) ) {
		$option_value = get_option( 'motto_props_target_blocks', null );
	}
	if ( is_array( $option_value ) ) {
		$cached = motto_styler_sanitize_target_blocks( $option_value );
		if ( empty( $cached ) ) {
			$cached = array( 'all' );
		}
		return $cached;
	}

	$base_dir = defined( 'MOTTO_BLOCKS_DIR' ) ? trailingslashit( MOTTO_BLOCKS_DIR ) : trailingslashit( dirname( __DIR__ ) );
	$path     = $base_dir . 'src/data/motto-target-blocks.json';

	if ( ! file_exists( $path ) ) {
		return $cached;
	}

	$raw = file_get_contents( $path );
	if ( ! is_string( $raw ) || $raw === '' ) {
		return $cached;
	}

	$decoded = json_decode( $raw, true );
	if ( ! is_array( $decoded ) || ! isset( $decoded['targets'] ) || ! is_array( $decoded['targets'] ) ) {
		return $cached;
	}

	$list = motto_styler_sanitize_target_blocks( $decoded['targets'] );
	if ( ! empty( $list ) ) {
		$cached = $list;
	}

	return $cached;
}

/**
 * Check whether a block name is targeted by MottoStyler.
 *
 * Supports:
 * - all
 * - namespace (e.g. "core")
 * - namespace/* (e.g. "core/*")
 * - exact block name (e.g. "core/paragraph")
 *
 * @param string $block_name Block name like "core/paragraph".
 * @return bool
 */
function motto_styler_is_target_block( $block_name ) {
	$block_name = strtolower( trim( (string) $block_name ) );
	if ( $block_name === '' ) {
		return false;
	}

	$targets = function_exists( 'motto_styler_get_target_blocks' ) ? motto_styler_get_target_blocks() : array( 'all' );

	foreach ( $targets as $pattern ) {
		$pattern = strtolower( trim( (string) $pattern ) );
		if ( $pattern === '' ) {
			continue;
		}

		if ( $pattern === 'all' || $pattern === '*' ) {
			return true;
		}

		if ( substr( $pattern, -2 ) === '/*' ) {
			$namespace = substr( $pattern, 0, -2 );
			if ( $namespace !== '' && strpos( $block_name, $namespace . '/' ) === 0 ) {
				return true;
			}
			continue;
		}

		if ( strpos( $pattern, '/' ) === false ) {
			if ( strpos( $block_name, $pattern . '/' ) === 0 ) {
				return true;
			}
			continue;
		}

		if ( $block_name === $pattern ) {
			return true;
		}
	}

	return false;
}

/**
 * Get breakpoint definitions (filterable).
 *
 * Each breakpoint entry:
 * - key: matches mottoStyler['css'][key]
 * - media: empty string means "base / no media query"
 *
 * @return array<string,array{media:string}>
 */
function motto_styler_get_breakpoints() {
	$raw         = motto_styler_get_breakpoint_config();
	$breakpoints = array();

	foreach ( $raw as $key => $bp ) {
		if ( ! is_array( $bp ) ) {
			continue;
		}

		$media    = isset( $bp['media'] ) && is_string( $bp['media'] ) ? $bp['media'] : '';
		$max_width = isset( $bp['maxWidth'] ) ? (int) $bp['maxWidth'] : 0;

		if ( $media === '' && $max_width > 0 ) {
			$media = '@media (max-width: ' . $max_width . 'px)';
		}

		$breakpoints[ $key ] = array( 'media' => $media );
	}

	if ( empty( $breakpoints ) ) {
		$breakpoints = [
			'desktop'        => ['media' => ''],
			'tablet'         => ['media' => '@media (max-width: 900px)'],
			'landscapePhone' => ['media' => '@media (max-width: 700px)'],
			'phone'          => ['media' => '@media (max-width: 430px)'],
		];
	}

	$order = function_exists( 'motto_styler_get_css_output_breakpoints_order' )
		? motto_styler_get_css_output_breakpoints_order()
		: array();
	if ( ! empty( $order ) ) {
		$ordered = array();
		foreach ( $order as $key ) {
			$key = (string) $key;
			if ( isset( $breakpoints[ $key ] ) ) {
				$ordered[ $key ] = $breakpoints[ $key ];
			}
		}
		foreach ( $breakpoints as $key => $def ) {
			if ( ! isset( $ordered[ $key ] ) ) {
				$ordered[ $key ] = $def;
			}
		}
		$breakpoints = $ordered;
	}

	return apply_filters('motto_styler_breakpoints', $breakpoints);
}

/**
 * Get CSS output order config from JSON.
 *
 * @return array{order:array<string,mixed>,breakpointsOrder:array<int,string>}
 */
function motto_styler_get_css_output_order_config() {
	static $cached = null;

	if ( $cached !== null ) {
		return $cached;
	}

	$cached = array(
		'order' => array(
			'globalBuckets'  => array( 'class', 'instance', 'conditional' ),
			'instanceSort'   => array( 'depthAsc', 'treeIndexAsc' ),
			'withinInstance' => array( 'base', 'inner' ),
		),
		'breakpointsOrder' => array( 'desktop', 'tablet', 'landscapePhone', 'phone' ),
	);

	$raw = motto_styler_read_data_json( 'motto-css-output-order.json' );
	if ( empty( $raw ) || ! is_array( $raw ) ) {
		return $cached;
	}

	if ( isset( $raw['breakpointsOrder'] ) && is_array( $raw['breakpointsOrder'] ) ) {
		$list = array();
		foreach ( $raw['breakpointsOrder'] as $entry ) {
			$key = trim( (string) $entry );
			if ( $key !== '' ) {
				$list[] = $key;
			}
		}
		if ( ! empty( $list ) ) {
			$cached['breakpointsOrder'] = array_values( array_unique( $list ) );
		}
	}

	if ( isset( $raw['order'] ) && is_array( $raw['order'] ) ) {
		foreach ( array( 'globalBuckets', 'instanceSort', 'withinInstance' ) as $field ) {
			if ( ! isset( $raw['order'][ $field ] ) || ! is_array( $raw['order'][ $field ] ) ) {
				continue;
			}
			$list = array();
			foreach ( $raw['order'][ $field ] as $entry ) {
				$key = trim( (string) $entry );
				if ( $key !== '' ) {
					$list[] = $key;
				}
			}
			if ( ! empty( $list ) ) {
				$cached['order'][ $field ] = array_values( array_unique( $list ) );
			}
		}
	}

	return $cached;
}

/**
 * Get global CSS output bucket order.
 *
 * @return string[]
 */
function motto_styler_get_css_output_bucket_order() {
	$cfg = motto_styler_get_css_output_order_config();
	$list = isset( $cfg['order']['globalBuckets'] ) && is_array( $cfg['order']['globalBuckets'] )
		? $cfg['order']['globalBuckets']
		: array( 'class', 'instance', 'conditional' );
	return array_values( array_unique( array_map( 'strval', $list ) ) );
}

/**
 * Get breakpoint output order.
 *
 * @return string[]
 */
function motto_styler_get_css_output_breakpoints_order() {
	$cfg = motto_styler_get_css_output_order_config();
	$list = isset( $cfg['breakpointsOrder'] ) && is_array( $cfg['breakpointsOrder'] )
		? $cfg['breakpointsOrder']
		: array( 'desktop', 'tablet', 'landscapePhone', 'phone' );
	return array_values( array_unique( array_map( 'strval', $list ) ) );
}

/**
 * Get instance CSS sort rules.
 *
 * @return string[]
 */
function motto_styler_get_css_output_instance_sort() {
	$cfg = motto_styler_get_css_output_order_config();
	$list = isset( $cfg['order']['instanceSort'] ) && is_array( $cfg['order']['instanceSort'] )
		? $cfg['order']['instanceSort']
		: array( 'depthAsc', 'treeIndexAsc' );
	return array_values( array_unique( array_map( 'strval', $list ) ) );
}

/**
 * Get conditional class rules (filterable).
 *
 * Rule schema (flexible):
 * - id (string)
 * - prop (string)                      // CSS property name to match (e.g. "display")
 * - breakpoints ('*'|string[])         // which breakpoints to check
 * - normalize (bool)                   // if true: trim + lowercase prop/value when comparing
 * - match (array)                      // { type, value? }
 *   - type: exists | notExists | equals | in | contains | regex
 * - class (string|string[])            // template(s), supports {bp} {prop} {value} {id}
 *
 * @return array<int,array<string,mixed>>
 */
function motto_styler_get_class_rules() {
	$rules = motto_styler_read_config_json( 'motto-conditional-classes.json' );
	if ( empty( $rules ) || ! is_array( $rules ) ) {
		$rules = motto_styler_read_data_json( 'motto-conditional-classes.json' );
	}

	if (empty($rules)) {
		$rules = [
			// Existing simple rule (still supported).
			[
				'id'          => 'display-flex',
				'prop'        => 'display',
				'breakpoints' => '*',
				'normalize'   => true,
				'match'       => [
					'type'  => 'equals',
					'value' => 'flex',
				],
				'class'       => 'has-display-flex-prop--{bp}',
			],

			// New composite rule: display:flex AND align-items:center
			[
				'id'          => 'flex-aligned-center',
				'breakpoints' => '*',
				'normalize'   => true,
				'conditions'  => [
					[
						'prop'  => 'display',
						'match' => ['type' => 'equals', 'value' => 'flex'],
					],
					[
						'prop'  => 'align-items',
						'match' => ['type' => 'equals', 'value' => 'center'],
					],
				],
				'class'       => 'flex-aligned-centered--{bp}',
			],
		];
	}

	return apply_filters('motto_styler_class_rules', $rules);
}

/**
 * Replace placeholders in class templates.
 *
 * @param string $template
 * @param array  $vars
 * @return string
 */
function motto_styler_template_class($template, array $vars) {
	$out = (string) $template;

	foreach ($vars as $k => $v) {
		$out = str_replace('{' . $k . '}', (string) $v, $out);
	}

	return $out;
}

/**
 * Evaluate a rule match against a value.
 *
 * @param array  $rule
 * @param string $prop
 * @param string $value
 * @param array|null $match_override Optional match array to use instead of $rule['match'].
 * @return bool
 */
function motto_styler_rule_matches(array $rule, $prop, $value, $match_override = null) {
	$match = is_array($match_override)
		? $match_override
		: ((isset($rule['match']) && is_array($rule['match'])) ? $rule['match'] : []);

	$type  = isset($match['type']) ? (string) $match['type'] : 'equals';

	if ($type === 'exists') {
		return true;
	}
	if ($type === 'notExists' || $type === 'not_exists' || $type === 'not-exists') {
		// Resolved at condition level, where property presence is known.
		return false;
	}

	if ($type === 'equals') {
		$expected = isset($match['value']) ? (string) $match['value'] : '';
		return $value === $expected;
	}

	if ($type === 'in') {
		$list = isset($match['value']) && is_array($match['value']) ? $match['value'] : [];
		return in_array($value, array_map('strval', $list), true);
	}

	if ($type === 'contains') {
		$needle = isset($match['value']) ? (string) $match['value'] : '';
		if ($needle === '') {
			return false;
		}
		return strpos($value, $needle) !== false;
	}

	if ($type === 'regex') {
		$pattern = isset($match['value']) ? (string) $match['value'] : '';
		if ($pattern === '') {
			return false;
		}
		return preg_match('/' . $pattern . '/', $value) === 1;
	}

	return false;
}

/**
 * Collect conditional CSS classes for a block based on its saved CSS props.
 *
 * @param array $motto_styler mottoStyler data (css, blockSelectors, etc.).
 * @param array $block       Parsed block array (optional context).
 * @return string[]
 */
function motto_styler_collect_conditional_classes(array $motto_styler, array $block = []) {
	$classes     = [];
	$rules       = motto_styler_get_class_rules();
	$breakpoints = motto_styler_get_breakpoints();

	foreach ($breakpoints as $bp_key => $bp_def) {
		$rows = [];

		if (isset($motto_styler['css'][$bp_key]) && is_array($motto_styler['css'][$bp_key])) {
			$rows = $motto_styler['css'][$bp_key];
		}

		// Build a map: prop => [values...]
		$prop_map = [];

		foreach ($rows as $row) {
			if (! is_array($row)) {
				continue;
			}

			$name  = isset($row['name']) ? trim((string) $row['name']) : '';
			$value = isset($row['value']) ? trim((string) $row['value']) : '';

			if ($name === '') {
				continue;
			}

			if (! isset($prop_map[$name])) {
				$prop_map[$name] = [];
			}

			$prop_map[$name][] = $value;
		}

		foreach ($rules as $rule) {
			if (! is_array($rule)) {
				continue;
			}

			$rule_id   = isset($rule['id']) ? (string) $rule['id'] : '';
			$normalize = ! empty($rule['normalize']);

			// Breakpoint scoping.
			$rule_bps = isset($rule['breakpoints']) ? $rule['breakpoints'] : '*';
			if ($rule_bps !== '*') {
				$list = is_array($rule_bps) ? $rule_bps : [(string) $rule_bps];
				if (! in_array($bp_key, $list, true)) {
					continue;
				}
			}

			// Determine conditions: composite rules use "conditions", simple rules fallback to "prop"+"match".
			$conditions = [];
			if (isset($rule['conditions']) && is_array($rule['conditions']) && ! empty($rule['conditions'])) {
				$conditions = $rule['conditions'];
			} else {
				$rule_prop = isset($rule['prop']) ? (string) $rule['prop'] : '';
				if ($rule_prop !== '') {
					$conditions = [
						[
							'prop'  => $rule_prop,
							'match' => isset($rule['match']) && is_array($rule['match'])
								? $rule['match']
								: ['type' => 'exists'],
						],
					];
				}
			}

			if (empty($conditions)) {
				continue;
			}

			// Evaluate AND across conditions.
			$all_ok = true;
			$primary_prop = '';
			$primary_values = [];

			foreach ($conditions as $cond) {
				if (! is_array($cond)) {
					$all_ok = false;
					break;
				}

				$cond_prop  = isset($cond['prop']) ? trim((string) $cond['prop']) : '';
				$cond_match = isset($cond['match']) && is_array($cond['match'])
					? $cond['match']
					: ['type' => 'exists'];
				$cond_type = isset($cond_match['type']) ? (string) $cond_match['type'] : 'exists';
				$is_not_exists = ($cond_type === 'notExists' || $cond_type === 'not_exists' || $cond_type === 'not-exists');

				if ($cond_prop === '') {
					$all_ok = false;
					break;
				}

				// Find values for this prop in the map (support normalize).
				$found_values = null;

				if (! $normalize) {
					$found_values = $prop_map[$cond_prop] ?? null;
				} else {
					$cond_prop_lc = strtolower($cond_prop);
					foreach ($prop_map as $p => $vals) {
						if (strtolower($p) === $cond_prop_lc) {
							$found_values = $vals;
							break;
						}
					}
				}

				if ($found_values === null || (is_array($found_values) && count($found_values) === 0)) {
					if ($is_not_exists) {
						if ($primary_prop === '') {
							$primary_prop = $cond_prop;
							$primary_values = [];
						}
						continue;
					}
					$all_ok = false;
					break;
				}

				if ($is_not_exists) {
					$all_ok = false;
					break;
				}

				// At least one value must satisfy the match.
				$one_ok = false;
				$matched_values = [];

				foreach ($found_values as $v) {
					$cmp_v = $normalize ? strtolower(trim((string) $v)) : trim((string) $v);

					if (motto_styler_rule_matches($rule, $cond_prop, $cmp_v, $cond_match)) {
						$one_ok = true;
						$matched_values[] = $cmp_v;
					}
				}

				if (! $one_ok) {
					$all_ok = false;
					break;
				}

				if ($primary_prop === '') {
					$primary_prop = $cond_prop;
					$primary_values = ! empty($matched_values) ? array_values(array_unique(array_map('strval', $matched_values))) : [];
				}
			}

			if (! $all_ok) {
				continue;
			}

			// Build class(es).
			$templates = $rule['class'] ?? [];
			if (is_string($templates)) {
				$templates = [$templates];
			}
			if (! is_array($templates)) {
				$templates = [];
			}

			$vars = [
				'bp'    => $bp_key,
				'id'    => $rule_id,
				'prop'  => $primary_prop,
				'value' => ! empty($primary_values) ? (string) $primary_values[0] : '',
			];

			foreach ($templates as $tpl) {
				$template = (string) $tpl;
				if (strpos($template, '{value}') !== false && count($primary_values) > 1) {
					foreach ($primary_values as $matched_value) {
						$cls = motto_styler_template_class($template, array_merge($vars, ['value' => (string) $matched_value]));
						$cls = sanitize_html_class($cls);
						if ($cls !== '') {
							$classes[] = $cls;
						}
					}
					continue;
				}
				$cls = motto_styler_template_class($template, $vars);
				$cls = sanitize_html_class($cls);

				if ($cls !== '') {
					$classes[] = $cls;
				}
			}
		}
	}

	$classes = array_values(array_unique($classes));

	/**
	 * Filter: final conditional classes for a block.
	 *
	 * @param string[] $classes
	 * @param array    $motto_styler
	 * @param array    $block
	 */
	return apply_filters('motto_styler_block_classes', $classes, $motto_styler, $block);
}

/**
 * Sanitize a CSS value to prevent breaking out of <style> tags.
 *
 * This is NOT esc_attr or esc_html on purpose.
 * We want valid CSS, but zero HTML / JS injection vectors.
 */
function motto_styler_sanitize_css_value( $value ) {
	$value = (string) $value;

	// Remove newlines (avoid breaking rules).
	$value = str_replace( array( "\r", "\n" ), ' ', $value );

	// Prevent closing tags or rule blocks.
	$value = str_replace( array( '<', '>', '{', '}' ), '', $value );

	// Extra hardening against tag injection.
	$value = preg_replace( '/<\/?\s*style/mi', '', $value );
	$value = preg_replace( '/<\/?\s*script/mi', '', $value );

	if ( ! motto_styler_is_valid_css_value( $value ) ) {
		return '';
	}

	return trim( $value );
}

/**
 * Validate a CSS value while allowing CSS variables and fallback arguments.
 *
 * @param string $value Raw CSS value.
 * @return bool
 */
function motto_styler_is_valid_css_value( $value ) {
	$value = (string) $value;

	if ( preg_match( '/(?:expression\s*\(|-moz-binding|behavior\s*:|@import)/i', $value ) ) {
		return false;
	}

	if ( preg_match_all( '/url\(\s*([\'"]?)(.*?)\1\s*\)/i', $value, $matches ) ) {
		foreach ( $matches[2] as $raw_url ) {
			$raw_url = trim( html_entity_decode( (string) $raw_url, ENT_QUOTES, 'UTF-8' ) );
			if ( $raw_url === '' ) {
				continue;
			}

			if ( preg_match( '/^(?:javascript|vbscript|file):/i', $raw_url ) ) {
				return false;
			}

			if ( preg_match( '/^data:/i', $raw_url ) && ! preg_match( '/^data:image\//i', $raw_url ) ) {
				return false;
			}
		}
	}

	$offset = 0;

	while ( true ) {
		$start = strpos( $value, 'var(', $offset );
		if ( $start === false ) {
			return true;
		}

		if ( ! motto_styler_is_valid_css_var_call( $value, $start ) ) {
			return false;
		}

		$offset = $start + 4;
	}
}

/**
 * Validate a single CSS var() call from a known start offset.
 *
 * Supports fallback arguments and nested parentheses inside fallback.
 *
 * @param string $value CSS value string.
 * @param int    $start Offset where 'var(' starts.
 * @return bool
 */
function motto_styler_is_valid_css_var_call( $value, $start ) {
	$length = strlen( $value );
	$i = $start + 4;
	$depth = 1;

	while ( $i < $length ) {
		$char = $value[ $i ];

		if ( $char === '(' ) {
			$depth++;
		}

		if ( $char === ')' ) {
			$depth--;
			if ( $depth === 0 ) {
				$args = trim( substr( $value, $start + 4, $i - ( $start + 4 ) ) );
				if ( $args === '' ) {
					return false;
				}

				$comma = strpos( $args, ',' );
				$var_name = $comma === false ? $args : substr( $args, 0, $comma );
				$var_name = trim( $var_name );

				return (bool) preg_match( '/^--[a-zA-Z0-9_\-]+$/', $var_name );
			}
		}

		$i++;
	}

	// Unclosed var() call.
	return false;
}
