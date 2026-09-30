<?php
/**
 * Responsive helpers for MottoStyler.
 *
 * @package Motto_Blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Normalize display value for layout derivation checks.
 *
 * @param string $value Raw CSS display value.
 * @return string
 */
function motto_styler_normalize_display_value( $value ) {
	$normalized = strtolower( trim( (string) $value ) );
	$normalized = preg_replace( '/\s*!important\s*$/i', '', $normalized );
	$normalized = preg_replace( '/\s+/', ' ', $normalized );
	if ( $normalized === 'inline flex' ) {
		return 'inline-flex';
	}
	if ( $normalized === 'inline grid' ) {
		return 'inline-grid';
	}
	if ( $normalized === 'inline block' ) {
		return 'inline-block';
	}
	return $normalized;
}

/**
 * Resolve the effective display value from CSS rows (last declaration wins).
 *
 * @param array $rows CSS rows.
 * @return string
 */
function motto_styler_get_effective_display_value( array $rows ) {
	$resolved = '';
	foreach ( $rows as $row ) {
		if ( ! is_array( $row ) ) {
			continue;
		}
		$name = isset( $row['name'] ) ? strtolower( trim( (string) $row['name'] ) ) : '';
		if ( $name !== 'display' ) {
			continue;
		}
		$value = isset( $row['value'] ) ? motto_styler_normalize_display_value( $row['value'] ) : '';
		if ( $value !== '' ) {
			$resolved = $value;
		}
	}
	return $resolved;
}

/**
 * Pre-compute the resolved display value per breakpoint by carrying the last
 * explicitly declared display value forward (desktop → tablet → phone).
 *
 * @param array $css_map          mottoStyler['css'] keyed by breakpoint.
 * @param array $ordered_bp_keys  Breakpoint keys in cascade order (largest first).
 * @return array  Map of bp_key => resolved display string.
 */
function motto_styler_build_resolved_display_by_bp( array $css_map, array $ordered_bp_keys ) {
	$layer = motto_styler_build_display_layer_by_bp( $css_map, $ordered_bp_keys );
	return isset( $layer['resolvedByBp'] ) && is_array( $layer['resolvedByBp'] ) ? $layer['resolvedByBp'] : array();
}

/**
 * Build a display layer map with explicit declarations and carried values.
 *
 * @param array $css_map         CSS rows keyed by breakpoint.
 * @param array $ordered_bp_keys Breakpoint keys in cascade order.
 * @return array{declaredByBp:array<string,string>,resolvedByBp:array<string,string>}
 */
function motto_styler_build_display_layer_by_bp( array $css_map, array $ordered_bp_keys ) {
	$declared_by_bp = array();
	$resolved = array();
	$carry    = '';
	foreach ( $ordered_bp_keys as $bp ) {
		$rows     = ( isset( $css_map[ $bp ] ) && is_array( $css_map[ $bp ] ) ) ? $css_map[ $bp ] : array();
		$declared = motto_styler_get_effective_display_value( $rows );
		$declared_by_bp[ $bp ] = $declared;
		if ( $declared !== '' ) {
			$carry = $declared;
		}
		$resolved[ $bp ] = $carry;
	}
	return array(
		'declaredByBp' => $declared_by_bp,
		'resolvedByBp' => $resolved,
	);
}

/**
 * Get base layout metadata value for a block name from block.json.
 *
 * @param string $block_name Block name.
 * @return string
 */
function motto_styler_get_base_layout_value_for_block( $block_name ) {
	static $cache = null;

	if ( $cache === null ) {
		$cache = array();
	}

	$key = strtolower( trim( (string) $block_name ) );
	if ( $key === '' ) {
		return '';
	}

	if ( array_key_exists( $key, $cache ) ) {
		return $cache[ $key ];
	}

	$cache[ $key ] = '';
	$parts         = explode( '/', $key, 2 );
	if ( count( $parts ) !== 2 || $parts[1] === '' ) {
		return '';
	}

	$base_dir = defined( 'MOTTO_BLOCKS_DIR' ) ? trailingslashit( MOTTO_BLOCKS_DIR ) : trailingslashit( dirname( __DIR__ ) );
	$paths    = array(
		$base_dir . 'build/blocks/' . $parts[1] . '/block.json',
		$base_dir . 'src/blocks/' . $parts[1] . '/block.json',
	);

	foreach ( $paths as $path ) {
		if ( ! file_exists( $path ) ) {
			continue;
		}
		$raw = file_get_contents( $path );
		if ( ! is_string( $raw ) || $raw === '' ) {
			continue;
		}
		$decoded = json_decode( $raw, true );
		if ( ! is_array( $decoded ) ) {
			continue;
		}
		$layout = strtolower( trim( (string) ( $decoded['mottoBaseLayout'] ?? '' ) ) );
		if ( in_array( $layout, array( 'flow', 'block', 'flex', 'inline-flex', 'grid', 'inline-grid' ), true ) ) {
			$cache[ $key ] = ( 'block' === $layout ) ? 'flow' : $layout;
		}
		break;
	}

	return isset( $cache[ $key ] ) ? $cache[ $key ] : '';
}

/**
 * Get base layout display fallback for a block name.
 *
 * @param string $block_name Block name.
 * @return string
 */
function motto_styler_get_base_layout_display_for_block( $block_name ) {
	$layout = motto_styler_get_base_layout_value_for_block( $block_name );
	if ( $layout === 'flow' ) {
		return 'block';
	}
	return $layout;
}

/**
 * Get base layout CSS class for a block name.
 *
 * @param string $block_name Block name.
 * @return string
 */
function motto_styler_get_base_layout_class_for_block( $block_name ) {
	$layout = motto_styler_get_base_layout_value_for_block( $block_name );
	if ( $layout === '' ) {
		return '';
	}
	return 'motto-base-layout-' . $layout;
}

/**
 * Resolve attached class Styler payloads from cssClasses items.
 *
 * @param mixed $items cssClasses payload.
 * @return array<int,array<string,mixed>>
 */
function motto_styler_resolve_css_class_stylers( $items ) {
	if ( ! is_array( $items ) || empty( $items ) ) {
		return array();
	}

	static $cache = null;
	if ( $cache === null ) {
		$cache = array(
			'by_id' => array(),
			'by_slug' => array(),
		);
	}

	$stylers = array();

	foreach ( $items as $item ) {
		$id       = 0;
		$raw_slug = '';
		if ( is_array( $item ) ) {
			$id       = isset( $item['id'] ) ? (int) $item['id'] : 0;
			$raw_slug = isset( $item['slug'] ) ? (string) $item['slug'] : '';
		} elseif ( is_string( $item ) ) {
			$raw_slug = $item;
		}

		$styler = array();
		if ( $id > 0 ) {
			if ( ! array_key_exists( $id, $cache['by_id'] ) ) {
				$post = get_post( $id );
				if ( $post instanceof WP_Post && $post->post_type === 'motto_css_class' ) {
					$cache['by_id'][ $id ] = function_exists( 'motto_styler_get_css_class_meta_value' )
						? motto_styler_get_css_class_meta_value( $post->ID )
						: array();
				} else {
					$cache['by_id'][ $id ] = array();
				}
			}
			$styler = is_array( $cache['by_id'][ $id ] ) ? $cache['by_id'][ $id ] : array();
		}

		if ( empty( $styler ) ) {
			$slug = sanitize_html_class( $raw_slug );
			if ( $slug !== '' ) {
				if ( ! array_key_exists( $slug, $cache['by_slug'] ) ) {
					$post = get_page_by_path( $slug, OBJECT, 'motto_css_class' );
					if ( $post instanceof WP_Post ) {
						$cache['by_slug'][ $slug ] = function_exists( 'motto_styler_get_css_class_meta_value' )
							? motto_styler_get_css_class_meta_value( $post->ID )
							: array();
					} else {
						$cache['by_slug'][ $slug ] = array();
					}
				}
				$styler = is_array( $cache['by_slug'][ $slug ] ) ? $cache['by_slug'][ $slug ] : array();
			}
		}

		if ( ! empty( $styler ) ) {
			$stylers[] = $styler;
		}
	}

	return $stylers;
}

/**
 * Build attached-class display layer maps for a block.
 *
 * @param array $motto_styler      Block mottoStyler data.
 * @param array $ordered_bp_keys  Breakpoint keys in cascade order.
 * @return array{declaredByBp:array<string,string>,resolvedByBp:array<string,string>}
 */
function motto_styler_build_class_display_layer_by_bp( array $motto_styler, array $ordered_bp_keys ) {
	$items = isset( $motto_styler['cssClasses'] ) && is_array( $motto_styler['cssClasses'] ) ? $motto_styler['cssClasses'] : array();
	if ( empty( $items ) ) {
		return array(
			'declaredByBp' => array(),
			'resolvedByBp' => array(),
		);
	}

	$class_stylers = motto_styler_resolve_css_class_stylers( $items );
	if ( empty( $class_stylers ) ) {
		return array(
			'declaredByBp' => array(),
			'resolvedByBp' => array(),
		);
	}

	$merged_css_map = array();
	foreach ( $ordered_bp_keys as $bp ) {
		$merged_css_map[ $bp ] = array();
		foreach ( $class_stylers as $class_styler ) {
			$rows = ( isset( $class_styler['css'][ $bp ] ) && is_array( $class_styler['css'][ $bp ] ) )
				? $class_styler['css'][ $bp ]
				: array();
			if ( ! empty( $rows ) ) {
				$merged_css_map[ $bp ] = array_merge( $merged_css_map[ $bp ], $rows );
			}
		}
	}

	return motto_styler_build_display_layer_by_bp( $merged_css_map, $ordered_bp_keys );
}

/**
 * Pre-compute the resolved block spacing value per breakpoint by carrying the
 * last explicitly set value forward (desktop → tablet → phone).
 *
 * @param array $spacing_map      mottoStyler['blockSpacing'] keyed by breakpoint.
 * @param array $ordered_bp_keys  Breakpoint keys in cascade order (largest first).
 * @return array  Map of bp_key => resolved spacing string.
 */
function motto_styler_build_resolved_block_spacing_by_bp( array $spacing_map, array $ordered_bp_keys ) {
	$resolved = array();
	$carry    = '';
	foreach ( $ordered_bp_keys as $bp ) {
		$declared = ( isset( $spacing_map[ $bp ] ) && is_string( $spacing_map[ $bp ] ) ) ? trim( $spacing_map[ $bp ] ) : '';
		if ( $declared !== '' ) {
			$carry = $declared;
		}
		$resolved[ $bp ] = $carry;
	}
	return $resolved;
}

/**
 * Split a CSS value by top-level spaces or commas without splitting inside
 * functions such as var() or clamp().
 *
 * @param string $value CSS spacing shorthand value.
 * @return array
 */
function motto_styler_split_top_level_space_tokens( $value ) {
	$input  = is_string( $value ) ? $value : '';
	$tokens = array();
	$current = '';
	$depth = 0;
	$quote = '';
	$length = strlen( $input );

	for ( $index = 0; $index < $length; $index++ ) {
		$char = $input[ $index ];
		$prev = $index > 0 ? $input[ $index - 1 ] : '';

		if ( ( $char === "'" || $char === '"' ) && $prev !== '\\' ) {
			if ( $quote === '' ) {
				$quote = $char;
			} elseif ( $quote === $char ) {
				$quote = '';
			}
		}

		if ( $quote === '' ) {
			if ( $char === '(' ) {
				$depth++;
			}
			if ( $char === ')' ) {
				$depth = max( 0, $depth - 1 );
			}
			if ( $depth === 0 && ( preg_match( '/\s/', $char ) || $char === ',' ) ) {
				$trimmed = trim( $current );
				if ( $trimmed !== '' ) {
					$tokens[] = $trimmed;
				}
				$current = '';
				continue;
			}
		}

		$current .= $char;
	}

	$trimmed = trim( $current );
	if ( $trimmed !== '' ) {
		$tokens[] = $trimmed;
	}

	return $tokens;
}

/**
 * Return the vertical value from a block spacing shorthand.
 *
 * @param string $value CSS spacing shorthand value.
 * @return string
 */
function motto_styler_get_block_spacing_vertical_value( $value ) {
	$tokens = motto_styler_split_top_level_space_tokens( $value );
	return isset( $tokens[0] ) ? $tokens[0] : '';
}

/**
 * Build derived layout rules based on effective display value.
 *
 * @param string $selector         CSS selector.
 * @param string $display_value    Resolved (carried) display value for this breakpoint.
 * @param string $gap_value        Gap value to emit (custom carry or WP core fallback).
 * @return string
 */
function motto_styler_build_derived_layout_rules_for_selector( $selector, $display_value, $gap_value ) {
	if ( ! is_string( $selector ) || $selector === '' || ! is_string( $display_value ) || $display_value === '' ) {
		return '';
	}

	$flex_display_values  = array( 'grid', 'inline-grid', 'flex', 'inline-flex' );
	$block_display_values = array( 'block', 'inline-block', 'inline' );

	$is_flex_layout  = in_array( $display_value, $flex_display_values, true );
	$is_block_layout = in_array( $display_value, $block_display_values, true );
	if ( ! $is_flex_layout && ! $is_block_layout ) {
		return '';
	}

	$bare_selector = preg_replace( '/^(?:html)?:root\s+/', '', $selector );
	$css           = $bare_selector . ' > *{margin-block:0;}';
	if ( $is_flex_layout ) {
		$css .= $bare_selector . '{gap:' . $gap_value . ';}';
	}
	if ( $is_block_layout ) {
		$css .= $bare_selector . ' > * + *{margin-block-start:' . motto_styler_get_block_spacing_vertical_value( $gap_value ) . ';}';
	}

	return $css;
}

/**
 * Append inner selector rules for all breakpoints.
 *
 * Canonical shape:
 * innerSelectors: [
 *   { selector, selectorType, label, description, css: { desktop:[], tablet:[], ... } }
 * ]
 *
 * Back-compat:
 * innerSelectors: { desktop:[{ selector, css:[] }], tablet:[...], ... }
 *
 * @param string $css           Existing CSS accumulator.
 * @param string $base_selector Base selector like ".motto-styler-xxxx" or ":root .motto-styler-xxxx".
 * @param array  $motto_styler   MottoStyler data.
 * @return string
 */

/**
 * Remove :root prefix from selector if present.
 *
 * @param string $selector
 * @return string
 */
function motto_styler_to_bare_selector( $selector ) {
	$s = (string) $selector;
	$s = trim( $s );
	return preg_match( '/^(?:html)?:root\s+/', $s ) ? preg_replace( '/^(?:html)?:root\s+/', '', $s ) : $s;
}

/**
 * Split selector by top-level commas (ignoring commas inside parentheses).
 *
 * @param string $selector
 * @return array<string>
 */
function motto_styler_split_top_level_selectors( $selector ) {
	$result   = array();
	$current  = '';
	$paren_depth = 0;
	$len      = strlen( (string) $selector );

	for ( $i = 0; $i < $len; $i++ ) {
		$char = $selector[ $i ];
		if ( $char === '(' ) {
			$paren_depth++;
		} elseif ( $char === ')' ) {
			$paren_depth--;
		} elseif ( $char === ',' && $paren_depth === 0 ) {
			$trimmed = trim( $current );
			if ( $trimmed !== '' ) {
				$result[] = $trimmed;
			}
			$current = '';
			continue;
		}
		$current .= $char;
	}

	$trimmed = trim( $current );
	if ( $trimmed !== '' ) {
		$result[] = $trimmed;
	}

	return $result;
}

/**
 * Apply :root scope to each top-level selector in a comma-separated list.
 *
 * @param string $selector
 * @return string
 */
function motto_styler_apply_root_scope_to_top_level_selectors( $selector ) {
	$parts = motto_styler_split_top_level_selectors( $selector );
	$scoped = array_map(
		function( $s ) {
			return preg_match( '/^(?:html)?:root/', $s ) ? $s : ':root ' . $s;
		},
		$parts
	);
	return implode( ', ', $scoped );
}

function motto_styler_append_inner_selector_css( $css, $base_selector, array $motto_styler ) {
	if ( ! function_exists( 'motto_styler_normalize_inner_selectors_by_breakpoint' ) ) {
		return $css;
	}

	if ( ! is_string( $base_selector ) || $base_selector === '' ) {
		return $css;
	}

	$breakpoints = function_exists( 'motto_styler_get_breakpoints' ) ? motto_styler_get_breakpoints() : array();
	if ( empty( $breakpoints ) || ! is_array( $breakpoints ) ) {
		return $css;
	}

	$inner_by_bp = motto_styler_normalize_inner_selectors_by_breakpoint( $motto_styler );
	$bare_selector = motto_styler_to_bare_selector( $base_selector );

	foreach ( $breakpoints as $bp_key => $bp_def ) {
		$list = ( isset( $inner_by_bp[ $bp_key ] ) && is_array( $inner_by_bp[ $bp_key ] ) )
			? $inner_by_bp[ $bp_key ]
			: array();

		if ( empty( $list ) ) {
			continue;
		}

		$bp_rules = '';

		foreach ( $list as $sub ) {
			if ( ! is_array( $sub ) ) {
				continue;
			}

			$template = isset( $sub['selector'] ) ? (string) $sub['selector'] : '';
			if ( $template === '' ) {
				continue;
			}

			$token    = '&{BLOCK}';
			$template = function_exists( 'motto_styler_sanitize_composite_template' )
				? motto_styler_sanitize_composite_template( $template )
				: $template;

			if ( strpos( $template, $token ) === false ) {
				continue;
			}

			$full_selector = str_replace( $token, $bare_selector, $template );

			if ( $full_selector === '' || $full_selector === $bare_selector ) {
				continue;
			}

			$scoped_full_selector = motto_styler_apply_root_scope_to_top_level_selectors( $full_selector );

			$sub_rows = ( isset( $sub['css'] ) && is_array( $sub['css'] ) ) ? $sub['css'] : array();
			if ( empty( $sub_rows ) ) {
				continue;
			}

			$sub_declarations = motto_styler_build_css_declarations( $sub_rows );
			$sub_display      = motto_styler_get_effective_display_value( $sub_rows );
		$sub_derived      = $sub_display !== ''
			? motto_styler_build_derived_layout_rules_for_selector( $scoped_full_selector, $sub_display, 'var(--wp--style--block-gap, 1em)' )
			: '';
			if ( $sub_declarations === '' && $sub_derived === '' ) {
				continue;
			}

			if ( $sub_declarations !== '' ) {
				$bp_rules .= $scoped_full_selector . '{' . $sub_declarations . '}';
			}
			$bp_rules .= $sub_derived;
		}

		if ( $bp_rules === '' ) {
			continue;
		}

		$media = ( isset( $bp_def['media'] ) && is_string( $bp_def['media'] ) ) ? trim( $bp_def['media'] ) : '';

		if ( $media === '' ) {
			$css .= $bp_rules;
		} else {
			$css .= $media . '{' . $bp_rules . '}';
		}
	}

	return $css;
}

/**
 * Back-compat wrapper for inner selector appending.
 *
 * @param string $css
 * @param string $base_selector
 * @param array  $motto_styler
 * @return string
 */
function motto_styler_append_subselector_css( $css, $base_selector, array $motto_styler ) {
	return motto_styler_append_inner_selector_css( $css, $base_selector, $motto_styler );
}

/**
 * Read the canonical list of valid standard CSS properties.
 *
 * @return string[]
 */
function motto_styler_get_valid_css_rule_list() {
	static $cached = null;
	if ( $cached !== null ) {
		return $cached;
	}

	$cached = array();
	$raw    = function_exists( 'motto_styler_read_config_json' )
		? motto_styler_read_config_json( 'styler-css-valid-properties.json' )
		: array();
	if ( empty( $raw ) || ! is_array( $raw ) ) {
		$raw = function_exists( 'motto_styler_read_data_json' )
			? motto_styler_read_data_json( 'styler-css-valid-properties.json' )
			: array();
	}

	if ( ! is_array( $raw ) ) {
		return $cached;
	}

	foreach ( $raw as $entry ) {
		$name = strtolower( trim( (string) $entry ) );
		if ( $name !== '' ) {
			$cached[] = $name;
		}
	}

	$cached = array_values( array_unique( $cached ) );
	return $cached;
}

/**
 * Build the canonical allowlist map for standard CSS rule names.
 *
 * @return array<string,bool>
 */
function motto_styler_get_css_rule_allowlist_map() {
	static $runtime_cache = null;
	if ( $runtime_cache !== null ) {
		return $runtime_cache;
	}

	$signature_data = array(
		'version' => defined( 'MOTTO_BLOCKS_VERSION' ) ? MOTTO_BLOCKS_VERSION : '',
		'valid'   => motto_styler_get_valid_css_rule_list(),
	);
	$signature  = md5( wp_json_encode( $signature_data ) );
	$transient_key = 'motto_css_rule_allowlist_' . $signature;

	$cached = get_transient( $transient_key );
	if ( is_array( $cached ) && ! empty( $cached ) ) {
		$runtime_cache = $cached;
		return $runtime_cache;
	}

	$allow_map = array();

	foreach ( motto_styler_get_valid_css_rule_list() as $name ) {
		$allow_map[ $name ] = true;
	}

	$runtime_cache = $allow_map;
	set_transient( $transient_key, $allow_map, 7 * DAY_IN_SECONDS );
	return $runtime_cache;
}

/**
 * Strict validation for CSS rule names.
 *
 * @param string $name Rule name.
 * @return bool
 */
function motto_styler_is_valid_css_rule_name( $name ) {
	$name = strtolower( trim( (string) $name ) );
	if ( $name === '' ) {
		return false;
	}

	// Strict custom property format to prevent unsafe declarations.
	if ( preg_match( '/^--[a-zA-Z0-9\-_]+$/', $name ) ) {
		return true;
	}

	// Standard CSS property format, including vendor-prefixed names.
	if ( ! preg_match( '/^-?[a-zA-Z][a-zA-Z0-9-]*$/', $name ) ) {
		return false;
	}

	$allow_map = motto_styler_get_css_rule_allowlist_map();
	return isset( $allow_map[ $name ] );
}

/**
 * Build CSS declarations for standard CSS properties and CSS custom properties.
 *
 * Expected row shape:
 * [
 *   [ 'name' => 'display', 'value' => 'flex' ],
 *   [ 'name' => '--gap-2', 'value' => '12px' ],
 * ]
 *
 * @param array $rows Rows array.
 * @return string
 */
function motto_styler_build_css_declarations( array $rows ) {
	if ( empty( $rows ) ) {
		return '';
	}

	$declarations = array();

	foreach ( $rows as $row ) {
		if ( ! is_array( $row ) ) {
			continue;
		}
		$name_raw  = $row['name'] ?? '';
		$value_raw = $row['value'] ?? '';
		if ( ! is_scalar( $name_raw ) || ! is_scalar( $value_raw ) ) {
			continue;
		}
		$name  = trim( (string) $name_raw );
		$value = trim( (string) $value_raw );

		if ( $name === '' || $value === '' ) {
			continue;
		}

		if ( ! motto_styler_is_valid_css_rule_name( $name ) ) {
			continue;
		}

		// Sanitize values to prevent breaking out of <style> tags or rule blocks.
		$safe_value = function_exists( 'motto_styler_sanitize_css_value' )
			? motto_styler_sanitize_css_value( $value )
			: str_replace( array( "\r", "\n", '<', '>', '{', '}' ), ' ', $value );

		if ( $safe_value === '' ) {
			continue;
		}

		$declarations[] = $name . ':' . $safe_value . ';';
	}

	return empty( $declarations ) ? '' : implode( '', $declarations );
}

/**
 * Build block CSS using the breakpoint map (responsive).
 *
 * - For each breakpoint, builds selector{declarations}
 * - Wraps breakpoint rules in its media query (except base breakpoint)
 * - Appends innerSelectors rules after base rules
 *
 * @param string $selector    E.g. ".motto-styler-abc123"
 * @param array  $motto_styler The mottoStyler attribute array.
 * @return string
 */
function motto_styler_build_block_css( $selector, array $motto_styler, array $context = array() ) {
	if ( ! is_string( $selector ) || $selector === '' ) {
		return '';
	}

	$breakpoints = function_exists( 'motto_styler_get_breakpoints' ) ? motto_styler_get_breakpoints() : array();
	if ( empty( $breakpoints ) || ! is_array( $breakpoints ) ) {
		return '';
	}

	$css = '';

	$css_map              = isset( $motto_styler['css'] ) && is_array( $motto_styler['css'] ) ? $motto_styler['css'] : array();
	$block_spacing        = isset( $motto_styler['blockSpacing'] ) && is_array( $motto_styler['blockSpacing'] ) ? $motto_styler['blockSpacing'] : array();
	$spacing_enabled      = isset( $block_spacing['enabled'] ) && $block_spacing['enabled'] === true;
	$spacing_values       = isset( $block_spacing['values'] ) && is_array( $block_spacing['values'] ) ? $block_spacing['values'] : array();
	$ordered_bp_keys      = array_keys( $breakpoints );
	$instance_display_map = motto_styler_build_display_layer_by_bp( $css_map, $ordered_bp_keys );
	$class_display_map    = motto_styler_build_class_display_layer_by_bp( $motto_styler, $ordered_bp_keys );
	$base_display         = isset( $context['blockName'] ) ? motto_styler_get_base_layout_display_for_block( $context['blockName'] ) : '';
	$resolved_block_spacing_map = motto_styler_build_resolved_block_spacing_by_bp( $spacing_values, $ordered_bp_keys );

	$base_css  = '';
	foreach ( $breakpoints as $key => $bp ) {
		$rows = ( isset( $motto_styler['css'][ $key ] ) && is_array( $motto_styler['css'][ $key ] ) )
			? $motto_styler['css'][ $key ]
			: array();

		$declarations     = motto_styler_build_css_declarations( $rows );
		$resolved_display = '';
		if ( isset( $instance_display_map['resolvedByBp'][ $key ] ) && $instance_display_map['resolvedByBp'][ $key ] !== '' ) {
			$resolved_display = $instance_display_map['resolvedByBp'][ $key ];
		} elseif ( isset( $class_display_map['resolvedByBp'][ $key ] ) && $class_display_map['resolvedByBp'][ $key ] !== '' ) {
			$resolved_display = $class_display_map['resolvedByBp'][ $key ];
		} else {
			$resolved_display = $base_display;
		}
		$resolved_spacing  = ( $spacing_enabled && isset( $resolved_block_spacing_map[ $key ] ) && is_string( $resolved_block_spacing_map[ $key ] ) )
			? trim( $resolved_block_spacing_map[ $key ] )
			: '';
		$is_gap_set        = $resolved_spacing !== '';
		$resolved_gap      = $resolved_spacing !== '' ? $resolved_spacing : 'var(--wp--style--block-gap, 1em)';
		$effective_display = ( $resolved_display !== '' ) ? $resolved_display : 'block';
		$derived_css       = $is_gap_set
			? motto_styler_build_derived_layout_rules_for_selector( $selector, $effective_display, $resolved_gap )
			: '';
		if ( $declarations === '' && $derived_css === '' ) {
			continue;
		}

		$rule  = '';
		if ( $declarations !== '' ) {
			$rule .= $selector . '{' . $declarations . '}';
		}
		$rule .= $derived_css;
		$media = ( isset( $bp['media'] ) && is_string( $bp['media'] ) ) ? trim( $bp['media'] ) : '';

		// Base rules (no media wrapper).
		if ( $media === '' ) {
			$base_css .= $rule;
			continue;
		}

		// Responsive rules.
		$base_css .= $media . '{' . $rule . '}';
	}

	$css = $base_css . motto_styler_append_inner_selector_css( '', $selector, $motto_styler );

	/**
	 * Filter: allow custom manipulation of the final block CSS output.
	 *
	 * @param string $css
	 * @param string $selector
	 * @param array  $motto_styler
	 */
	return apply_filters( 'motto_styler_css_output', $css, $selector, $motto_styler );
}
