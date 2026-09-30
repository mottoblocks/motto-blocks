<?php
/**
 * Dynamic Styler CSS injection for editor preview contexts (BlockPreview,
 * template chooser, pattern preview iframes).
 *
 * The PHP path here is the source of truth for those iframes; the main
 * editor canvas uses a reactive JS runtime that dedupes against the marker
 * comments this code prepends to each <style> tag.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Return post statuses that can appear in editor preview content.
 *
 * @return string[]
 */
function motto_blocks_get_template_preview_post_statuses() {
	return array( 'publish', 'private', 'draft', 'future', 'pending', 'auto-draft' );
}

/**
 * Recursively collect dynamic Styler CSS used by parsed blocks.
 *
 * @param array $blocks Parsed blocks.
 * @param array $state  Mutable css collection.
 * @param array $ctx    Mutable traversal state.
 * @return void
 */
function motto_blocks_collect_template_preview_styler_css( array $blocks, array &$state, array &$ctx = array() ) {
	if ( ! isset( $ctx['visitedReusableRefs'] ) || ! is_array( $ctx['visitedReusableRefs'] ) ) {
		$ctx['visitedReusableRefs'] = array();
	}
	if ( ! isset( $ctx['visitedTemplatePartRefs'] ) || ! is_array( $ctx['visitedTemplatePartRefs'] ) ) {
		$ctx['visitedTemplatePartRefs'] = array();
	}
	if ( ! isset( $ctx['visitedPatternSlugs'] ) || ! is_array( $ctx['visitedPatternSlugs'] ) ) {
		$ctx['visitedPatternSlugs'] = array();
	}

	foreach ( $blocks as $block ) {
		if ( ! is_array( $block ) ) {
			continue;
		}

		$attrs      = ( isset( $block['attrs'] ) && is_array( $block['attrs'] ) ) ? $block['attrs'] : array();
		$block_name = isset( $block['blockName'] ) ? (string) $block['blockName'] : '';
		$motto      = function_exists( 'motto_styler_resolve_styler_attributes' )
			? motto_styler_resolve_styler_attributes( $attrs )
			: array();

		if ( is_array( $motto ) && ! empty( $motto ) ) {
			$instance_raw = isset( $motto['instanceId'] ) ? $motto['instanceId'] : '';
			$instance_id  = function_exists( 'motto_styler_sanitize_instance_id' )
				? motto_styler_sanitize_instance_id( $instance_raw )
				: sanitize_html_class( (string) $instance_raw );
			if ( is_string( $instance_id ) && '' !== $instance_id && function_exists( 'motto_styler_build_block_css' ) ) {
				$class = 'motto-styler-' . $instance_id;
				$css   = motto_styler_build_block_css( 'html:root .' . $class, $motto, array( 'blockName' => $block_name ) );
				if ( is_string( $css ) && '' !== $css ) {
					$state['instance'][ $class ] = $css;
				}
			}

			$css_classes = isset( $motto['cssClasses'] ) && is_array( $motto['cssClasses'] ) ? $motto['cssClasses'] : array();
			if ( ! empty( $css_classes ) && function_exists( 'motto_styler_resolve_css_class_items' ) ) {
				$resolved_css_classes = motto_styler_resolve_css_class_items( $css_classes );
				foreach ( array( 'classes', 'conditional' ) as $bucket ) {
					$resolved_slugs = isset( $resolved_css_classes[ $bucket ] ) && is_array( $resolved_css_classes[ $bucket ] )
						? $resolved_css_classes[ $bucket ]
						: array();
					foreach ( $resolved_slugs as $resolved_slug ) {
						$slug = sanitize_html_class( (string) $resolved_slug );
						if ( '' !== $slug ) {
							$state['classes'][ $slug ] = true;
						}
					}
				}
			} else {
				foreach ( $css_classes as $item ) {
					$slug = '';
					if ( is_array( $item ) ) {
						$slug = isset( $item['slug'] ) ? sanitize_html_class( (string) $item['slug'] ) : '';
					} elseif ( is_string( $item ) ) {
						$slug = sanitize_html_class( $item );
					}
					if ( '' !== $slug ) {
						$state['classes'][ $slug ] = true;
					}
				}
			}

			if ( function_exists( 'motto_styler_collect_conditional_classes' ) ) {
				$conditional_classes = motto_styler_collect_conditional_classes( $motto, $block );
				if ( is_array( $conditional_classes ) ) {
					foreach ( $conditional_classes as $conditional_class ) {
						$slug = sanitize_html_class( (string) $conditional_class );
						if ( '' !== $slug ) {
							$state['classes'][ $slug ] = true;
						}
					}
				}
			}
		}

		if ( 'core/block' === $block_name && function_exists( 'motto_styler_get_reusable_block_ref_id' ) ) {
			$ref_id = (int) motto_styler_get_reusable_block_ref_id( $block );
			if ( $ref_id > 0 && empty( $ctx['visitedReusableRefs'][ $ref_id ] ) ) {
				$ctx['visitedReusableRefs'][ $ref_id ] = true;
				$ref_post = get_post( $ref_id );
				$statuses = motto_blocks_get_template_preview_post_statuses();
				if ( $ref_post instanceof WP_Post && 'wp_block' === $ref_post->post_type && in_array( $ref_post->post_status, $statuses, true ) && '' !== (string) $ref_post->post_content ) {
					motto_blocks_collect_template_preview_styler_css( parse_blocks( (string) $ref_post->post_content ), $state, $ctx );
				}
			}
			continue;
		}

		if ( 'core/template-part' === $block_name && function_exists( 'motto_styler_get_template_part_ref' ) ) {
			$ref     = motto_styler_get_template_part_ref( $block );
			$ref_key = is_array( $ref ) && isset( $ref['key'] ) ? (string) $ref['key'] : '';
			if ( '' !== $ref_key && empty( $ctx['visitedTemplatePartRefs'][ $ref_key ] ) ) {
				$ctx['visitedTemplatePartRefs'][ $ref_key ] = true;
				$tp_content = motto_blocks_get_template_part_preview_content( $ref );
				if ( '' !== $tp_content ) {
					motto_blocks_collect_template_preview_styler_css( parse_blocks( $tp_content ), $state, $ctx );
				}
			}
			continue;
		}

		if ( 'core/pattern' === $block_name ) {
			$pattern_slug = isset( $attrs['slug'] ) ? sanitize_text_field( (string) $attrs['slug'] ) : '';
			if ( '' !== $pattern_slug && empty( $ctx['visitedPatternSlugs'][ $pattern_slug ] ) ) {
				$ctx['visitedPatternSlugs'][ $pattern_slug ] = true;
				$pattern_content = motto_blocks_get_registered_pattern_content( $pattern_slug );
				if ( '' !== $pattern_content ) {
					motto_blocks_collect_template_preview_styler_css( parse_blocks( $pattern_content ), $state, $ctx );
				}
			}
			continue;
		}

		$inner = ( isset( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ) ? $block['innerBlocks'] : array();
		if ( ! empty( $inner ) ) {
			motto_blocks_collect_template_preview_styler_css( $inner, $state, $ctx );
		}
	}
}

/**
 * Resolve template part block content for CSS collection, trying DB then theme file.
 *
 * @param array{key:string,id:int,slug:string,theme:string}|null $ref Template part reference.
 * @return string Block content, or empty string if not found.
 */
function motto_blocks_get_template_part_preview_content( $ref ) {
	$post = motto_blocks_find_template_preview_template_part_post( $ref );
	if ( $post instanceof WP_Post && '' !== (string) $post->post_content ) {
		return (string) $post->post_content;
	}

	if ( ! function_exists( 'get_block_template' ) ) {
		return '';
	}
	$slug = is_array( $ref ) && isset( $ref['slug'] ) ? trim( (string) $ref['slug'] ) : '';
	if ( '' === $slug ) {
		return '';
	}
	$theme    = is_array( $ref ) && ! empty( $ref['theme'] ) ? trim( (string) $ref['theme'] ) : get_stylesheet();
	$template = get_block_template( $theme . '//' . $slug, 'wp_template_part' );
	return ( $template instanceof WP_Block_Template && ! empty( $template->content ) )
		? (string) $template->content
		: '';
}

/**
 * Find a template part for editor previews, including non-public editor statuses.
 *
 * @param array{key:string,id:int,slug:string,theme:string}|null $ref Template part reference.
 * @return WP_Post|null
 */
function motto_blocks_find_template_preview_template_part_post( $ref ) {
	if ( ! is_array( $ref ) ) {
		return null;
	}

	$statuses = motto_blocks_get_template_preview_post_statuses();
	if ( ! empty( $ref['id'] ) ) {
		$post = get_post( (int) $ref['id'] );
		return ( $post instanceof WP_Post && 'wp_template_part' === $post->post_type && in_array( $post->post_status, $statuses, true ) ) ? $post : null;
	}

	$slug = isset( $ref['slug'] ) ? trim( (string) $ref['slug'] ) : '';
	if ( '' === $slug ) {
		return null;
	}

	$args = array(
		'post_type'           => 'wp_template_part',
		'post_status'         => $statuses,
		'numberposts'         => 1,
		'name'                => $slug,
		'suppress_filters'    => false,
		'no_found_rows'       => true,
		'update_post_meta_cache' => false,
		'update_post_term_cache' => false,
	);

	$theme          = isset( $ref['theme'] ) ? trim( (string) $ref['theme'] ) : '';
	$resolved_theme = '' !== $theme ? $theme : get_stylesheet();
	if ( taxonomy_exists( 'wp_theme' ) ) {
		$args['tax_query'] = array(
			array(
				'taxonomy' => 'wp_theme',
				'field'    => 'slug',
				'terms'    => array( $resolved_theme ),
			),
		);
	}

	$posts = get_posts( $args );
	return ( ! empty( $posts ) && $posts[0] instanceof WP_Post ) ? $posts[0] : null;
}

/**
 * Read registered block pattern content by slug.
 *
 * @param string $slug Pattern slug.
 * @return string
 */
function motto_blocks_get_registered_pattern_content( $slug ) {
	$slug = trim( (string) $slug );
	if ( '' === $slug || ! class_exists( 'WP_Block_Patterns_Registry' ) ) {
		return '';
	}

	$registry = WP_Block_Patterns_Registry::get_instance();
	if ( ! $registry || ! method_exists( $registry, 'get_registered' ) ) {
		return '';
	}

	$pattern = $registry->get_registered( $slug );
	return is_array( $pattern ) && isset( $pattern['content'] ) ? (string) $pattern['content'] : '';
}

/**
 * Collect Styler CSS from all registered block patterns.
 *
 * @param array $state Mutable css collection.
 * @return void
 */
function motto_blocks_collect_registered_pattern_preview_styler_css( array &$state ) {
	if ( ! class_exists( 'WP_Block_Patterns_Registry' ) || ! function_exists( 'parse_blocks' ) ) {
		return;
	}

	$registry = WP_Block_Patterns_Registry::get_instance();
	if ( ! $registry || ! method_exists( $registry, 'get_all_registered' ) ) {
		return;
	}

	$patterns = $registry->get_all_registered();
	if ( ! is_array( $patterns ) || empty( $patterns ) ) {
		return;
	}

	$ctx = array();
	foreach ( $patterns as $pattern ) {
		$content = is_array( $pattern ) && isset( $pattern['content'] ) ? (string) $pattern['content'] : '';
		if ( '' === $content ) {
			continue;
		}
		motto_blocks_collect_template_preview_styler_css( parse_blocks( $content ), $state, $ctx );
	}
}

/**
 * Transient key caching the computed preview Styler CSS (see
 * motto_blocks_get_template_preview_dynamic_styler_css()). Invalidated
 * explicitly on save/delete of the content types it's derived from; the TTL
 * below is only a safety net.
 */
define( 'MOTTO_BLOCKS_TEMPLATE_PREVIEW_STYLER_CSS_TRANSIENT', 'motto_blocks_tpl_preview_styler_css' );

/**
 * Compute (or return cached) dynamic Styler class/instance CSS gathered from
 * every template, template part, reusable block, and registered pattern.
 *
 * This scan is expensive (parses every template/part/reusable block on the
 * site), so results are cached in a transient and only recomputed when a
 * save/delete on one of those content types invalidates it.
 *
 * @return array{class_css:string,style_css:string}
 */
function motto_blocks_get_template_preview_dynamic_styler_css() {
	$cached = get_transient( MOTTO_BLOCKS_TEMPLATE_PREVIEW_STYLER_CSS_TRANSIENT );
	if ( is_array( $cached ) && isset( $cached['class_css'], $cached['style_css'] ) ) {
		return $cached;
	}

	$state = array(
		'classes'  => array(),
		'instance' => array(),
	);
	$ctx = array();

	// Collect from all templates and template parts (both DB and theme-file).
	if ( function_exists( 'get_block_templates' ) ) {
		foreach ( array( 'wp_template', 'wp_template_part' ) as $tpl_type ) {
			$all_templates = get_block_templates( array(), $tpl_type );
			foreach ( $all_templates as $tpl ) {
				if ( ! ( $tpl instanceof WP_Block_Template ) ) {
					continue;
				}
				$content = (string) ( $tpl->content ?? '' );
				if ( '' === $content ) {
					continue;
				}
				motto_blocks_collect_template_preview_styler_css( parse_blocks( $content ), $state, $ctx );
			}
		}
	}

	// Collect from reusable blocks (wp_block), not covered by get_block_templates().
	$reusable_posts = get_posts(
		array(
			'post_type'              => 'wp_block',
			'post_status'            => motto_blocks_get_template_preview_post_statuses(),
			'numberposts'            => -1,
			'suppress_filters'       => false,
			'no_found_rows'          => true,
			'update_post_meta_cache' => false,
			'update_post_term_cache' => false,
		)
	);
	foreach ( $reusable_posts as $post ) {
		if ( ! ( $post instanceof WP_Post ) ) {
			continue;
		}
		$content = (string) $post->post_content;
		if ( '' === $content ) {
			continue;
		}
		motto_blocks_collect_template_preview_styler_css( parse_blocks( $content ), $state, $ctx );
	}

	motto_blocks_collect_registered_pattern_preview_styler_css( $state );

	$class_css = '';
	if ( ! empty( $state['classes'] ) && function_exists( 'motto_styler_build_css_class_rules' ) ) {
		$class_css = motto_styler_build_css_class_rules( array_keys( $state['classes'] ) );
	}

	$style_css = motto_styler_build_frontend_styles_css(
		array(
			'class'       => '',
			'instance'    => implode( '', array_values( $state['instance'] ) ),
			'conditional' => '',
		)
	);

	$result = array(
		'class_css' => $class_css,
		'style_css' => $style_css,
	);
	set_transient( MOTTO_BLOCKS_TEMPLATE_PREVIEW_STYLER_CSS_TRANSIENT, $result, DAY_IN_SECONDS );

	return $result;
}

/**
 * Clear the cached preview Styler CSS. Hooked to save/delete of every
 * content type motto_blocks_get_template_preview_dynamic_styler_css() reads.
 *
 * @return void
 */
function motto_blocks_clear_template_preview_dynamic_styler_css_cache() {
	delete_transient( MOTTO_BLOCKS_TEMPLATE_PREVIEW_STYLER_CSS_TRANSIENT );
}
add_action( 'save_post_wp_template', 'motto_blocks_clear_template_preview_dynamic_styler_css_cache' );
add_action( 'save_post_wp_template_part', 'motto_blocks_clear_template_preview_dynamic_styler_css_cache' );
add_action( 'save_post_wp_block', 'motto_blocks_clear_template_preview_dynamic_styler_css_cache' );
add_action( 'save_post_motto_css_class', 'motto_blocks_clear_template_preview_dynamic_styler_css_cache' );
add_action( 'before_delete_post', 'motto_blocks_clear_template_preview_dynamic_styler_css_cache' );

/**
 * Inject dynamic Styler class/instance CSS for preview-only editor contexts.
 *
 * This PHP path is the source of truth for BlockPreview/template chooser/pattern
 * preview iframes. WordPress serializes $settings['styles'] as anonymous <style>
 * tags, so we prepend marker comments that the main editor canvas JS runtime can
 * detect and remove when both paths are present in the same document.
 *
 * @param array                   $settings Block editor settings.
 * @param WP_Block_Editor_Context $context  Block editor context.
 * @return array
 */
function motto_blocks_add_template_preview_dynamic_styler_css( $settings, $context ) {
	$context_name = isset( $context->name ) ? (string) $context->name : '';
	$skip_contexts = array( 'core/edit-widgets', 'core/customize-widgets' );
	if ( in_array( $context_name, $skip_contexts, true ) ) {
		return $settings;
	}

	if ( ! function_exists( 'parse_blocks' ) || ! function_exists( 'motto_styler_build_frontend_styles_css' ) ) {
		return $settings;
	}

	$css       = motto_blocks_get_template_preview_dynamic_styler_css();
	$class_css = $css['class_css'];
	$style_css = $css['style_css'];

	if ( '' === $class_css && '' === $style_css ) {
		return $settings;
	}
	if ( ! isset( $settings['styles'] ) || ! is_array( $settings['styles'] ) ) {
		$settings['styles'] = array();
	}
	if ( '' !== $class_css ) {
		$settings['styles'][] = array(
			// Marker comment is used by editor-style-registry.jsx to dedupe this
			// preview snapshot from the main editor canvas when Gutenberg renders
			// both the PHP snapshot and the reactive JS runtime in the same iframe.
			'css'    => "/* motto-blocks-preview-styler-classes */\n" . $class_css,
			'source' => 'motto-blocks-styler-editor-classes',
		);
	}
	if ( '' !== $style_css ) {
		$settings['styles'][] = array(
			// Marker comment is used by editor-style-registry.jsx to dedupe this
			// preview snapshot from the main editor canvas when Gutenberg renders
			// both the PHP snapshot and the reactive JS runtime in the same iframe.
			'css'    => "/* motto-blocks-preview-styler-styles */\n" . $style_css,
			'source' => 'motto-blocks-styler-editor-styles',
		);
	}

	return $settings;
}
add_filter( 'block_editor_settings_all', 'motto_blocks_add_template_preview_dynamic_styler_css', 30, 2 );
