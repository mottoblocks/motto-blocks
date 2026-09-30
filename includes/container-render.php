<?php
/**
 * motto/container render extension: Free-owned data hooks for a dynamic
 * background image and a dynamic link overlay. See docs/specs/SDD-031.
 *
 * Free fires MOTTO_HOOK_CONTAINER_BACKGROUND / MOTTO_HOOK_CONTAINER_LINK with a
 * `null` default and does no HTML parsing when nothing overrides them. Pro (or
 * any other plugin) contributes only resolved values — a background override
 * array, or a link URL string — never touching $html directly. Free owns the
 * markup mutation because it owns the markup shape produced by its own save().
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Whether the Container background must stay a real <div> with CSS
 * background-* declarations, because backgroundRepeat/backgroundAttachment
 * have no <img> equivalent (tiling, background-attachment:fixed). Mirrors
 * containerBackgroundNeedsDivFallback() in src/blocks/container/index.jsx —
 * keep both in sync.
 *
 * @param array $attrs Block attributes.
 * @return bool
 */
function motto_blocks_container_bg_needs_div( array $attrs ) {
	$repeat     = isset( $attrs['backgroundRepeat'] ) ? trim( (string) $attrs['backgroundRepeat'] ) : '';
	$attachment = isset( $attrs['backgroundAttachment'] ) ? trim( (string) $attrs['backgroundAttachment'] ) : '';

	return ( '' !== $repeat && 'no-repeat' !== $repeat ) || 'fixed' === $attachment;
}

/**
 * Merge required container background classes with existing classes, for
 * the `.motto-container__bg-media` <div> wrapper. `is-parallax` only
 * belongs here in the <div> fallback (no child media element) — in the
 * default <img>/<video>-child path it lives on the child instead, see
 * motto_blocks_merge_container_media_child_class().
 *
 * @param string $existing_class Existing class attribute value.
 * @param array  $attrs          Block attributes.
 * @return string
 */
function motto_blocks_merge_container_background_class( $existing_class, array $attrs ) {
	$tokens = preg_split( '/\s+/', trim( (string) $existing_class ) );
	$tokens = array_values( array_filter( array_map( 'trim', is_array( $tokens ) ? $tokens : array() ) ) );
	$tokens = array_values( array_diff( $tokens, array( 'is-parallax' ) ) );

	if ( ! in_array( 'motto-container__bg-media', $tokens, true ) ) {
		$tokens[] = 'motto-container__bg-media';
	}

	if ( motto_blocks_container_bg_needs_div( $attrs ) && ! empty( $attrs['backgroundParallax'] ) ) {
		$tokens[] = 'is-parallax';
	}

	return implode( ' ', array_values( array_unique( $tokens ) ) );
}

/**
 * Merge the `is-parallax` token into the wrapper's <img>/<video> child
 * class list. Only reached when Container isn't using the <div> fallback —
 * parallax always lives on the child in that path, never the wrapper.
 *
 * @param string $existing_class Existing class attribute value.
 * @param array  $attrs          Block attributes.
 * @return string
 */
function motto_blocks_merge_container_media_child_class( $existing_class, array $attrs ) {
	$tokens = preg_split( '/\s+/', trim( (string) $existing_class ) );
	$tokens = array_values( array_filter( array_map( 'trim', is_array( $tokens ) ? $tokens : array() ) ) );
	$tokens = array_values( array_diff( $tokens, array( 'is-parallax' ) ) );

	if ( ! empty( $attrs['backgroundParallax'] ) ) {
		$tokens[] = 'is-parallax';
	}

	return implode( ' ', array_values( array_unique( $tokens ) ) );
}

/**
 * Class merge for the legacy (pre-wrapper) `.motto-container__bg-image`
 * shape. Still hit on the frontend for content saved before Container
 * moved to the `.motto-container__bg-media` <div>+<img> wrapper — a static
 * block replays whatever HTML was serialized at save time, so old posts
 * keep rendering the old markup until re-saved.
 *
 * @param string $existing_class Existing class attribute value.
 * @param array  $attrs          Block attributes.
 * @return string
 */
function motto_blocks_merge_legacy_container_bg_image_class( $existing_class, array $attrs ) {
	$tokens = preg_split( '/\s+/', trim( (string) $existing_class ) );
	$tokens = array_values( array_filter( array_map( 'trim', is_array( $tokens ) ? $tokens : array() ) ) );
	$tokens = array_values( array_diff( $tokens, array( 'is-parallax' ) ) );

	if ( ! in_array( 'motto-container__bg-image', $tokens, true ) ) {
		$tokens[] = 'motto-container__bg-image';
	}

	if ( ! empty( $attrs['backgroundParallax'] ) ) {
		$tokens[] = 'is-parallax';
	}

	return implode( ' ', array_values( array_unique( $tokens ) ) );
}

/**
 * Splice a resolved dynamic background into a rendered motto/container.
 *
 * $override['style']/$override['object_style'] are fully-computed inline
 * style strings supplied by whoever resolved the dynamic source (e.g. Pro) —
 * they depend on the dynamically-resolved attachment (focal point lookup,
 * parallax offset), which only the resolver knows. Everything else here
 * (which wrapper shape exists, which classes belong on it) is derived from
 * $attrs alone, which this function already has.
 *
 * @param string $html     Rendered block HTML.
 * @param array  $override ['url','attachment_id','style','object_style'] — see SDD-031 §5.1.
 * @param array  $attrs    Block attributes.
 * @return string
 */
function motto_blocks_apply_container_background_override( $html, array $override, array $attrs ) {
	$url          = trim( (string) ( $override['url'] ?? '' ) );
	$style        = (string) ( $override['style'] ?? '' );
	$object_style = (string) ( $override['object_style'] ?? '' );
	$class        = motto_blocks_merge_container_background_class( '', $attrs );

	if ( '' === $url ) {
		return $html;
	}

	$needs_div_fallback = motto_blocks_container_bg_needs_div( $attrs );

	if ( class_exists( 'WP_HTML_Tag_Processor' ) && '' !== $html ) {
		// Current shape: `.motto-container__bg-media` <div> wrapper,
		// either self-painted (repeat/fixed fallback, no child) or
		// wrapping an <img> child (default path).
		$processor = new WP_HTML_Tag_Processor( $html );
		while ( $processor->next_tag( 'div' ) ) {
			if ( ! $processor->has_class( 'motto-container__bg-media' ) ) {
				continue;
			}

			$processor->set_attribute(
				'class',
				motto_blocks_merge_container_background_class( (string) $processor->get_attribute( 'class' ), $attrs )
			);

			if ( $needs_div_fallback ) {
				$processor->set_attribute( 'style', $style );
				return $processor->get_updated_html();
			}

			// Our own save() always puts the <img> as the wrapper's only
			// child whenever this wrapper exists in non-fallback mode —
			// safe to grab the very next tag.
			if ( $processor->next_tag( 'img' ) ) {
				$processor->set_attribute( 'src', esc_url( $url ) );
				$processor->set_attribute( 'style', $object_style );
				$processor->set_attribute(
					'class',
					motto_blocks_merge_container_media_child_class( (string) $processor->get_attribute( 'class' ), $attrs )
				);
			}
			return $processor->get_updated_html();
		}

		// Legacy shape from before the <div> wrapper existed — a static
		// block replays whatever HTML was serialized at save time, so
		// posts saved before this change still render the old markup
		// until re-saved.
		$processor = new WP_HTML_Tag_Processor( $html );
		while ( $processor->next_tag( 'div' ) ) {
			if ( ! $processor->has_class( 'motto-container__bg-image' ) ) {
				continue;
			}

			$processor->set_attribute( 'style', $style );
			$processor->set_attribute(
				'class',
				motto_blocks_merge_legacy_container_bg_image_class( (string) $processor->get_attribute( 'class' ), $attrs )
			);
			return $processor->get_updated_html();
		}
	}

	if ( false !== strpos( $html, 'motto-container__bg-media' ) ) {
		if ( $needs_div_fallback ) {
			return preg_replace_callback(
				'/(<div[^>]*class=")([^"]*motto-container__bg-media[^"]*)("[^>]*style=")[^"]*(")/i',
				function ( $matches ) use ( $attrs, $style ) {
					return $matches[1]
						. esc_attr( motto_blocks_merge_container_background_class( $matches[2], $attrs ) )
						. $matches[3]
						. esc_attr( $style )
						. $matches[4];
				},
				$html,
				1
			);
		}

		return preg_replace(
			'/(<div[^>]*class="[^"]*motto-container__bg-media[^"]*"[^>]*>\s*<img[^>]*\bsrc=")[^"]*(")/i',
			'${1}' . esc_url( $url ) . '${2}',
			$html,
			1
		);
	}

	if ( false !== strpos( $html, 'motto-container__bg-image' ) ) {
		return preg_replace_callback(
			'/(<div[^>]*class=")([^"]*motto-container__bg-image[^"]*)("[^>]*style=")[^"]*(")/i',
			function ( $matches ) use ( $attrs, $style ) {
				return $matches[1]
					. esc_attr( motto_blocks_merge_legacy_container_bg_image_class( $matches[2], $attrs ) )
					. $matches[3]
					. esc_attr( $style )
					. $matches[4];
			},
			$html,
			1
		);
	}

	// No bg node was saved at all (fully dynamic source, never picked a
	// static image) — build one from scratch as the container's first
	// child, matching the markup order.
	if ( $needs_div_fallback ) {
		$bg_node = '<div class="' . esc_attr( $class ) . '" style="' . esc_attr( $style ) . '" aria-hidden="true"></div>';
	} else {
		$child_class = motto_blocks_merge_container_media_child_class( '', $attrs );
		$img_html    = sprintf(
			'<img%1$s src="%2$s" alt="" style="%3$s" />',
			'' !== $child_class ? ' class="' . esc_attr( $child_class ) . '"' : '',
			esc_url( $url ),
			esc_attr( $object_style )
		);
		$bg_node = '<div class="' . esc_attr( $class ) . '" aria-hidden="true">' . $img_html . '</div>';
	}

	$opening_tag_end = strpos( $html, '>' );
	if ( false !== $opening_tag_end ) {
		return substr( $html, 0, $opening_tag_end + 1 ) . $bg_node . substr( $html, $opening_tag_end + 1 );
	}

	return $html;
}

add_filter(
	'render_block_motto/container',
	function ( $html, $parsed_block, $block_instance ) {
		$attrs    = isset( $parsed_block['attrs'] ) && is_array( $parsed_block['attrs'] ) ? $parsed_block['attrs'] : array();
		$override = apply_filters( MOTTO_HOOK_CONTAINER_BACKGROUND, null, $attrs, $block_instance );

		if ( ! is_array( $override ) || '' === trim( (string) ( $override['url'] ?? '' ) ) ) {
			return $html;
		}

		return motto_blocks_apply_container_background_override( $html, $override, $attrs );
	},
	10,
	3
);

/**
 * Splice a resolved dynamic link into a rendered motto/container's link
 * overlay. `target`/`rel` are derived from Free-schema attrs
 * (linkContainerNewTab/linkContainerNoFollow) here, not passed in — only the
 * URL is genuinely something a resolver (e.g. Pro) uniquely knows.
 *
 * @param string $html  Rendered block HTML.
 * @param string $url   Resolved link URL (already validated non-empty).
 * @param array  $attrs Block attributes.
 * @return string
 */
function motto_blocks_apply_container_link_override( $html, $url, array $attrs ) {
	$target   = ! empty( $attrs['linkContainerNewTab'] ) ? ' target="_blank"' : '';
	$nofollow = ! empty( $attrs['linkContainerNoFollow'] ) ? 'noreferrer nofollow' : 'noreferrer';
	$link_tag = '<a class="motto-container__link-overlay" href="' . esc_url( $url ) . '"'
		. $target . ' rel="' . esc_attr( $nofollow ) . '" aria-label="' . esc_attr__( 'Container link', 'motto-blocks' ) . '"></a>';

	if ( class_exists( 'WP_HTML_Tag_Processor' ) ) {
		$processor = new WP_HTML_Tag_Processor( $html );
		while ( $processor->next_tag( 'a' ) ) {
			if ( $processor->has_class( 'motto-container__link-overlay' ) ) {
				$processor->set_attribute( 'href', $url );
				if ( ! empty( $attrs['linkContainerNewTab'] ) ) {
					$processor->set_attribute( 'target', '_blank' );
				} else {
					$processor->remove_attribute( 'target' );
				}
				$processor->set_attribute( 'rel', $nofollow );
				return $processor->get_updated_html();
			}
		}
	} elseif ( false !== strpos( $html, 'motto-container__link-overlay' ) ) {
		return preg_replace(
			'/(<a[^>]*class="[^"]*motto-container__link-overlay[^"]*"[^>]*href=")[^"]*(")/i',
			'${1}' . esc_url( $url ) . '${2}',
			$html,
			1
		);
	}

	$tag      = preg_replace( '/[^a-z0-9]/', '', strtolower( (string) ( $attrs['tagName'] ?? 'div' ) ) );
	$close    = '</' . $tag . '>';
	$last_pos = strrpos( $html, $close );
	if ( false !== $last_pos ) {
		return substr( $html, 0, $last_pos ) . $link_tag . $close;
	}

	return $html;
}

/**
 * Splice resolved Pattern Overrides (Block Bindings) values for
 * linkContainerUrl/linkContainerNewTab/linkContainerNoFollow into the
 * rendered link overlay (SDD-032).
 *
 * WP core's own generic block-bindings render-time substitution
 * (`WP_Block::replace_html()`, private, `source: "attribute"` case) resolves
 * the tag to patch via `WP_HTML_Tag_Processor::next_tag(['tag_name' =>
 * $selector])` — `tag_name` only ever matches a bare HTML tag name, never a
 * CSS class selector. `linkContainerUrl`'s `selector` in block.json
 * (`.motto-container__link-overlay`) has to stay a class selector for the
 * *editor*-side (JS) attribute source parser, which does support real CSS
 * selectors — but that means core's PHP-side substitution silently no-ops
 * for it. A bare `"a"` selector isn't a safe substitute either: this block
 * can contain arbitrary inner blocks that may render their own `<a>` tags
 * *before* the link overlay (which is always the last sibling), so
 * `next_tag(['tag_name' => 'a'])` could patch the wrong anchor. Free does
 * the splice itself instead, reusing the same class-scoped
 * `WP_HTML_Tag_Processor` lookup `motto_blocks_apply_container_link_override()`
 * already uses for the Pro dynamic-link override below.
 *
 * `linkContainerNewTab`/`linkContainerNoFollow` have no `source` at all (same
 * treatment as `mediaId` on `motto/image`, SDD-025) — they're still
 * comment-persisted booleans, not markup-derived strings, so there's nothing
 * for WP's own substitution to even attempt for them; the override's
 * resolved value only ever reaches `$block_instance->attributes`, never the
 * HTML, so Free has to translate it into `target`/`rel` itself regardless.
 *
 * `$block_instance->attributes[...]` reflects binding-resolved values
 * (`WP_Block::render()` merges them in before firing `render_block_{$name}`);
 * `$parsed_block['attrs'][...]` holds the original, pre-binding values from
 * the parsed block comment (usually absent for `linkContainerUrl` on
 * freshly-saved content, since `source`-based attributes are never
 * serialized into the comment — present only for content saved before it
 * gained a `source`; always present for the two boolean attributes, which
 * stay comment-persisted either way). Resolved vs. original differing is
 * what signals an active override — this avoids needing to inspect
 * `metadata.bindings` directly.
 *
 * @param string   $html          Rendered block HTML.
 * @param array    $parsed_block  Parsed block, pre-binding-resolution attrs.
 * @param WP_Block $block_instance Block instance with binding-resolved attributes.
 * @return string
 */
add_filter(
	'render_block_motto/container',
	function ( $html, $parsed_block, $block_instance ) {
		$resolved = is_array( $block_instance->attributes ?? null ) ? $block_instance->attributes : array();
		$original = isset( $parsed_block['attrs'] ) && is_array( $parsed_block['attrs'] ) ? $parsed_block['attrs'] : array();

		$original_url = isset( $original['linkContainerUrl'] ) ? trim( (string) $original['linkContainerUrl'] ) : '';

		// linkContainerUrl has a `source`, so it's omitted from the parsed
		// comment on freshly-saved content — `$resolved['linkContainerUrl']`
		// falls back to the schema default ("") whenever the override didn't
		// touch the URL itself (e.g. only new-tab/no-follow were changed on
		// this instance). Fall back to the container's own URL in that case
		// instead of treating "no resolved URL" as "no override at all" —
		// that used to make the whole splice bail out below, silently
		// dropping a legitimate new-tab/no-follow-only override.
		$resolved_url = isset( $resolved['linkContainerUrl'] ) && is_string( $resolved['linkContainerUrl'] ) && '' !== trim( $resolved['linkContainerUrl'] )
			? trim( $resolved['linkContainerUrl'] )
			: $original_url;

		if ( '' === $resolved_url ) {
			return $html;
		}

		$resolved_new_tab  = ! empty( $resolved['linkContainerNewTab'] );
		$original_new_tab  = ! empty( $original['linkContainerNewTab'] );
		$resolved_no_follow = ! empty( $resolved['linkContainerNoFollow'] );
		$original_no_follow = ! empty( $original['linkContainerNoFollow'] );

		$has_override = ( $resolved_url !== $original_url )
			|| ( $resolved_new_tab !== $original_new_tab )
			|| ( $resolved_no_follow !== $original_no_follow );

		if ( ! $has_override ) {
			return $html;
		}

		$overridden_attrs = array_merge(
			$original,
			array(
				'linkContainerUrl'      => $resolved_url,
				'linkContainerNewTab'   => $resolved_new_tab,
				'linkContainerNoFollow' => $resolved_no_follow,
			)
		);

		return motto_blocks_apply_container_link_override( $html, $resolved_url, $overridden_attrs );
	},
	10,
	3
);

add_filter(
	'render_block_motto/container',
	function ( $html, $parsed_block, $block_instance ) {
		$attrs = isset( $parsed_block['attrs'] ) && is_array( $parsed_block['attrs'] ) ? $parsed_block['attrs'] : array();
		$url   = apply_filters( MOTTO_HOOK_CONTAINER_LINK, null, $attrs, $block_instance );
		$url   = is_string( $url ) ? trim( $url ) : '';

		if ( '' === $url ) {
			return $html;
		}

		return motto_blocks_apply_container_link_override( $html, $url, $attrs );
	},
	11,
	3
);

/**
 * Opt motto/container's link identity attributes into WordPress's native
 * Block Bindings / Pattern Overrides UI (SDD-032).
 *
 * `role: "content"` on linkContainerUrl/linkContainerNewTab/linkContainerNoFollow
 * (src/blocks/container/block.json) is necessary but not sufficient: WP core
 * also hardcodes an allowlist of eligible block types in
 * `get_block_bindings_supported_attributes()` (wp-includes/block-bindings.php,
 * since 6.9.0), which gates both the editor's "Enable overrides" control and
 * the bindings' render-time resolution (`WP_Block::process_block_bindings()`).
 * This filter is core's own extension point for adding a third-party block to
 * that allowlist. Same recipe as includes/image-render.php's motto/image
 * filter (SDD-025); parity with `core/button`, which marks its own
 * `url`/`linkTarget`/`rel` all `role: "content"` too.
 *
 * @param string[] $supported_attributes Attribute names already supported for this block type.
 * @return string[]
 */
add_filter(
	'block_bindings_supported_attributes_motto/container',
	function ( $supported_attributes ) {
		return motto_blocks_add_bindings_supported_attributes(
			$supported_attributes,
			array( 'linkContainerUrl', 'linkContainerNewTab', 'linkContainerNoFollow' )
		);
	}
);
