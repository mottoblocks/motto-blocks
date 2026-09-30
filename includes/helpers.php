<?php
/**
 * Shared helper functions for MottoBlocks.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Merge attribute names into a block's `block_bindings_supported_attributes_*`
 * allowlist (WP core's own extension point, since 6.9.0 — see
 * `get_block_bindings_supported_attributes()`, `wp-includes/block-bindings.php`).
 * `role: "content"` in `block.json` is necessary but not sufficient: this
 * allowlist gates both the editor's "Enable overrides" control and the
 * bindings' render-time resolution (`WP_Block::process_block_bindings()`).
 * See `docs/conventions/block-layout.md`'s "Native Pattern Overrides" section
 * for the full recipe (SDD-025, SDD-032 are the reference implementations).
 *
 * @param string[] $supported_attributes Attribute names already supported for this block type.
 * @param string[] $attribute_names      Attribute names to add.
 * @return string[]
 */
function motto_blocks_add_bindings_supported_attributes( $supported_attributes, array $attribute_names ) {
	return array_values(
		array_unique(
			array_merge(
				is_array( $supported_attributes ) ? $supported_attributes : array(),
				$attribute_names
			)
		)
	);
}

/**
 * Build block registration args from explicit path/handle params.
 *
 * Auto-discovers per-block CSS, editor CSS, and frontend JS by convention.
 * Frontend scripts registered here have no extra dependencies — blocks that
 * need custom deps (GSAP, Swiper, etc.) must register their view script manually.
 *
 * @param string $slug           Block slug.
 * @param string $dir            Plugin directory path (trailing slash).
 * @param string $url            Plugin directory URL (trailing slash).
 * @param string $editor_handle  Registered editor script handle.
 * @param string $handle_prefix  Prefix for style/script handles (e.g. 'motto-blocks').
 * @return array
 */
function motto_blocks_build_block_registration_args( $slug, $dir, $url, $editor_handle, $handle_prefix ) {
	$args = array(
		'editor_script_handles' => array( $editor_handle ),
	);

	$style_handles = array();

	if ( wp_style_is( 'motto-blocks-styler-block-base', 'registered' ) ) {
		$style_handles[] = 'motto-blocks-styler-block-base';
	}

	$style_file_path = $dir . 'assets/css/blocks/' . $slug . '.css';
	if ( file_exists( $style_file_path ) ) {
		$style_handle = $handle_prefix . '-' . $slug;
		wp_register_style(
			$style_handle,
			$url . 'assets/css/blocks/' . $slug . '.css',
			array(),
			filemtime( $style_file_path )
		);
		$style_handles[] = $style_handle;
	}

	if ( ! empty( $style_handles ) ) {
		$args['style_handles'] = $style_handles;
	}

	$view_script_file_path = $dir . 'assets/js/' . $slug . '-frontend.js';
	if ( file_exists( $view_script_file_path ) ) {
		$view_script_handle = $handle_prefix . '-' . $slug . '-view';
		wp_register_script(
			$view_script_handle,
			$url . 'assets/js/' . $slug . '-frontend.js',
			array(),
			filemtime( $view_script_file_path ),
			true
		);
		$args['view_script_handles'] = array( $view_script_handle );
	}

	$editor_style_file_path = $dir . 'assets/css/blocks/' . $slug . '.editor.css';
	if ( file_exists( $editor_style_file_path ) ) {
		$editor_style_handle = $handle_prefix . '-' . $slug . '-editor';
		wp_register_style(
			$editor_style_handle,
			$url . 'assets/css/blocks/' . $slug . '.editor.css',
			array(),
			filemtime( $editor_style_file_path )
		);
		$args['editor_style_handles'] = array( $editor_style_handle );
	}

	return $args;
}

/**
 * Core block registration logic shared by Free and Pro.
 *
 * Validates block.json existence and enabled state before registering.
 * $base_args_fn is called only after both checks pass, so asset registration
 * side effects are avoided for missing or disabled blocks.
 *
 * @param string   $slug         Block slug.
 * @param string   $build_dir    Absolute path to the build/blocks/ directory (trailing slash).
 * @param callable $base_args_fn Function that accepts $slug and returns base registration args.
 * @param array    $extra_args   Extra args merged over base args.
 * @return void
 */
function motto_blocks_do_register_block( $slug, $build_dir, callable $base_args_fn, $extra_args = array() ) {
	$block_dir = $build_dir . $slug;
	if ( ! file_exists( $block_dir . '/block.json' ) ) {
		return;
	}

	$block_name = 'motto/' . trim( (string) $slug );
	$skip_enabled_check = ! empty( $extra_args['motto_skip_enabled_check'] );
	unset( $extra_args['motto_skip_enabled_check'] );

	if (
		! $skip_enabled_check &&
		function_exists( 'motto_blocks_is_block_enabled' ) &&
		! motto_blocks_is_block_enabled( $block_name )
	) {
		return;
	}

	$base_args = $base_args_fn( $slug );

	register_block_type(
		$block_dir,
		array_merge( $base_args, $extra_args )
	);
}

/**
 * Render a block's admin-card icon as inline SVG.
 *
 * Reads assets/icons/blocks/<slug>.svg — one file per block, the same file the
 * block's index.jsx imports (`?raw`) for its editor icon. See docs/specs/SDD-033.
 *
 * @param string $slug Block slug (block.json `name` without the namespace).
 * @param array  $args Optional: 'class' (string) added to the <svg>.
 * @return string Inline <svg>…</svg> markup, or '' if the block has no icon file.
 */
function motto_blocks_render_block_icon( $slug, $args = array() ) {
	$slug = sanitize_key( (string) $slug );
	if ( '' === $slug ) {
		return '';
	}

	$path = MOTTO_BLOCKS_DIR . 'assets/icons/blocks/' . $slug . '.svg';
	if ( ! file_exists( $path ) ) {
		return '';
	}

	$svg = motto_blocks_sanitize_svg( (string) file_get_contents( $path ) );
	if ( '' === $svg ) {
		return '';
	}

	$class = isset( $args['class'] ) ? (string) $args['class'] : '';
	if ( '' !== $class ) {
		$svg = preg_replace( '/^<svg\b/', '<svg class="' . esc_attr( $class ) . '"', $svg, 1 );
	}

	return $svg;
}

/**
 * Sanitize SVG markup with a strict allowlist.
 *
 * @param mixed $svg Raw SVG input.
 * @return string
 */
function motto_blocks_sanitize_svg( $svg ) {
	if ( ! is_string( $svg ) ) {
		return '';
	}

	$svg = trim( $svg );
	if ( '' === $svg || false === stripos( $svg, '<svg' ) ) {
		return '';
	}

	// Fast-path blocklist for dangerous constructs before KSES filtering.
	if ( preg_match( '/<\s*(script|iframe|object|embed|foreignObject)\b/i', $svg ) ) {
		return '';
	}
	if ( preg_match( '/\son[a-z]+\s*=/i', $svg ) ) {
		return '';
	}
	if ( preg_match( '/(?:javascript|data)\s*:/i', $svg ) ) {
		return '';
	}

	$svg = motto_blocks_sanitize_svg_style_blocks( $svg );

	$allowed_tags = array(
		'svg'      => array(
			'xmlns'             => true,
			'id'                => true,
			'viewBox'           => true,
			'viewbox'           => true,
			'fill'              => true,
			'stroke'            => true,
			'stroke-width'      => true,
			'stroke-linecap'    => true,
			'stroke-linejoin'   => true,
			'width'             => true,
			'height'            => true,
			'class'             => true,
			'role'              => true,
			'aria-hidden'       => true,
			'focusable'         => true,
			'preserveAspectRatio' => true,
			'preserveaspectratio' => true,
		),
		'g'        => array(
			'id'                => true,
			'class'             => true,
			'clip-path'         => true,
			'fill'              => true,
			'stroke'            => true,
			'stroke-width'      => true,
			'transform'         => true,
		),
		'path'     => array(
			'id'                => true,
			'd'                 => true,
			'class'             => true,
			'clip-path'         => true,
			'fill'              => true,
			'stroke'            => true,
			'stroke-width'      => true,
			'stroke-linecap'    => true,
			'stroke-linejoin'   => true,
			'transform'         => true,
		),
		'circle'   => array(
			'id'                => true,
			'cx'                => true,
			'cy'                => true,
			'r'                 => true,
			'class'             => true,
			'clip-path'         => true,
			'fill'              => true,
			'stroke'            => true,
			'stroke-width'      => true,
		),
		'ellipse'  => array(
			'id'                => true,
			'cx'                => true,
			'cy'                => true,
			'rx'                => true,
			'ry'                => true,
			'class'             => true,
			'clip-path'         => true,
			'fill'              => true,
			'stroke'            => true,
			'stroke-width'      => true,
		),
		'rect'     => array(
			'id'                => true,
			'x'                 => true,
			'y'                 => true,
			'width'             => true,
			'height'            => true,
			'rx'                => true,
			'ry'                => true,
			'class'             => true,
			'clip-path'         => true,
			'fill'              => true,
			'stroke'            => true,
			'stroke-width'      => true,
		),
		'line'     => array(
			'id'                => true,
			'x1'                => true,
			'y1'                => true,
			'x2'                => true,
			'y2'                => true,
			'class'             => true,
			'clip-path'         => true,
			'stroke'            => true,
			'stroke-width'      => true,
			'stroke-linecap'    => true,
		),
		'polyline' => array(
			'id'                => true,
			'points'            => true,
			'class'             => true,
			'clip-path'         => true,
			'fill'              => true,
			'stroke'            => true,
			'stroke-width'      => true,
			'stroke-linecap'    => true,
			'stroke-linejoin'   => true,
		),
		'polygon'  => array(
			'id'                => true,
			'points'            => true,
			'class'             => true,
			'clip-path'         => true,
			'fill'              => true,
			'stroke'            => true,
			'stroke-width'      => true,
			'stroke-linejoin'   => true,
		),
		'defs'     => array(),
		'clipPath' => array(
			'id'                => true,
			'clipPathUnits'     => true,
			'clippathunits'     => true,
		),
		'clippath' => array(
			'id'                => true,
			'clipPathUnits'     => true,
			'clippathunits'     => true,
		),
		'mask'     => array(
			'id'                => true,
			'x'                 => true,
			'y'                 => true,
			'width'             => true,
			'height'            => true,
			'maskUnits'         => true,
			'maskunits'         => true,
			'maskContentUnits'  => true,
			'maskcontentunits'  => true,
		),
		'linearGradient' => array(
			'id'                => true,
			'x1'                => true,
			'y1'                => true,
			'x2'                => true,
			'y2'                => true,
			'gradientUnits'     => true,
			'gradientunits'     => true,
			'gradientTransform' => true,
			'gradienttransform' => true,
			'spreadMethod'      => true,
			'spreadmethod'      => true,
		),
		'lineargradient' => array(
			'id'                => true,
			'x1'                => true,
			'y1'                => true,
			'x2'                => true,
			'y2'                => true,
			'gradientUnits'     => true,
			'gradientunits'     => true,
			'gradientTransform' => true,
			'gradienttransform' => true,
			'spreadMethod'      => true,
			'spreadmethod'      => true,
		),
		'radialGradient' => array(
			'id'                => true,
			'cx'                => true,
			'cy'                => true,
			'r'                 => true,
			'fx'                => true,
			'fy'                => true,
			'fr'                => true,
			'gradientUnits'     => true,
			'gradientunits'     => true,
			'gradientTransform' => true,
			'gradienttransform' => true,
			'spreadMethod'      => true,
			'spreadmethod'      => true,
		),
		'radialgradient' => array(
			'id'                => true,
			'cx'                => true,
			'cy'                => true,
			'r'                 => true,
			'fx'                => true,
			'fy'                => true,
			'fr'                => true,
			'gradientUnits'     => true,
			'gradientunits'     => true,
			'gradientTransform' => true,
			'gradienttransform' => true,
			'spreadMethod'      => true,
			'spreadmethod'      => true,
		),
		'stop'     => array(
			'offset'            => true,
			'stop-color'        => true,
			'stop-opacity'      => true,
		),
		'title'    => array(),
		'desc'     => array(),
		'style'    => array(),
		'animate'  => array(
			'attributeName' => true,
			'attributeType' => true,
			'from'          => true,
			'to'            => true,
			'by'            => true,
			'values'        => true,
			'dur'           => true,
			'begin'         => true,
			'end'           => true,
			'min'           => true,
			'max'           => true,
			'restart'       => true,
			'repeatCount'   => true,
			'repeatDur'     => true,
			'fill'          => true,
			'calcMode'      => true,
			'keyTimes'      => true,
			'keySplines'    => true,
			'additive'      => true,
			'accumulate'    => true,
		),
		'animateTransform' => array(
			'attributeName' => true,
			'attributeType' => true,
			'type'          => true,
			'from'          => true,
			'to'            => true,
			'by'            => true,
			'values'        => true,
			'dur'           => true,
			'begin'         => true,
			'end'           => true,
			'min'           => true,
			'max'           => true,
			'restart'       => true,
			'repeatCount'   => true,
			'repeatDur'     => true,
			'fill'          => true,
			'calcMode'      => true,
			'keyTimes'      => true,
			'keySplines'    => true,
			'additive'      => true,
			'accumulate'    => true,
		),
		'set'      => array(
			'attributeName' => true,
			'attributeType' => true,
			'to'            => true,
			'begin'         => true,
			'dur'           => true,
			'end'           => true,
			'min'           => true,
			'max'           => true,
			'restart'       => true,
			'repeatCount'   => true,
			'repeatDur'     => true,
			'fill'          => true,
		),
	);

	$sanitized = wp_kses( $svg, $allowed_tags );
	$sanitized = motto_blocks_strip_unsafe_svg_animations( $sanitized );

	return ( false !== stripos( $sanitized, '<svg' ) ) ? $sanitized : '';
}

/**
 * Sanitize inline SVG style blocks before KSES preserves them.
 *
 * @param string $svg Raw SVG markup.
 * @return string
 */
function motto_blocks_sanitize_svg_style_blocks( $svg ) {
	if ( '' === $svg || false === stripos( $svg, '<style' ) ) {
		return $svg;
	}

	$sanitized = preg_replace_callback(
		'/<style\b[^>]*>(.*?)<\/style>/is',
		static function( $matches ) {
			$css = isset( $matches[1] ) ? (string) $matches[1] : '';
			$css = motto_blocks_sanitize_inline_svg_style_css( $css );

			return '' !== $css ? '<style>' . $css . '</style>' : '';
		},
		$svg
	);

	return is_string( $sanitized ) ? $sanitized : '';
}

/**
 * Keep inline SVG CSS animation-safe without opening URL or script vectors.
 *
 * @param string $css Raw style block contents.
 * @return string
 */
function motto_blocks_sanitize_inline_svg_style_css( $css ) {
	if ( ! is_string( $css ) ) {
		return '';
	}

	$css = html_entity_decode( $css, ENT_QUOTES | ENT_HTML5, 'UTF-8' );
	$css = preg_replace( '/\/\*.*?\*\//s', '', $css );
	$css = is_string( $css ) ? trim( $css ) : '';

	if ( '' === $css || strlen( $css ) > 10000 ) {
		return '';
	}

	if ( preg_match( '/(?:@import\b|url\s*\(|expression\s*\(|(?:javascript|data|vbscript)\s*:|behavior\s*:|-moz-binding\s*:|[<>])/i', $css ) ) {
		return '';
	}

	return $css;
}

/**
 * Remove SMIL animation elements whose attributeName targets an unsafe
 * property (e.g. event handlers, href, style) instead of a plain visual
 * presentation attribute. wp_kses only validates tag/attribute names, not
 * attribute values, so this closes the gap SMIL opens: `attributeName` can
 * retarget any property on the animated element at runtime, bypassing the
 * static on*= / javascript: checks done earlier.
 *
 * @param string $svg Sanitized SVG markup.
 * @return string
 */
function motto_blocks_strip_unsafe_svg_animations( $svg ) {
	if ( '' === $svg || ( false === stripos( $svg, '<animate' ) && false === stripos( $svg, '<set' ) ) ) {
		return $svg;
	}

	$safe_attribute_names = array(
		'fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-opacity',
		'stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin',
		'opacity', 'transform', 'd', 'x', 'y', 'cx', 'cy', 'r', 'rx', 'ry',
		'width', 'height', 'points', 'x1', 'y1', 'x2', 'y2',
	);

	return preg_replace_callback(
		'/<(?:animate|animateTransform|set)\b[^>]*(?:\/\s*>|>.*?<\/(?:animate|animateTransform|set)\s*>)/is',
		static function( $matches ) use ( $safe_attribute_names ) {
			if ( ! preg_match( '/\sattributeName\s*=\s*("|\')([^"\']*)\1/i', $matches[0], $name_match ) ) {
				return '';
			}

			$attribute_name = strtolower( trim( (string) $name_match[2] ) );

			return in_array( $attribute_name, $safe_attribute_names, true ) ? $matches[0] : '';
		},
		$svg
	);
}

/**
 * Normalize SVG asset media payload.
 *
 * @param mixed $media Raw media payload.
 * @return array<string,mixed>
 */
function motto_blocks_normalize_svg_media_payload( $media ) {
	$source = is_array( $media ) ? $media : array();
	$id     = isset( $source['id'] ) ? (int) $source['id'] : 0;
	$url    = isset( $source['url'] ) ? esc_url_raw( (string) $source['url'] ) : '';

	return array(
		'id'        => max( 0, $id ),
		'url'       => $url,
		'alt'       => isset( $source['alt'] ) ? sanitize_text_field( (string) $source['alt'] ) : '',
		'title'     => isset( $source['title'] ) ? sanitize_text_field( (string) $source['title'] ) : '',
		'width'     => isset( $source['width'] ) ? max( 0, (int) $source['width'] ) : 0,
		'height'    => isset( $source['height'] ) ? max( 0, (int) $source['height'] ) : 0,
		'mime'      => isset( $source['mime'] ) ? sanitize_text_field( (string) $source['mime'] ) : '',
		'inlineSvg' => isset( $source['inlineSvg'] ) ? motto_blocks_sanitize_svg( (string) $source['inlineSvg'] ) : '',
	);
}

/**
 * Normalize SVG asset payload.
 *
 * @param mixed $value Raw asset payload.
 * @return array<string,mixed>
 */
function motto_blocks_normalize_svg_asset( $value ) {
	$source_value = is_array( $value ) ? $value : array();
	$source       = isset( $source_value['source'] ) ? sanitize_key( (string) $source_value['source'] ) : 'lucide';
	if ( ! in_array( $source, array( 'lucide', 'media', 'inline' ), true ) ) {
		$source = 'lucide';
	}

	$svg = isset( $source_value['svg'] ) && is_array( $source_value['svg'] )
		? $source_value['svg']
		: array();

	return array(
		'source' => $source,
		'media'  => motto_blocks_normalize_svg_media_payload(
			isset( $source_value['media'] ) ? $source_value['media'] : array()
		),
		'svg'    => array(
			'lucideIcon' => isset( $svg['lucideIcon'] ) ? sanitize_key( (string) $svg['lucideIcon'] ) : 'star',
			'lucideSvg'  => isset( $svg['lucideSvg'] ) ? motto_blocks_sanitize_svg( (string) $svg['lucideSvg'] ) : '',
			'inline'     => isset( $svg['inline'] ) ? motto_blocks_sanitize_svg( (string) $svg['inline'] ) : '',
		),
	);
}

/**
 * Convert sanitized SVG markup into a responsive block-owned inline SVG.
 *
 * @param string $svg_markup    Raw SVG markup.
 * @param array  $extra_classes Classes to merge onto the root SVG node.
 * @return string
 */
function motto_blocks_prepare_responsive_svg_markup( $svg_markup, $extra_classes = array() ) {
	$sanitized = motto_blocks_sanitize_svg( $svg_markup );
	if ( '' === $sanitized ) {
		return '';
	}

	$prepared = preg_replace_callback(
		'/<svg\b([^>]*)>/i',
		static function( $matches ) use ( $extra_classes ) {
			$attrs = isset( $matches[1] ) ? (string) $matches[1] : '';
			$attrs = preg_replace( '/\s(?:width|height|style)=("|\')[^"\']*\1/i', '', $attrs );
			$attrs = is_string( $attrs ) ? $attrs : '';

			$class_tokens = array();
			if ( preg_match( '/\sclass=("|\')([^"\']*)\1/i', $attrs, $class_match ) ) {
				$class_tokens = preg_split( '/\s+/', trim( (string) $class_match[2] ) );
				$class_tokens = array_filter( array_map( 'trim', $class_tokens ) );
				$attrs        = preg_replace( '/\sclass=("|\')[^"\']*\1/i', '', $attrs );
			}

			foreach ( $extra_classes as $class_name ) {
				$class_name = sanitize_html_class( (string) $class_name );
				if ( '' !== $class_name ) {
					$class_tokens[] = $class_name;
				}
			}

			$class_tokens = array_values( array_unique( array_filter( $class_tokens ) ) );
			$attrs       .= ' focusable="false" aria-hidden="true"';

			if ( ! preg_match( '/\spreserveAspectRatio=("|\')[^"\']*\1/i', $attrs ) ) {
				$attrs .= ' preserveAspectRatio="xMidYMid meet"';
			}
			if ( ! empty( $class_tokens ) ) {
				$attrs .= ' class="' . esc_attr( implode( ' ', $class_tokens ) ) . '"';
			}

			return '<svg' . $attrs . '>';
		},
		$sanitized,
		1
	);

	return is_string( $prepared ) ? $prepared : '';
}

/**
 * Render callback for motto/svg.
 *
 * @param array         $attributes Block attributes.
 * @param string        $content    Saved block content.
 * @param WP_Block|null $block      Block instance.
 * @return string
 */
function motto_blocks_render_svg( $attributes, $content = '', $block = null ) {
	$attributes = is_array( $attributes ) ? $attributes : array();
	$asset      = motto_blocks_normalize_svg_asset( isset( $attributes['svgAsset'] ) ? $attributes['svgAsset'] : array() );

	$wrapper_classes = array(
		'wp-block-motto-svg',
		'motto-svg',
	);
	$base_layout_class = function_exists( 'motto_styler_get_base_layout_class_for_block' )
		? motto_styler_get_base_layout_class_for_block( 'motto/svg' )
		: '';
	if ( '' !== $base_layout_class ) {
		$wrapper_classes[] = $base_layout_class;
	}
	if ( ! empty( $attributes['className'] ) ) {
		$wrapper_classes[] = sanitize_text_field( (string) $attributes['className'] );
	}
	if ( ! empty( $attributes['align'] ) ) {
		$wrapper_classes[] = 'align' . sanitize_key( (string) $attributes['align'] );
	}
	$anchor_attr = ! empty( $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';

	$inner_markup = '';
	if ( 'media' === $asset['source'] && '' !== $asset['media']['url'] ) {
		$inner_markup = sprintf(
			'<img class="motto-svg__image" src="%1$s" alt="%2$s" loading="lazy" decoding="async" />',
			esc_url( $asset['media']['url'] ),
			esc_attr( $asset['media']['alt'] )
		);
	} elseif ( 'inline' === $asset['source'] ) {
		$inner_markup = motto_blocks_prepare_responsive_svg_markup(
			$asset['svg']['inline'],
			array( 'motto-svg__inline', 'motto-svg__inline--custom' )
		);
	} else {
		$lucide_classes = array(
			'motto-svg__inline',
			'motto-svg__inline--lucide',
			'lucide',
		);
		if ( '' !== $asset['svg']['lucideIcon'] ) {
			$lucide_classes[] = 'lucide-' . sanitize_html_class( $asset['svg']['lucideIcon'] );
		}
		$inner_markup = motto_blocks_prepare_responsive_svg_markup(
			$asset['svg']['lucideSvg'],
			$lucide_classes
		);
	}

	if ( '' === $inner_markup ) {
		return '';
	}

	$link_markup = '';
	$link_url    = ! empty( $attributes['linkUrl'] ) ? esc_url( (string) $attributes['linkUrl'] ) : '';
	if ( '' !== $link_url ) {
		$link_markup = sprintf(
			'<a class="motto-svg__link-overlay" href="%1$s"%2$s rel="%3$s" aria-label="%4$s"></a>',
			$link_url,
			! empty( $attributes['linkNewTab'] ) ? ' target="_blank"' : '',
			esc_attr( ! empty( $attributes['linkNoFollow'] ) ? 'noreferrer nofollow' : 'noreferrer' ),
			esc_attr__( 'SVG link', 'motto-blocks' )
		);
	}

	return sprintf(
		'<div class="%1$s"%2$s>%3$s%4$s</div>',
		esc_attr( implode( ' ', array_filter( $wrapper_classes ) ) ),
		$anchor_attr,
		$inner_markup,
		$link_markup
	);
}

/**
 * Determine whether slider navigation is enabled in any mode.
 *
 * @param array       $attributes Block attributes.
 * @return bool
 */
function motto_blocks_has_slider_navigation_enabled( $attributes ) {
	if ( ! is_array( $attributes ) ) {
		return false;
	}

	if ( ! empty( $attributes['navigation'] ) ) {
		return true;
	}

	$responsive_options = isset( $attributes['responsiveOptions'] ) && is_array( $attributes['responsiveOptions'] )
		? $attributes['responsiveOptions']
		: array();

	foreach ( $responsive_options as $mode_options ) {
		if ( is_array( $mode_options ) && ! empty( $mode_options['navigation'] ) ) {
			return true;
		}
	}

	return false;
}

/**
 * Render callback for motto/slider.
 * Sanitizes inline navigation SVG and falls back to default arrows if invalid.
 *
 * @param array         $attributes Block attributes.
 * @param string        $content    Saved block content.
 * @param WP_Block|null $block      Block instance.
 * @return string
 */
function motto_blocks_render_slider( $attributes, $content, $block = null ) {
	$navigation_enabled = motto_blocks_has_slider_navigation_enabled( $attributes );
	if ( ! $navigation_enabled || ! is_string( $content ) || '' === $content ) {
		return $content;
	}

	$navigation_icons = isset( $attributes['navigationIcons'] ) && is_array( $attributes['navigationIcons'] )
		? $attributes['navigationIcons']
		: array();

	foreach ( array( 'prev', 'next' ) as $side ) {
		$side_options = isset( $navigation_icons[ $side ] ) && is_array( $navigation_icons[ $side ] )
			? $navigation_icons[ $side ]
			: array();
		$is_inline_svg = isset( $side_options['type'] ) && 'svg' === $side_options['type'];

		if ( ! $is_inline_svg ) {
			continue;
		}

		// Keep reading legacy raw SVG values, but inline SVG is now selected by type only.
		$inline_svg    = isset( $side_options['svg']['inline'] ) ? $side_options['svg']['inline'] : '';
		if ( ! is_string( $inline_svg ) || '' === $inline_svg ) {
			$inline_svg = isset( $side_options['svg']['raw'] ) ? $side_options['svg']['raw'] : '';
		}
		$sanitized_svg = motto_blocks_sanitize_svg( $inline_svg );
		$button_class  = 'prev' === $side ? 'swiper-button-prev' : 'swiper-button-next';
		$label         = 'prev' === $side ? __( 'Previous slide', 'motto-blocks' ) : __( 'Next slide', 'motto-blocks' );
		$custom_class  = '' !== $sanitized_svg ? ' is-custom-nav-icon' : '';
		$inner_html    = '' !== $sanitized_svg
			? '<span class="motto-slider__nav-icon" aria-hidden="true">' . $sanitized_svg . '</span>'
			: '';

		$replacement = sprintf(
			'<button class="%1$s%2$s" type="button" aria-label="%3$s">%4$s</button>',
			esc_attr( $button_class ),
			esc_attr( $custom_class ),
			esc_attr( $label ),
			$inner_html
		);

		$pattern = '#<button[^>]*class="[^"]*\b' . preg_quote( $button_class, '#' ) . '\b[^"]*"[^>]*>.*?</button>#is';
		$content = preg_replace( $pattern, $replacement, $content, 1 );
	}

	return $content;
}

/**
 * Return Google Maps API key from plugin settings.
 *
 * @return string
 */
function motto_blocks_get_google_maps_api_key() {
	$key = get_option( 'motto_blocks_google_maps_api_key', '' );
	if ( ! is_scalar( $key ) ) {
		return '';
	}

	return trim( (string) $key );
}

/**
 * Normalize and sanitize controls payload for maps block.
 *
 * @param mixed $controls Raw controls payload.
 * @return array<string,bool>
 */
function motto_blocks_normalize_maps_controls( $controls ) {
	$raw = is_array( $controls ) ? $controls : array();

	return array(
		'zoomControl'       => isset( $raw['zoomControl'] ) ? (bool) $raw['zoomControl'] : true,
		'fullscreenControl' => isset( $raw['fullscreenControl'] ) ? (bool) $raw['fullscreenControl'] : true,
		'streetViewControl' => isset( $raw['streetViewControl'] ) ? (bool) $raw['streetViewControl'] : false,
		'mapTypeControl'    => isset( $raw['mapTypeControl'] ) ? (bool) $raw['mapTypeControl'] : false,
	);
}

/**
 * Normalize and sanitize pin icon payload.
 *
 * @param string $icon_type  Pin icon type.
 * @param mixed  $icon_value Pin icon value.
 * @return mixed
 */
function motto_blocks_normalize_maps_pin_icon_value( $icon_type, $icon_value ) {
	if ( 'svg-library' === $icon_type ) {
		$icon_name = is_scalar( $icon_value ) ? sanitize_key( (string) $icon_value ) : 'map-pin';
		return '' !== $icon_name ? $icon_name : 'map-pin';
	}

	if ( 'svg-inline' === $icon_type ) {
		return motto_blocks_sanitize_svg( is_string( $icon_value ) ? $icon_value : '' );
	}

	if ( 'image' === $icon_type ) {
		$image = is_array( $icon_value ) ? $icon_value : array();
		$id    = isset( $image['id'] ) ? (int) $image['id'] : 0;
		$url   = isset( $image['url'] ) ? esc_url_raw( (string) $image['url'] ) : '';

		return array(
			'id'  => max( 0, $id ),
			'url' => $url,
		);
	}

	return '';
}

/**
 * Normalize and sanitize pin color.
 *
 * @param mixed $color Raw color value.
 * @return string
 */
function motto_blocks_normalize_maps_pin_color( $color ) {
	$value = is_scalar( $color ) ? trim( (string) $color ) : '';
	if ( '' === $value ) {
		return '#d93025';
	}

	if ( function_exists( 'sanitize_hex_color' ) ) {
		$hex = sanitize_hex_color( $value );
		if ( '' !== $hex && null !== $hex ) {
			return $hex;
		}
	}

	if ( preg_match( '/^rgba?\([^)]+\)$/i', $value ) || preg_match( '/^hsla?\([^)]+\)$/i', $value ) ) {
		return sanitize_text_field( $value );
	}

	return '#d93025';
}

/**
 * Normalize and sanitize pins payload for maps block.
 *
 * @param mixed $pins Raw pin list.
 * @return array<int,array<string,mixed>>
 */
function motto_blocks_normalize_maps_pins( $pins ) {
	if ( ! is_array( $pins ) ) {
		return array();
	}

	$normalized = array();
	foreach ( $pins as $pin ) {
		if ( ! is_array( $pin ) ) {
			continue;
		}

		$id = isset( $pin['id'] ) ? sanitize_key( (string) $pin['id'] ) : '';
		if ( '' === $id ) {
			$id = wp_unique_id( 'pin-' );
		}

		$lat = isset( $pin['lat'] ) ? (float) $pin['lat'] : 40.7128;
		$lng = isset( $pin['lng'] ) ? (float) $pin['lng'] : -74.006;
		$lat = max( -90, min( 90, $lat ) );
		$lng = max( -180, min( 180, $lng ) );

		$icon_type = isset( $pin['iconType'] ) ? (string) $pin['iconType'] : 'none';
		if ( ! in_array( $icon_type, array( 'none', 'svg-library', 'svg-inline', 'image' ), true ) ) {
			$icon_type = 'none';
		}

		$normalized[] = array(
			'id'          => $id,
			'lat'         => $lat,
			'lng'         => $lng,
			'title'       => isset( $pin['title'] ) ? sanitize_text_field( (string) $pin['title'] ) : '',
			'description' => isset( $pin['description'] ) ? sanitize_textarea_field( (string) $pin['description'] ) : '',
			'url'         => isset( $pin['url'] ) ? esc_url_raw( (string) $pin['url'] ) : '',
			'pinColor'    => motto_blocks_normalize_maps_pin_color( isset( $pin['pinColor'] ) ? $pin['pinColor'] : '' ),
			'iconType'    => $icon_type,
			'iconValue'   => motto_blocks_normalize_maps_pin_icon_value(
				$icon_type,
				isset( $pin['iconValue'] ) ? $pin['iconValue'] : ''
			),
			'iconSvg'     => 'svg-library' === $icon_type && isset( $pin['iconSvg'] ) ? motto_blocks_sanitize_svg( (string) $pin['iconSvg'] ) : '',
		);
	}

	return $normalized;
}

/**
 * Render callback for motto/maps.
 *
 * @param array       $attributes Block attributes.
 * @param string      $content    Saved block content.
 * @param WP_Block|null $block    Block instance.
 * @return string
 */
function motto_blocks_render_maps( $attributes, $content, $block = null ) {
	$attributes = is_array( $attributes ) ? $attributes : array();
	$api_key    = motto_blocks_get_google_maps_api_key();

	if ( wp_script_is( 'motto-blocks-maps-view', 'registered' ) ) {
		wp_enqueue_script( 'motto-blocks-maps-view' );
	}

	$height = isset( $attributes['height'] ) ? (int) $attributes['height'] : 420;
	$height = max( 120, min( 1400, $height ) );

	$center_lat = isset( $attributes['centerLat'] ) ? (float) $attributes['centerLat'] : 40.7128;
	$center_lng = isset( $attributes['centerLng'] ) ? (float) $attributes['centerLng'] : -74.006;
	$center_lat = max( -90, min( 90, $center_lat ) );
	$center_lng = max( -180, min( 180, $center_lng ) );

	$zoom = isset( $attributes['zoom'] ) ? (int) $attributes['zoom'] : 12;
	$zoom = max( 1, min( 21, $zoom ) );

	$map_type = isset( $attributes['mapType'] ) ? sanitize_key( (string) $attributes['mapType'] ) : 'roadmap';
	if ( ! in_array( $map_type, array( 'roadmap', 'satellite', 'hybrid', 'terrain' ), true ) ) {
		$map_type = 'roadmap';
	}

	$controls = motto_blocks_normalize_maps_controls( isset( $attributes['controls'] ) ? $attributes['controls'] : array() );
	$pins     = motto_blocks_normalize_maps_pins( isset( $attributes['pins'] ) ? $attributes['pins'] : array() );

	$wrapper_classes = array(
		'wp-block-motto-maps',
		'motto-maps',
	);
	$base_layout_class = function_exists( 'motto_styler_get_base_layout_class_for_block' )
		? motto_styler_get_base_layout_class_for_block( 'motto/maps' )
		: '';
	if ( '' !== $base_layout_class ) {
		$wrapper_classes[] = $base_layout_class;
	}
	if ( ! empty( $attributes['className'] ) ) {
		$wrapper_classes[] = sanitize_text_field( (string) $attributes['className'] );
	}
	if ( ! empty( $attributes['align'] ) ) {
		$wrapper_classes[] = 'align' . sanitize_key( (string) $attributes['align'] );
	}
	$anchor_attr = ! empty( $attributes['anchor'] ) ? ' id="' . esc_attr( $attributes['anchor'] ) . '"' : '';

	$map_config = array(
		'height'    => $height,
		'centerLat' => $center_lat,
		'centerLng' => $center_lng,
		'zoom'      => $zoom,
		'mapType'   => $map_type,
		'controls'  => $controls,
	);

	$style_attr = 'height:' . (int) $height . 'px;';

	if ( '' === $api_key ) {
		if ( ! is_user_logged_in() ) {
			return '';
		}

		$notice = __( 'Google Maps API key is missing. Configure it in Motto Blocks settings.', 'motto-blocks' );
		if ( current_user_can( 'manage_options' ) ) {
			$settings_url = admin_url( 'admin.php?page=motto-blocks-settings&tab=api' );
			$notice      .= ' ';
			$notice      .= sprintf(
				'<a href="%1$s">%2$s</a>',
				esc_url( $settings_url ),
				esc_html__( 'Open API settings', 'motto-blocks' )
			);
		}

		return sprintf(
			'<div class="%1$s motto-maps--missing-api"%3$s><p class="motto-maps__notice">%2$s</p></div>',
			esc_attr( implode( ' ', array_filter( $wrapper_classes ) ) ),
			wp_kses_post( $notice ),
			$anchor_attr
		);
	}

	$markup = sprintf(
		'<div class="%1$s"%7$s data-api-key="%2$s" data-map-config="%3$s" data-pins="%4$s" data-user-logged-in="%6$s"><div class="motto-maps__canvas" style="%5$s"></div></div>',
		esc_attr( implode( ' ', array_filter( $wrapper_classes ) ) ),
		esc_attr( $api_key ),
		esc_attr( wp_json_encode( $map_config ) ),
		esc_attr( wp_json_encode( $pins ) ),
		esc_attr( $style_attr ),
		is_user_logged_in() ? '1' : '0',
		$anchor_attr
	);

	return $markup;
}
