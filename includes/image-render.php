<?php
/**
 * motto/image render extension: Free-owned data hook for a dynamic image
 * source. See docs/specs/SDD-031 §5.4.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Merge the `is-parallax` token into the image's class list. `imageParallax`
 * is a Free-schema attribute (src/blocks/image/block.json), so this is pure
 * `$attrs` knowledge — a resolver never needs to compute or pass it.
 *
 * @param string $existing_class Existing class attribute value.
 * @param array  $attrs          Block attributes.
 * @return string
 */
function motto_blocks_get_image_parallax_class( $existing_class, array $attrs ) {
	$tokens = preg_split( '/\s+/', trim( (string) $existing_class ) );
	$tokens = array_values( array_filter( array_map( 'trim', is_array( $tokens ) ? $tokens : array() ) ) );
	$tokens = array_values( array_diff( $tokens, array( 'is-parallax' ) ) );

	if ( ! in_array( 'motto-image__media', $tokens, true ) ) {
		$tokens[] = 'motto-image__media';
	}

	if ( ! empty( $attrs['imageParallax'] ) ) {
		$tokens[] = 'is-parallax';
	}

	return implode( ' ', array_values( array_unique( $tokens ) ) );
}

/**
 * Build the `--motto-parallax-offset` inline style declaration for the
 * image's parallax runtime, from Free-schema attrs alone.
 *
 * @param array $attrs Block attributes.
 * @return string
 */
function motto_blocks_get_image_parallax_style_declaration( array $attrs ) {
	if ( empty( $attrs['imageParallax'] ) ) {
		return '';
	}

	$offset = isset( $attrs['imageParallaxOffset'] ) ? (float) $attrs['imageParallaxOffset'] : 120;
	$offset = max( 20, min( 400, $offset ) );

	return '--motto-parallax-offset: ' . $offset . 'px;';
}

/**
 * Splice a resolved dynamic image source into a rendered motto/image.
 *
 * @param string $html    Rendered block HTML (may be empty — see SDD-031 §5.4).
 * @param array  $payload ['url','alt','title','width','height'] — resolved by whoever supplied it (e.g. Pro).
 * @param array  $attrs   Block attributes.
 * @return string
 */
function motto_blocks_apply_image_dynamic_source( $html, array $payload, array $attrs ) {
	$url = trim( (string) ( $payload['url'] ?? '' ) );
	if ( '' === $url ) {
		return $html;
	}

	$alt            = (string) ( $payload['alt'] ?? '' );
	$title          = trim( (string) ( $payload['title'] ?? '' ) );
	$width          = isset( $payload['width'] ) ? (int) $payload['width'] : 0;
	$height         = isset( $payload['height'] ) ? (int) $payload['height'] : 0;
	$position       = trim( (string) ( $attrs['objectPosition'] ?? '' ) );
	$parallax_style = motto_blocks_get_image_parallax_style_declaration( $attrs );

	if ( '' === $html ) {
		$extra_class = trim( (string) ( $attrs['className'] ?? '' ) );
		$class       = 'wp-block-motto-image motto-image' . ( $extra_class ? ' ' . $extra_class : '' );
		$img_class   = motto_blocks_get_image_parallax_class( 'motto-image__media', $attrs );
		$img_style   = trim( ( '' !== $position ? 'object-position: ' . $position . '; ' : '' ) . $parallax_style );

		return sprintf(
			'<div class="%1$s"><img class="%2$s" src="%3$s" alt="%4$s"%5$s%6$s%7$s%8$s /></div>',
			esc_attr( $class ),
			esc_attr( $img_class ),
			esc_url( $url ),
			esc_attr( $alt ),
			'' !== $title ? ' title="' . esc_attr( $title ) . '"' : '',
			'' !== $img_style ? ' style="' . esc_attr( $img_style ) . '"' : '',
			$width > 0 ? ' width="' . esc_attr( (string) $width ) . '"' : '',
			$height > 0 ? ' height="' . esc_attr( (string) $height ) . '"' : ''
		);
	}

	if ( class_exists( 'WP_HTML_Tag_Processor' ) ) {
		$processor = new WP_HTML_Tag_Processor( $html );
		if ( $processor->next_tag( 'img' ) ) {
			$processor->set_attribute( 'src', esc_url( $url ) );
			$processor->set_attribute( 'alt', $alt );
			$processor->set_attribute(
				'class',
				motto_blocks_get_image_parallax_class( (string) $processor->get_attribute( 'class' ), $attrs )
			);

			if ( '' !== $title ) {
				$processor->set_attribute( 'title', $title );
			} else {
				$processor->remove_attribute( 'title' );
			}

			if ( $width > 0 ) {
				$processor->set_attribute( 'width', (string) $width );
			} else {
				$processor->remove_attribute( 'width' );
			}

			if ( $height > 0 ) {
				$processor->set_attribute( 'height', (string) $height );
			} else {
				$processor->remove_attribute( 'height' );
			}

			$existing_style = (string) $processor->get_attribute( 'style' );
			$updated_style  = preg_replace( '/(?:^|;)\s*object-position\s*:\s*[^;]+/i', '', $existing_style );
			$updated_style  = preg_replace( '/(?:^|;)\s*--motto-parallax-offset\s*:\s*[^;]+/i', '', (string) $updated_style );
			$updated_style  = trim( (string) $updated_style );
			$updated_style  = '' !== $updated_style ? rtrim( $updated_style, ';' ) . '; ' : '';
			if ( '' !== $position ) {
				$updated_style .= 'object-position: ' . $position . '; ';
			}
			$updated_style .= $parallax_style;
			$processor->set_attribute( 'style', trim( $updated_style ) );

			return $processor->get_updated_html();
		}
	}

	$img_class = motto_blocks_get_image_parallax_class( 'motto-image__media', $attrs );
	$img_style = trim( ( '' !== $position ? 'object-position: ' . $position . '; ' : '' ) . $parallax_style );

	$img_html = sprintf(
		'<img class="%1$s" src="%2$s" alt="%3$s"%4$s%5$s%6$s%7$s />',
		esc_attr( $img_class ),
		esc_url( $url ),
		esc_attr( $alt ),
		'' !== $title ? ' title="' . esc_attr( $title ) . '"' : '',
		'' !== $img_style ? ' style="' . esc_attr( $img_style ) . '"' : '',
		$width > 0 ? ' width="' . esc_attr( (string) $width ) . '"' : '',
		$height > 0 ? ' height="' . esc_attr( (string) $height ) . '"' : ''
	);

	$last_div_close = strrpos( $html, '</div>' );
	if ( false !== $last_div_close ) {
		return substr( $html, 0, $last_div_close ) . $img_html . substr( $html, $last_div_close );
	}

	return preg_replace( '/(<img\b[^>]*\bsrc=")[^"]*(")/i', '$1' . esc_url( $url ) . '$2', $html, 1 );
}

/**
 * Opt motto/image's markup-derived content attributes into WordPress's
 * native Block Bindings / Pattern Overrides UI (SDD-025).
 *
 * `role: "content"` on the block.json attributes (src/blocks/image/block.json)
 * is necessary but not sufficient: WP core also hardcodes an allowlist of
 * eligible block types in `get_block_bindings_supported_attributes()`
 * (wp-includes/block-bindings.php, since 6.9.0), which gates both the
 * editor's "Enable overrides" control and the bindings' render-time
 * resolution (`WP_Block::process_block_bindings()`). This filter is core's
 * own extension point for adding a third-party block to that allowlist.
 *
 * @param string[] $supported_attributes Attribute names already supported for this block type.
 * @return string[]
 */
add_filter(
	'block_bindings_supported_attributes_motto/image',
	function ( $supported_attributes ) {
		return motto_blocks_add_bindings_supported_attributes(
			$supported_attributes,
			array( 'mediaId', 'url', 'alt', 'title' )
		);
	}
);

add_filter(
	'render_block_motto/image',
	function ( $html, $parsed_block, $block_instance ) {
		$attrs   = isset( $parsed_block['attrs'] ) && is_array( $parsed_block['attrs'] ) ? $parsed_block['attrs'] : array();
		$payload = apply_filters( MOTTO_HOOK_IMAGE_SOURCE, null, $attrs, $block_instance );

		if ( ! is_array( $payload ) ) {
			// No filter registered, or a dynamic source isn't configured for
			// this instance — leave save()'s own output untouched.
			return $html;
		}

		if ( empty( $payload ) ) {
			// A dynamic source was configured but resolved to nothing. save()
			// leaves an img-less .motto-image wrapper in that case — suppress
			// it entirely instead of rendering an empty container.
			if ( '' !== $html && false === strpos( $html, '<img' ) ) {
				return '';
			}
			return $html;
		}

		return motto_blocks_apply_image_dynamic_source( $html, $payload, $attrs );
	},
	10,
	3
);
