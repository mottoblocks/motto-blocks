<?php

/**
 * Frontend rendering: collect MottoStyler desktop CSS and print a single stylesheet.
 */

if (! defined('ABSPATH')) {
	exit;
}

if ( ! defined( 'MOTTO_STYLER_FRONT_CSS_META_KEY' ) ) {
	define( 'MOTTO_STYLER_FRONT_CSS_META_KEY', '_motto_styler_front_css' );
}
if ( ! defined( 'MOTTO_STYLER_FRONT_DEPS_META_KEY' ) ) {
	define( 'MOTTO_STYLER_FRONT_DEPS_META_KEY', '_motto_styler_front_deps' );
}
if ( ! defined( 'MOTTO_STYLER_FRONT_SIGNATURE_META_KEY' ) ) {
	define( 'MOTTO_STYLER_FRONT_SIGNATURE_META_KEY', '_motto_styler_front_signature' );
}
if ( ! defined( 'MOTTO_STYLER_FRONT_BUILT_AT_META_KEY' ) ) {
	define( 'MOTTO_STYLER_FRONT_BUILT_AT_META_KEY', '_motto_styler_front_built_at' );
}
if ( ! defined( 'MOTTO_STYLER_FRONT_BUILDER_VERSION_META_KEY' ) ) {
	define( 'MOTTO_STYLER_FRONT_BUILDER_VERSION_META_KEY', '_motto_styler_front_builder_version' );
}
if ( ! defined( 'MOTTO_STYLER_FRONT_BREAKPOINTS_SIGNATURE_META_KEY' ) ) {
	define( 'MOTTO_STYLER_FRONT_BREAKPOINTS_SIGNATURE_META_KEY', '_motto_styler_front_breakpoints_signature' );
}
if ( ! defined( 'MOTTO_STYLER_FRONT_CONTEXT_META_KEY' ) ) {
	define( 'MOTTO_STYLER_FRONT_CONTEXT_META_KEY', '_motto_styler_front_context' );
}
if ( ! defined( 'MOTTO_STYLER_FRONT_DEPENDENTS_META_KEY' ) ) {
	define( 'MOTTO_STYLER_FRONT_DEPENDENTS_META_KEY', '_motto_styler_front_dependents' );
}

/**
 * Global registry for generated CSS rules during the request.
 *
 * Structure:
 * [
 *   'motto-styler-<instanceId>' => [
 *     'css' => '.motto-styler-<instanceId>{...}',
 *     'depth' => 0,
 *     'treeIndex' => 0,
 *   ]
 * ]
 *
 * @var array<string,array<string,mixed>|string>
 */
$GLOBALS['motto_styler_css_registry'] = [];
$GLOBALS['motto_styler_has_blocks'] = false;
$GLOBALS['motto_styler_css_class_registry'] = [];
$GLOBALS['motto_styler_css_conditional_registry'] = [];
$GLOBALS['motto_styler_tree_index_counter'] = 0;
$GLOBALS['motto_styler_render_stack'] = [];

/**
 * Push block render metadata to stack before rendering.
 *
 * @param mixed      $pre_render
 * @param array      $parsed_block
 * @param array|null $parent_block
 * @return mixed
 */
function motto_styler_capture_render_meta( $pre_render, $parsed_block, $parent_block = null ) {
	if ( is_admin() ) {
		return $pre_render;
	}
	if ( ! isset( $GLOBALS['motto_styler_render_stack'] ) || ! is_array( $GLOBALS['motto_styler_render_stack'] ) ) {
		$GLOBALS['motto_styler_render_stack'] = [];
	}
	if ( ! isset( $GLOBALS['motto_styler_tree_index_counter'] ) || ! is_int( $GLOBALS['motto_styler_tree_index_counter'] ) ) {
		$GLOBALS['motto_styler_tree_index_counter'] = 0;
	}
	$depth = count( $GLOBALS['motto_styler_render_stack'] );
	$meta = array(
		'depth' => $depth,
		'treeIndex' => $GLOBALS['motto_styler_tree_index_counter'],
	);
	$GLOBALS['motto_styler_render_stack'][] = $meta;
	$GLOBALS['motto_styler_tree_index_counter']++;
	return $pre_render;
}
add_filter( 'pre_render_block', 'motto_styler_capture_render_meta', 10, 3 );

/**
 * Read current block render metadata from stack.
 *
 * @return array{depth:int,treeIndex:int}
 */
function motto_styler_get_current_render_meta() {
	if ( ! isset( $GLOBALS['motto_styler_render_stack'] ) || ! is_array( $GLOBALS['motto_styler_render_stack'] ) ) {
		return array( 'depth' => 0, 'treeIndex' => 0 );
	}
	$meta = end( $GLOBALS['motto_styler_render_stack'] );
	if ( ! is_array( $meta ) ) {
		return array( 'depth' => 0, 'treeIndex' => 0 );
	}
	return array(
		'depth' => isset( $meta['depth'] ) ? (int) $meta['depth'] : 0,
		'treeIndex' => isset( $meta['treeIndex'] ) ? (int) $meta['treeIndex'] : 0,
	);
}

/**
 * Pop current block render metadata from stack.
 *
 * @return void
 */
function motto_styler_pop_current_render_meta() {
	if ( ! isset( $GLOBALS['motto_styler_render_stack'] ) || ! is_array( $GLOBALS['motto_styler_render_stack'] ) ) {
		return;
	}
	array_pop( $GLOBALS['motto_styler_render_stack'] );
}

/**
 * Sanitize instance id for safe use in CSS class names.
 *
 * Allows: letters, numbers, dash, underscore.
 */
function motto_styler_sanitize_instance_id($instance_id) {
	$instance_id = (string) $instance_id;
	$instance_id = strtolower($instance_id);
	$instance_id = preg_replace('/[^a-z0-9\-_]/', '', $instance_id);
	return $instance_id;
}

/**
 * Build a fallback hash from block name and normalized declarations.
 * Used only when instanceId is missing.
 *
 * IMPORTANT:
 * - We ignore row "id" fields to keep hashes stable across edits.
 * - Desktop only for now.
 */
function motto_styler_build_fallback_hash($block_name, array $css_rows) {
	$normalized = [];

	foreach ($css_rows as $row) {
		$name  = isset($row['name']) ? trim((string) $row['name']) : '';
		$value = isset($row['value']) ? trim((string) $row['value']) : '';

		if ($name === '' || $value === '') {
			continue;
		}

		// Basic CSS property name sanity check (allow dash properties).
		if (! preg_match('/^[a-zA-Z-]+$/', $name)) {
			continue;
		}

		$normalized[] = $name . ':' . $value;
	}

	$payload = $block_name . '|' . implode(';', $normalized);

	return substr(sha1($payload), 0, 12);
}

/**
 * Add a class to the first HTML tag of the block output.
 *
 * Uses WP_HTML_Tag_Processor when available (WP 6.2+).
 */
function motto_styler_add_class_to_block_html($block_content, $class_name) {
	if (trim($block_content) === '') {
		return $block_content;
	}

	if (class_exists('WP_HTML_Tag_Processor')) {
		$processor = new WP_HTML_Tag_Processor($block_content);

		// Find the first tag in the block markup.
		if ($processor->next_tag()) {
			$processor->add_class($class_name);
			return $processor->get_updated_html();
		}

		return $block_content;
	}

	// Fallback (best-effort): inject class into the first opening tag.
	if (preg_match('/^<([a-zA-Z0-9:-]+)(\s[^>]*)?>/', $block_content, $m)) {
		$tag  = $m[1];
		$rest = isset($m[2]) ? $m[2] : '';

		if (preg_match('/\sclass=("|\')([^"\']*)\1/i', $rest, $cm)) {
			$quote = $cm[1];
			$old   = $cm[2];
			$new   = trim($old . ' ' . $class_name);
			$rest  = preg_replace(
				'/\sclass=("|\')([^"\']*)\1/i',
				' class=' . $quote . esc_attr($new) . $quote,
				$rest,
				1
			);
		} else {
			$rest .= ' class="' . esc_attr($class_name) . '"';
		}

		$new_opening = '<' . $tag . $rest . '>';
		return preg_replace('/^<([a-zA-Z0-9:-]+)(\s[^>]*)?>/', $new_opening, $block_content, 1);
	}

	return $block_content;
}

/**
 * Register a CSS class slug for later stylesheet output.
 *
 * @param string $slug
 * @param string $bucket 'class' or 'conditional'
 * @return void
 */
function motto_styler_register_css_class_slug($slug, $bucket = 'class') {
	$slug = sanitize_html_class((string) $slug);
	if ($slug === '') {
		return;
	}

	if ($bucket === 'conditional') {
		if (! isset($GLOBALS['motto_styler_css_conditional_registry']) || ! is_array($GLOBALS['motto_styler_css_conditional_registry'])) {
			$GLOBALS['motto_styler_css_conditional_registry'] = [];
		}
		$GLOBALS['motto_styler_css_conditional_registry'][$slug] = true;
		return;
	}

	if (! isset($GLOBALS['motto_styler_css_class_registry']) || ! is_array($GLOBALS['motto_styler_css_class_registry'])) {
		$GLOBALS['motto_styler_css_class_registry'] = [];
	}
	$GLOBALS['motto_styler_css_class_registry'][$slug] = true;
}

/**
 * Create an empty frontend registry snapshot.
 *
 * @return array{css:array<string,mixed>,class:array<string,bool>,conditional:array<string,bool>}
 */
function motto_styler_create_frontend_registry_snapshot() {
	return array(
		'css' => array(),
		'class' => array(),
		'conditional' => array(),
	);
}

/**
 * Register a CSS class slug in a snapshot bucket.
 *
 * @param array<string,mixed> $snapshot
 * @param string              $slug
 * @param string              $bucket
 * @return void
 */
function motto_styler_register_css_class_slug_in_snapshot( array &$snapshot, $slug, $bucket = 'class' ) {
	$slug = sanitize_html_class((string) $slug);
	if ($slug === '') {
		return;
	}

	if ( $bucket === 'conditional' ) {
		if ( ! isset( $snapshot['conditional'] ) || ! is_array( $snapshot['conditional'] ) ) {
			$snapshot['conditional'] = array();
		}
		$snapshot['conditional'][ $slug ] = true;
		return;
	}

	if ( ! isset( $snapshot['class'] ) || ! is_array( $snapshot['class'] ) ) {
		$snapshot['class'] = array();
	}
	$snapshot['class'][ $slug ] = true;
}

/**
 * Resolve shared CSS class item references from cssClasses payload.
 *
 * @param mixed $items
 * @return array{classes:array<int,string>,conditional:array<int,string>}
 */
function motto_styler_resolve_css_class_items( $items ) {
	if ( ! is_array( $items ) || empty( $items ) ) {
		return array(
			'classes' => array(),
			'conditional' => array(),
		);
	}

	static $css_class_cache = null;
	if ( $css_class_cache === null ) {
		$css_class_cache = array(
			'by_id' => array(),
			'by_slug' => array(),
		);
	}

	$result = array(
		'classes' => array(),
		'conditional' => array(),
	);

	foreach ( $items as $item ) {
		$raw_slug = '';
		$id = 0;
		if ( is_array( $item ) ) {
			$id = isset( $item['id'] ) ? (int) $item['id'] : 0;
			$raw_slug = isset( $item['slug'] ) ? (string) $item['slug'] : '';
		} elseif ( is_string( $item ) ) {
			$raw_slug = $item;
		}

		$resolved_slug = '';
		$cond = array();
		$fallback_slug = sanitize_html_class( $raw_slug );

		if ( $id > 0 ) {
			if ( ! array_key_exists( $id, $css_class_cache['by_id'] ) ) {
				$post = get_post( $id );
				if ( $post && $post->post_type === 'motto_css_class' && $post->post_status === 'publish' ) {
					$resolved_slug = sanitize_html_class( (string) $post->post_name );
					$cond = function_exists( 'motto_styler_get_css_class_conditional_meta_value' )
						? motto_styler_get_css_class_conditional_meta_value( $post->ID )
						: array();
					$css_class_cache['by_id'][ $id ] = array(
						'slug' => $resolved_slug,
						'cond' => is_array( $cond ) ? $cond : array(),
					);
				} else {
					$css_class_cache['by_id'][ $id ] = array(
						'slug' => '',
						'cond' => array(),
					);
				}
			}
			$resolved_slug = $css_class_cache['by_id'][ $id ]['slug'];
			$cond = $css_class_cache['by_id'][ $id ]['cond'];
		}

		if ( $resolved_slug === '' && $fallback_slug !== '' ) {
			$resolved_slug = $fallback_slug;
			if ( ! array_key_exists( $resolved_slug, $css_class_cache['by_slug'] ) ) {
				$post = get_page_by_path( $resolved_slug, OBJECT, 'motto_css_class' );
				if ( $post instanceof WP_Post && $post->post_status === 'publish' ) {
					$cond = function_exists( 'motto_styler_get_css_class_conditional_meta_value' )
						? motto_styler_get_css_class_conditional_meta_value( $post->ID )
						: array();
					$css_class_cache['by_slug'][ $resolved_slug ] = is_array( $cond ) ? $cond : array();
				} else {
					$css_class_cache['by_slug'][ $resolved_slug ] = array();
				}
			}
			$cond = $css_class_cache['by_slug'][ $resolved_slug ];
		}

		if ( $resolved_slug === '' ) {
			continue;
		}

		$result['classes'][] = $resolved_slug;
		if ( is_array( $cond ) && ! empty( $cond ) ) {
			foreach ( $cond as $extra_class ) {
				$extra_class = sanitize_html_class( (string) $extra_class );
				if ( $extra_class !== '' ) {
					$result['conditional'][] = $extra_class;
				}
			}
		}
	}

	$result['classes'] = array_values( array_unique( $result['classes'] ) );
	$result['conditional'] = array_values( array_unique( $result['conditional'] ) );

	return $result;
}

/**
 * Register instance CSS rule in a snapshot.
 *
 * @param array<string,mixed>      $snapshot
 * @param string                   $class
 * @param string                   $css
 * @param array{depth?:int,treeIndex?:int} $meta
 * @return void
 */
function motto_styler_register_instance_css_rule_in_snapshot( array &$snapshot, $class, $css, array $meta = array() ) {
	$class = sanitize_html_class( (string) $class );
	$css = (string) $css;

	if ( $class === '' || $css === '' ) {
		return;
	}

	if ( ! isset( $snapshot['css'] ) || ! is_array( $snapshot['css'] ) ) {
		$snapshot['css'] = array();
	}

	$snapshot['css'][ $class ] = array(
		'css' => $css,
		'depth' => isset( $meta['depth'] ) ? (int) $meta['depth'] : 0,
		'treeIndex' => isset( $meta['treeIndex'] ) ? (int) $meta['treeIndex'] : PHP_INT_MAX,
	);
}

/**
 * Register instance CSS for later stylesheet output.
 *
 * @param string $class
 * @param string $css
 * @param array{depth?:int,treeIndex?:int} $meta
 * @return void
 */
function motto_styler_register_instance_css_rule( $class, $css, array $meta = array() ) {
	if ( ! isset( $GLOBALS['motto_styler_css_registry'] ) || ! is_array( $GLOBALS['motto_styler_css_registry'] ) ) {
		$GLOBALS['motto_styler_css_registry'] = array();
	}
	$snapshot = array(
		'css' => &$GLOBALS['motto_styler_css_registry'],
	);
	motto_styler_register_instance_css_rule_in_snapshot( $snapshot, $class, $css, $meta );
}

/**
 * Resolve reusable block reference id from a parsed core/block node.
 *
 * @param array<string,mixed> $block
 * @return int
 */
function motto_styler_get_reusable_block_ref_id( array $block ) {
	if ( empty( $block['attrs'] ) || ! is_array( $block['attrs'] ) ) {
		return 0;
	}

	return isset( $block['attrs']['ref'] ) ? (int) $block['attrs']['ref'] : 0;
}

/**
 * Load parsed blocks for a reusable wp_block reference.
 *
 * @param int $ref_id
 * @return array<int,mixed>
 */
function motto_styler_get_reusable_block_parsed_blocks( $ref_id ) {
	$ref_id = (int) $ref_id;
	if ( $ref_id <= 0 || ! function_exists( 'parse_blocks' ) ) {
		return array();
	}

	$post = get_post( $ref_id );
	if ( ! $post || $post->post_type !== 'wp_block' || $post->post_status !== 'publish' ) {
		return array();
	}

	$content = isset( $post->post_content ) ? (string) $post->post_content : '';
	if ( $content === '' ) {
		return array();
	}

	$blocks = parse_blocks( $content );
	return is_array( $blocks ) ? $blocks : array();
}

/**
 * Resolve the referenced pattern slug from a parsed motto/pattern-ref node.
 *
 * @param array<string,mixed> $block
 * @return string
 */
function motto_styler_get_pattern_ref_slug( array $block ) {
	if ( empty( $block['attrs'] ) || ! is_array( $block['attrs'] ) ) {
		return '';
	}

	return isset( $block['attrs']['patternSlug'] ) ? trim( (string) $block['attrs']['patternSlug'] ) : '';
}

/**
 * Load parsed blocks for a motto/pattern-ref reference, resolving the same way
 * the block's own render callback does (motto_pro_render_pattern_ref_block(),
 * Pro — this Free-owned resolver just pattern-matches the block name).
 *
 * @param string $slug
 * @return array<int,mixed>
 */
function motto_styler_get_pattern_ref_parsed_blocks( $slug ) {
	$slug = trim( (string) $slug );
	if ( $slug === '' || ! class_exists( 'WP_Block_Patterns_Registry' ) || ! function_exists( 'parse_blocks' ) ) {
		return array();
	}

	$pattern = WP_Block_Patterns_Registry::get_instance()->get_registered( $slug );
	if ( ! is_array( $pattern ) || empty( $pattern['content'] ) ) {
		return array();
	}

	$blocks = parse_blocks( (string) $pattern['content'] );
	return is_array( $blocks ) ? $blocks : array();
}

/**
 * Resolve template part reference from a parsed core/template-part node.
 *
 * @param array<string,mixed> $block
 * @return array{key:string,id:int,slug:string,theme:string}|null
 */
function motto_styler_get_template_part_ref( array $block ) {
	if ( empty( $block['attrs'] ) || ! is_array( $block['attrs'] ) ) {
		return null;
	}

	$attrs = $block['attrs'];
	$id_candidate = isset( $attrs['templatePartId'] ) ? (int) $attrs['templatePartId'] : 0;
	if ( $id_candidate <= 0 && isset( $attrs['postId'] ) ) {
		$id_candidate = (int) $attrs['postId'];
	}
	if ( $id_candidate <= 0 && isset( $attrs['id'] ) ) {
		$id_candidate = (int) $attrs['id'];
	}
	if ( $id_candidate <= 0 && isset( $attrs['ref'] ) ) {
		$id_candidate = (int) $attrs['ref'];
	}

	if ( $id_candidate > 0 ) {
		return array(
			'key' => 'id:' . $id_candidate,
			'id' => $id_candidate,
			'slug' => '',
			'theme' => '',
		);
	}

	$slug = isset( $attrs['slug'] ) ? trim( (string) $attrs['slug'] ) : '';
	$theme = isset( $attrs['theme'] ) ? trim( (string) $attrs['theme'] ) : '';
	if ( $slug === '' ) {
		return null;
	}

	return array(
		'key' => 'slug:' . ( $theme !== '' ? $theme : 'any' ) . ':' . $slug,
		'id' => 0,
		'slug' => $slug,
		'theme' => $theme,
	);
}

/**
 * Resolve navigation overlay template-part reference from a parsed core/navigation node.
 *
 * WordPress 7 introduced customizable navigation overlays stored as wp_template_part
 * posts with area "navigation-overlay". The core/navigation block references them via
 * an "overlay" attribute (slug), not as a core/template-part block in the template tree.
 *
 * @param array<string,mixed> $block
 * @return array{key:string,id:int,slug:string,theme:string}|null
 */
function motto_styler_get_navigation_overlay_ref( array $block ) {
	if ( empty( $block['attrs'] ) || ! is_array( $block['attrs'] ) ) {
		return null;
	}

	$slug = isset( $block['attrs']['overlay'] ) ? trim( (string) $block['attrs']['overlay'] ) : '';
	if ( $slug === '' ) {
		return null;
	}

	return array(
		'key'   => 'nav-overlay:' . $slug,
		'id'    => 0,
		'slug'  => $slug,
		'theme' => '',
	);
}

/**
 * Find a template part post from a template-part reference.
 *
 * @param array{key:string,id:int,slug:string,theme:string}|null $ref
 * @return WP_Post|null
 */
function motto_styler_find_template_part_post( $ref ) {
	if ( ! is_array( $ref ) ) {
		return null;
	}

	if ( ! empty( $ref['id'] ) ) {
		$post = get_post( (int) $ref['id'] );
		return ( $post && $post->post_type === 'wp_template_part' && $post->post_status === 'publish' ) ? $post : null;
	}

	$slug = isset( $ref['slug'] ) ? trim( (string) $ref['slug'] ) : '';
	if ( $slug === '' ) {
		return null;
	}

	$args = array(
		'post_type' => 'wp_template_part',
		'post_status' => array( 'publish' ),
		'numberposts' => 1,
		'name' => $slug,
		'suppress_filters' => false,
	);

	$theme = isset( $ref['theme'] ) ? trim( (string) $ref['theme'] ) : '';
	if ( $theme !== '' && taxonomy_exists( 'wp_theme' ) ) {
		$args['tax_query'] = array(
			array(
				'taxonomy' => 'wp_theme',
				'field' => 'slug',
				'terms' => array( $theme ),
			),
		);
	}

	$posts = get_posts( $args );
	if ( empty( $posts ) || ! is_array( $posts ) ) {
		return null;
	}

	return $posts[0] instanceof WP_Post ? $posts[0] : null;
}

/**
 * Load parsed blocks for a template part reference.
 *
 * @param array{key:string,id:int,slug:string,theme:string}|null $ref
 * @param WP_Post|null                                           $resolved_post
 * @return array<int,mixed>
 */
function motto_styler_get_template_part_parsed_blocks( $ref, &$resolved_post = null ) {
	if ( ! function_exists( 'parse_blocks' ) ) {
		$resolved_post = null;
		return array();
	}

	$post = motto_styler_find_template_part_post( $ref );
	$resolved_post = $post instanceof WP_Post ? $post : null;

	$content = '';
	if ( $post ) {
		$content = isset( $post->post_content ) ? (string) $post->post_content : '';
	} elseif ( function_exists( 'get_block_template' ) && is_array( $ref ) ) {
		// No DB row for this template part (e.g. never edited in the Site Editor) —
		// fall back to the theme's file-based part, same as template-preview.php does.
		$slug = isset( $ref['slug'] ) ? trim( (string) $ref['slug'] ) : '';
		if ( $slug !== '' ) {
			$theme = ! empty( $ref['theme'] ) ? trim( (string) $ref['theme'] ) : get_stylesheet();
			$template = get_block_template( $theme . '//' . $slug, 'wp_template_part' );
			if ( $template instanceof WP_Block_Template && ! empty( $template->content ) ) {
				$content = (string) $template->content;
			}
		}
	}

	if ( $content === '' ) {
		return array();
	}

	$blocks = parse_blocks( $content );
	return is_array( $blocks ) ? $blocks : array();
}

/**
 * Collect one parsed block into a frontend registry snapshot.
 *
 * @param array<string,mixed> $block
 * @param array<string,mixed> $snapshot
 * @param array{depth?:int,treeIndex?:int} $meta
 * @return void
 */
function motto_styler_collect_parsed_block_into_snapshot( array $block, array &$snapshot, array $meta = array() ) {
	if ( empty( $block['blockName'] ) || empty( $block['attrs'] ) || ! is_array( $block['attrs'] ) ) {
		return;
	}

	if ( $block['blockName'] === 'core/block' ) {
		return;
	}

	if ( function_exists( 'motto_styler_is_target_block' ) && ! motto_styler_is_target_block( (string) $block['blockName'] ) ) {
		return;
	}

	$motto_styler = motto_styler_resolve_styler_attributes( $block['attrs'] );
	if ( empty( $motto_styler ) ) {
		return;
	}

	$resolved_css_classes = array(
		'classes' => array(),
		'conditional' => array(),
	);
	if ( isset( $motto_styler['cssClasses'] ) && is_array( $motto_styler['cssClasses'] ) ) {
		$resolved_css_classes = motto_styler_resolve_css_class_items( $motto_styler['cssClasses'] );
		foreach ( $resolved_css_classes['classes'] as $resolved_slug ) {
			motto_styler_register_css_class_slug_in_snapshot( $snapshot, $resolved_slug, 'class' );
		}
		foreach ( $resolved_css_classes['conditional'] as $conditional_slug ) {
			motto_styler_register_css_class_slug_in_snapshot( $snapshot, $conditional_slug, 'conditional' );
		}
	}

	$conditional_classes = $resolved_css_classes['conditional'];
	if ( function_exists( 'motto_styler_collect_conditional_classes' ) ) {
		$extra_classes = motto_styler_collect_conditional_classes( $motto_styler, $block );
		if ( is_array( $extra_classes ) && ! empty( $extra_classes ) ) {
			foreach ( $extra_classes as $extra_class ) {
				$extra_class = sanitize_html_class( (string) $extra_class );
				if ( $extra_class !== '' ) {
					$conditional_classes[] = $extra_class;
				}
			}
		}
	}
	foreach ( array_values( array_unique( $conditional_classes ) ) as $conditional_slug ) {
		motto_styler_register_css_class_slug_in_snapshot( $snapshot, $conditional_slug, 'conditional' );
	}

	$instance_id_raw = isset($motto_styler['instanceId']) ? $motto_styler['instanceId'] : '';
	if ($instance_id_raw === '' && isset($block['clientId'])) {
		$instance_id_raw = (string) $block['clientId'];
	}
	$instance_id = motto_styler_sanitize_instance_id($instance_id_raw);

	$css_desktop = array();
	if ( isset( $motto_styler['css']['desktop'] ) && is_array( $motto_styler['css']['desktop'] ) ) {
		$css_desktop = $motto_styler['css']['desktop'];
	}

	if ($instance_id === '') {
		$instance_id = 'h-' . motto_styler_build_fallback_hash((string) $block['blockName'], $css_desktop);
	}

	$class = 'motto-styler-' . $instance_id;
	$selector = 'html:root .' . $class;
	$css = motto_styler_build_block_css(
		$selector,
		$motto_styler,
		array(
			'blockName' => isset( $block['blockName'] ) ? (string) $block['blockName'] : '',
		)
	);
	if ( $css === '' ) {
		return;
	}

	motto_styler_register_instance_css_rule_in_snapshot( $snapshot, $class, $css, $meta );
}

/**
 * Collect a parsed block list into a frontend registry snapshot.
 *
 * @param array<int,mixed>    $blocks
 * @param array<string,mixed> $snapshot
 * @param int                 $depth
 * @param int                 $tree_index
 * @param array<string,mixed> $ctx
 * @return int
 */
function motto_styler_collect_parsed_blocks_into_snapshot( array $blocks, array &$snapshot, $depth = 0, $tree_index = 0, array &$ctx = array() ) {
	if ( ! isset( $ctx['visitedReusableRefs'] ) || ! is_array( $ctx['visitedReusableRefs'] ) ) {
		$ctx['visitedReusableRefs'] = array();
	}
	if ( ! isset( $ctx['visitedTemplatePartRefs'] ) || ! is_array( $ctx['visitedTemplatePartRefs'] ) ) {
		$ctx['visitedTemplatePartRefs'] = array();
	}
	if ( ! isset( $ctx['visitedTemplatePartIds'] ) || ! is_array( $ctx['visitedTemplatePartIds'] ) ) {
		$ctx['visitedTemplatePartIds'] = array();
	}
	if ( ! isset( $ctx['visitedPatternRefs'] ) || ! is_array( $ctx['visitedPatternRefs'] ) ) {
		$ctx['visitedPatternRefs'] = array();
	}

	foreach ( $blocks as $block ) {
		if ( ! is_array( $block ) ) {
			continue;
		}

		$current_tree_index = (int) $tree_index;
		$tree_index++;

		motto_styler_collect_parsed_block_into_snapshot(
			$block,
			$snapshot,
			array(
				'depth' => (int) $depth,
				'treeIndex' => $current_tree_index,
			)
		);

		if ( isset( $block['blockName'] ) && $block['blockName'] === 'core/post-content' ) {
			$current_post_blocks = isset( $ctx['currentPostContentBlocks'] ) && is_array( $ctx['currentPostContentBlocks'] )
				? $ctx['currentPostContentBlocks']
				: array();
			if ( ! empty( $current_post_blocks ) ) {
				$tree_index = motto_styler_collect_parsed_blocks_into_snapshot( $current_post_blocks, $snapshot, $depth + 1, $tree_index, $ctx );
			}
			continue;
		}

		if ( isset( $block['blockName'] ) && $block['blockName'] === 'core/block' ) {
			$ref_id = motto_styler_get_reusable_block_ref_id( $block );
			if ( $ref_id > 0 && empty( $ctx['visitedReusableRefs'][ $ref_id ] ) ) {
				$ctx['visitedReusableRefs'][ $ref_id ] = true;
				$reusable_blocks = motto_styler_get_reusable_block_parsed_blocks( $ref_id );
				if ( ! empty( $reusable_blocks ) ) {
					$tree_index = motto_styler_collect_parsed_blocks_into_snapshot( $reusable_blocks, $snapshot, $depth + 1, $tree_index, $ctx );
				}
			}
			continue;
		}

		if ( isset( $block['blockName'] ) && $block['blockName'] === 'motto/pattern-ref' ) {
			$pattern_slug = motto_styler_get_pattern_ref_slug( $block );
			if ( $pattern_slug !== '' && empty( $ctx['visitedPatternRefs'][ $pattern_slug ] ) ) {
				$ctx['visitedPatternRefs'][ $pattern_slug ] = true;
				$pattern_blocks = motto_styler_get_pattern_ref_parsed_blocks( $pattern_slug );
				if ( ! empty( $pattern_blocks ) ) {
					$tree_index = motto_styler_collect_parsed_blocks_into_snapshot( $pattern_blocks, $snapshot, $depth + 1, $tree_index, $ctx );
				}
			}
			continue;
		}

		if ( isset( $block['blockName'] ) && $block['blockName'] === 'core/template-part' ) {
			$ref = motto_styler_get_template_part_ref( $block );
			$ref_key = is_array( $ref ) && isset( $ref['key'] ) ? (string) $ref['key'] : '';
			if ( $ref_key !== '' && empty( $ctx['visitedTemplatePartRefs'][ $ref_key ] ) ) {
				$ctx['visitedTemplatePartRefs'][ $ref_key ] = true;
				$template_part_post = null;
				$template_part_blocks = motto_styler_get_template_part_parsed_blocks( $ref, $template_part_post );
				if ( $template_part_post instanceof WP_Post ) {
					$ctx['visitedTemplatePartIds'][ (int) $template_part_post->ID ] = true;
				}
				if ( ! empty( $template_part_blocks ) ) {
					$tree_index = motto_styler_collect_parsed_blocks_into_snapshot( $template_part_blocks, $snapshot, $depth + 1, $tree_index, $ctx );
				}
			}
			continue;
		}

		if ( isset( $block['blockName'] ) && $block['blockName'] === 'core/navigation' ) {
			$overlay_ref = motto_styler_get_navigation_overlay_ref( $block );
			$overlay_key = is_array( $overlay_ref ) && isset( $overlay_ref['key'] ) ? (string) $overlay_ref['key'] : '';
			if ( $overlay_key !== '' && empty( $ctx['visitedTemplatePartRefs'][ $overlay_key ] ) ) {
				$ctx['visitedTemplatePartRefs'][ $overlay_key ] = true;
				$overlay_post = null;
				$overlay_blocks = motto_styler_get_template_part_parsed_blocks( $overlay_ref, $overlay_post );
				if ( $overlay_post instanceof WP_Post ) {
					$ctx['visitedTemplatePartIds'][ (int) $overlay_post->ID ] = true;
				}
				if ( ! empty( $overlay_blocks ) ) {
					$tree_index = motto_styler_collect_parsed_blocks_into_snapshot( $overlay_blocks, $snapshot, $depth + 1, $tree_index, $ctx );
				}
			}
			// Fall through to innerBlocks traversal — do NOT continue.
		}

		if ( isset( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) && ! empty( $block['innerBlocks'] ) ) {
			$tree_index = motto_styler_collect_parsed_blocks_into_snapshot( $block['innerBlocks'], $snapshot, $depth + 1, $tree_index, $ctx );
		}
	}

	return (int) $tree_index;
}

/**
 * Build a frontend registry collection from resolved template content plus current post content.
 *
 * The template tree keeps the real runtime order and injects the current post blocks when it
 * reaches a core/post-content node.
 *
 * @param string $template_content
 * @param string $post_content
 * @return array{
 *   snapshot:array{css:array<string,mixed>,class:array<string,bool>,conditional:array<string,bool>},
 *   deps:array{
 *     reusableRefs:array<int,int>,
 *     templatePartRefs:array<int,string>,
 *     templatePartIds:array<int,int>,
 *     templateIds:array<int,int>,
 *     classSlugs:array<int,string>,
 *     conditionalClassSlugs:array<int,string>
 *   }
 * }
 */
function motto_styler_build_frontend_registry_collection_from_template_and_content( $template_content, $post_content ) {
	$snapshot = motto_styler_create_frontend_registry_snapshot();
	$ctx = array(
		'visitedReusableRefs' => array(),
		'visitedTemplatePartRefs' => array(),
		'visitedTemplatePartIds' => array(),
		'currentPostContentBlocks' => array(),
	);

	if ( function_exists( 'parse_blocks' ) ) {
		$post_blocks = parse_blocks( (string) $post_content );
		if ( is_array( $post_blocks ) && ! empty( $post_blocks ) ) {
			$ctx['currentPostContentBlocks'] = $post_blocks;
		}

		$template_blocks = parse_blocks( (string) $template_content );
		if ( is_array( $template_blocks ) && ! empty( $template_blocks ) ) {
			motto_styler_collect_parsed_blocks_into_snapshot( $template_blocks, $snapshot, 0, 0, $ctx );
		}
	}

	$template_post_id = motto_styler_get_current_resolved_template_post_id();

	return array(
		'snapshot' => $snapshot,
		'deps' => array(
			'reusableRefs' => array_map( 'intval', array_keys( $ctx['visitedReusableRefs'] ) ),
			'templatePartRefs' => array_values( array_map( 'strval', array_keys( $ctx['visitedTemplatePartRefs'] ) ) ),
			'templatePartIds' => array_map( 'intval', array_keys( $ctx['visitedTemplatePartIds'] ) ),
			'templateIds' => $template_post_id > 0 ? array( $template_post_id ) : array(),
			'classSlugs' => isset( $snapshot['class'] ) && is_array( $snapshot['class'] ) ? array_values( array_map( 'strval', array_keys( $snapshot['class'] ) ) ) : array(),
			'conditionalClassSlugs' => isset( $snapshot['conditional'] ) && is_array( $snapshot['conditional'] ) ? array_values( array_map( 'strval', array_keys( $snapshot['conditional'] ) ) ) : array(),
		),
	);
}

/**
 * Build a frontend registry collection from parsed blocks.
 *
 * @param array<int,mixed> $blocks
 * @return array{
 *   snapshot:array{css:array<string,mixed>,class:array<string,bool>,conditional:array<string,bool>},
 *   deps:array{
 *     reusableRefs:array<int,int>,
 *     templatePartRefs:array<int,string>,
 *     templatePartIds:array<int,int>,
 *     classSlugs:array<int,string>,
 *     conditionalClassSlugs:array<int,string>
 *   }
 * }
 */
function motto_styler_build_frontend_registry_collection_from_blocks( array $blocks ) {
	$snapshot = motto_styler_create_frontend_registry_snapshot();
	$ctx = array(
		'visitedReusableRefs' => array(),
		'visitedTemplatePartRefs' => array(),
		'visitedTemplatePartIds' => array(),
	);
	motto_styler_collect_parsed_blocks_into_snapshot( $blocks, $snapshot, 0, 0, $ctx );

	return array(
		'snapshot' => $snapshot,
		'deps' => array(
			'reusableRefs' => array_map( 'intval', array_keys( $ctx['visitedReusableRefs'] ) ),
			'templatePartRefs' => array_values( array_map( 'strval', array_keys( $ctx['visitedTemplatePartRefs'] ) ) ),
			'templatePartIds' => array_map( 'intval', array_keys( $ctx['visitedTemplatePartIds'] ) ),
			'classSlugs' => isset( $snapshot['class'] ) && is_array( $snapshot['class'] ) ? array_values( array_map( 'strval', array_keys( $snapshot['class'] ) ) ) : array(),
			'conditionalClassSlugs' => isset( $snapshot['conditional'] ) && is_array( $snapshot['conditional'] ) ? array_values( array_map( 'strval', array_keys( $snapshot['conditional'] ) ) ) : array(),
		),
	);
}

/**
 * Build a frontend registry snapshot directly from parsed blocks.
 *
 * @param array<int,mixed> $blocks
 * @return array{css:array<string,mixed>,class:array<string,bool>,conditional:array<string,bool>}
 */
function motto_styler_build_frontend_registry_snapshot_from_blocks( array $blocks ) {
	$collection = motto_styler_build_frontend_registry_collection_from_blocks( $blocks );
	return isset( $collection['snapshot'] ) && is_array( $collection['snapshot'] )
		? $collection['snapshot']
		: motto_styler_create_frontend_registry_snapshot();
}

/**
 * Build a frontend registry snapshot directly from saved content.
 *
 * @param string $content
 * @return array{css:array<string,mixed>,class:array<string,bool>,conditional:array<string,bool>}
 */
function motto_styler_build_frontend_registry_snapshot_from_content( $content ) {
	$content = (string) $content;
	if ( $content === '' || ! function_exists( 'parse_blocks' ) ) {
		return motto_styler_create_frontend_registry_snapshot();
	}

	$blocks = parse_blocks( $content );
	if ( ! is_array( $blocks ) || empty( $blocks ) ) {
		return motto_styler_create_frontend_registry_snapshot();
	}

	return motto_styler_build_frontend_registry_snapshot_from_blocks( $blocks );
}

/**
 * Build frontend style buckets directly from saved content.
 *
 * This currently walks parsed content, nested innerBlocks, reusable core/block references,
 * and core/template-part references.
 *
 * @param string $content
 * @return array{class:string,instance:string,conditional:string}
 */
function motto_styler_build_frontend_style_buckets_from_content( $content ) {
	$snapshot = motto_styler_build_frontend_registry_snapshot_from_content( $content );
	$bucket_css = motto_styler_build_frontend_style_buckets( $snapshot );
	unset( $bucket_css['variables'] );
	unset( $bucket_css['class'] );
	return $bucket_css;
}

/**
 * Return the builder version used for derived frontend cache signatures.
 *
 * @return string
 */
function motto_styler_get_frontend_cache_builder_version() {
	return '4';
}

/**
 * Return the current breakpoint config signature used by derived frontend caches.
 *
 * @return string
 */
function motto_styler_get_frontend_cache_breakpoints_signature() {
	$config = function_exists( 'motto_styler_get_breakpoint_config' )
		? motto_styler_get_breakpoint_config()
		: array();

	return sha1( wp_json_encode( $config ) );
}

/**
 * Build a deterministic signature for a derived frontend cache payload.
 *
 * @param array<string,mixed> $snapshot
 * @param array<string,string> $bucket_css
 * @param string $context
 * @return string
 */
function motto_styler_build_frontend_cache_signature( array $snapshot, array $bucket_css, $context = 'post_content' ) {
	$payload = array(
		'version' => motto_styler_get_frontend_cache_builder_version(),
		'context' => (string) $context,
		'snapshot' => $snapshot,
		'buckets' => $bucket_css,
	);

	return sha1( wp_json_encode( $payload ) );
}

/**
 * Build a derived frontend cache payload directly from saved content.
 *
 * @param string $content
 * @param string $context
 * @param string $template_content
 * @return array{css:string,deps:array<string,mixed>,signature:string,builtAt:int,context:string}
 */
function motto_styler_build_frontend_cache_payload_from_content( $content, $context = 'post_content', $template_content = '' ) {
	$content = (string) $content;
	$context = (string) $context;
	$template_content = (string) $template_content;
	$collection = array(
		'snapshot' => motto_styler_create_frontend_registry_snapshot(),
		'deps' => array(
			'reusableRefs' => array(),
			'templatePartRefs' => array(),
			'templatePartIds' => array(),
			'templateIds' => array(),
			'classSlugs' => array(),
			'conditionalClassSlugs' => array(),
		),
	);
	if ( $context === 'resolved_singular_template' && $template_content !== '' && function_exists( 'parse_blocks' ) ) {
		$collection = motto_styler_build_frontend_registry_collection_from_template_and_content( $template_content, $content );
	} elseif ( $content !== '' && function_exists( 'parse_blocks' ) ) {
		$blocks = parse_blocks( $content );
		if ( is_array( $blocks ) && ! empty( $blocks ) ) {
			$collection = motto_styler_build_frontend_registry_collection_from_blocks( $blocks );
		}
	}

	$snapshot = isset( $collection['snapshot'] ) && is_array( $collection['snapshot'] )
		? $collection['snapshot']
		: motto_styler_create_frontend_registry_snapshot();
	$bucket_css = motto_styler_build_frontend_style_buckets( $snapshot );
	unset( $bucket_css['variables'] );
	unset( $bucket_css['class'] );

	$css = motto_styler_build_frontend_styles_css( $bucket_css );
	$deps = isset( $collection['deps'] ) && is_array( $collection['deps'] ) ? $collection['deps'] : array();

	return array(
		'css' => $css,
		'deps' => $deps,
		'signature' => motto_styler_build_frontend_cache_signature( $snapshot, $bucket_css, $context ),
		'builtAt' => time(),
		'breakpointsSignature' => motto_styler_get_frontend_cache_breakpoints_signature(),
		'context' => $context,
	);
}

/**
 * Read the resolved singular block template content for the current frontend request.
 *
 * @return string
 */
function motto_styler_get_current_resolved_template_content() {
	global $_wp_current_template_content;

	return isset( $_wp_current_template_content ) && is_string( $_wp_current_template_content )
		? $_wp_current_template_content
		: '';
}

/**
 * Read the resolved block template composite id ("theme//slug") for the current frontend request.
 *
 * @return string
 */
function motto_styler_get_current_resolved_template_composite_id() {
	global $_wp_current_template_id;

	return isset( $_wp_current_template_id ) && is_string( $_wp_current_template_id )
		? $_wp_current_template_id
		: '';
}

/**
 * Resolve the wp_template post id backing the currently resolved singular template, if the
 * template has been customized/saved as a wp_template post (vs. a theme file default with no
 * DB row to depend on).
 *
 * @return int
 */
function motto_styler_get_current_resolved_template_post_id() {
	$composite_id = motto_styler_get_current_resolved_template_composite_id();
	if ( $composite_id === '' || strpos( $composite_id, '//' ) === false ) {
		return 0;
	}

	list( $theme, $slug ) = explode( '//', $composite_id, 2 );
	$slug = sanitize_title( $slug );
	if ( $slug === '' ) {
		return 0;
	}

	$args = array(
		'post_type' => 'wp_template',
		'post_status' => array( 'publish' ),
		'numberposts' => 1,
		'name' => $slug,
		'suppress_filters' => false,
	);

	if ( $theme !== '' && taxonomy_exists( 'wp_theme' ) ) {
		$args['tax_query'] = array(
			array(
				'taxonomy' => 'wp_theme',
				'field' => 'slug',
				'terms' => array( $theme ),
			),
		);
	}

	$posts = get_posts( $args );
	if ( empty( $posts ) || ! ( $posts[0] instanceof WP_Post ) ) {
		return 0;
	}

	return (int) $posts[0]->ID;
}

/**
 * Determine the desired frontend cache build context for a post.
 *
 * @param int $post_id
 * @return string
 */
function motto_styler_get_frontend_cache_context_for_post( $post_id ) {
	$post_id = (int) $post_id;
	if ( $post_id > 0 && $post_id === motto_styler_get_current_frontend_cache_post_id() ) {
		$template_content = motto_styler_get_current_resolved_template_content();
		if ( $template_content !== '' ) {
			return 'resolved_singular_template';
		}
	}

	return 'post_content';
}

/**
 * Read the stored frontend cache context for a post.
 *
 * @param int $post_id
 * @return string
 */
function motto_styler_get_stored_frontend_cache_context_for_post( $post_id ) {
	$post_id = (int) $post_id;
	if ( $post_id <= 0 ) {
		return '';
	}

	$context = get_post_meta( $post_id, MOTTO_STYLER_FRONT_CONTEXT_META_KEY, true );
	return is_string( $context ) ? $context : '';
}

/**
 * Determine whether the requested frontend cache context can be rebuilt right now.
 *
 * @param int    $post_id
 * @param string $context
 * @return bool
 */
function motto_styler_can_build_frontend_cache_context_for_post( $post_id, $context ) {
	$post_id = (int) $post_id;
	$context = (string) $context;

	if ( $post_id <= 0 ) {
		return false;
	}
	if ( $context === '' || $context === 'post_content' ) {
		return true;
	}
	if ( $context !== 'resolved_singular_template' ) {
		return false;
	}

	return $post_id === motto_styler_get_current_frontend_cache_post_id() && motto_styler_get_current_resolved_template_content() !== '';
}

/**
 * Build a derived frontend cache payload for a post entity.
 *
 * @param int $post_id
 * @param string $context
 * @return array{css:string,deps:array<string,mixed>,signature:string,builtAt:int,context:string}
 */
function motto_styler_build_frontend_cache_payload_for_post( $post_id, $context = '' ) {
	$post_id = (int) $post_id;
	$context = (string) $context;
	if ( $post_id <= 0 ) {
		return array(
			'css' => '',
			'deps' => array(),
			'signature' => '',
			'builtAt' => time(),
			'context' => 'post_content',
		);
	}

	$post = get_post( $post_id );
	if ( ! $post ) {
		return array(
			'css' => '',
			'deps' => array(),
			'signature' => '',
			'builtAt' => time(),
			'context' => 'post_content',
		);
	}

	if ( $context === '' ) {
		$context = motto_styler_get_frontend_cache_context_for_post( $post_id );
	}

	$template_content = '';
	if ( $context === 'resolved_singular_template' ) {
		$template_content = motto_styler_get_current_resolved_template_content();
		if ( $template_content === '' ) {
			$context = 'post_content';
		}
	}

	return motto_styler_build_frontend_cache_payload_from_content(
		isset( $post->post_content ) ? (string) $post->post_content : '',
		$context,
		$template_content
	);
}

/**
 * Determine whether a post type should receive derived frontend cache updates.
 *
 * @param string $post_type
 * @return bool
 */
function motto_styler_is_frontend_cacheable_post_type( $post_type ) {
	$post_type = sanitize_key( (string) $post_type );
	if ( $post_type === '' ) {
		return false;
	}

	$excluded = array(
		'attachment',
		'revision',
		'nav_menu_item',
		'custom_css',
		'customize_changeset',
		'oembed_cache',
		'user_request',
		'wp_block',
		'wp_template',
		'wp_template_part',
		'wp_global_styles',
		'wp_navigation',
		'motto_css_class',
		'motto_css_variable',
	);
	if ( in_array( $post_type, $excluded, true ) ) {
		return false;
	}

	$post_type_object = get_post_type_object( $post_type );
	if ( ! $post_type_object || empty( $post_type_object->public ) ) {
		return false;
	}

	return (bool) apply_filters( 'motto_styler_frontend_cacheable_post_type', true, $post_type, $post_type_object );
}

/**
 * Persist derived frontend cache payload for a post.
 *
 * @param int    $post_id
 * @param string $context
 * @return void
 */
function motto_styler_update_frontend_cache_for_post( $post_id, $context = '' ) {
	$post_id = (int) $post_id;
	if ( $post_id <= 0 ) {
		return;
	}

	$old_deps = motto_styler_get_frontend_cache_deps_for_post( $post_id );
	$payload = motto_styler_build_frontend_cache_payload_for_post( $post_id, $context );
	$css = isset( $payload['css'] ) ? (string) $payload['css'] : '';

	if ( $css === '' ) {
		motto_styler_delete_frontend_cache_for_post( $post_id );
		return;
	}

	$new_deps = isset( $payload['deps'] ) && is_array( $payload['deps'] ) ? $payload['deps'] : array();
	motto_styler_sync_frontend_dependency_indexes_for_post( $post_id, $old_deps, $new_deps );

	update_post_meta( $post_id, MOTTO_STYLER_FRONT_CSS_META_KEY, $css );
	update_post_meta( $post_id, MOTTO_STYLER_FRONT_DEPS_META_KEY, $new_deps );
	update_post_meta( $post_id, MOTTO_STYLER_FRONT_SIGNATURE_META_KEY, isset( $payload['signature'] ) ? (string) $payload['signature'] : '' );
	update_post_meta( $post_id, MOTTO_STYLER_FRONT_BUILT_AT_META_KEY, isset( $payload['builtAt'] ) ? (int) $payload['builtAt'] : time() );
	update_post_meta( $post_id, MOTTO_STYLER_FRONT_BUILDER_VERSION_META_KEY, motto_styler_get_frontend_cache_builder_version() );
	update_post_meta( $post_id, MOTTO_STYLER_FRONT_BREAKPOINTS_SIGNATURE_META_KEY, isset( $payload['breakpointsSignature'] ) ? (string) $payload['breakpointsSignature'] : '' );
	update_post_meta( $post_id, MOTTO_STYLER_FRONT_CONTEXT_META_KEY, isset( $payload['context'] ) ? (string) $payload['context'] : 'post_content' );
}

/**
 * Delete all derived frontend cache meta for a post.
 *
 * @param int $post_id
 * @return void
 */
function motto_styler_delete_frontend_cache_for_post( $post_id ) {
	$post_id = (int) $post_id;
	if ( $post_id <= 0 ) {
		return;
	}

	$old_deps = motto_styler_get_frontend_cache_deps_for_post( $post_id );
	motto_styler_sync_frontend_dependency_indexes_for_post( $post_id, $old_deps, array() );

	delete_post_meta( $post_id, MOTTO_STYLER_FRONT_CSS_META_KEY );
	delete_post_meta( $post_id, MOTTO_STYLER_FRONT_DEPS_META_KEY );
	delete_post_meta( $post_id, MOTTO_STYLER_FRONT_SIGNATURE_META_KEY );
	delete_post_meta( $post_id, MOTTO_STYLER_FRONT_BUILT_AT_META_KEY );
	delete_post_meta( $post_id, MOTTO_STYLER_FRONT_BUILDER_VERSION_META_KEY );
	delete_post_meta( $post_id, MOTTO_STYLER_FRONT_BREAKPOINTS_SIGNATURE_META_KEY );
	delete_post_meta( $post_id, MOTTO_STYLER_FRONT_CONTEXT_META_KEY );
}

/**
 * Save hook: refresh derived frontend cache for cacheable posts.
 *
 * @param int      $post_id
 * @param WP_Post  $post
 * @param bool     $update
 * @return void
 */
function motto_styler_save_frontend_cache_for_post( $post_id, $post, $update ) {
	unset( $update );

	$post_id = (int) $post_id;
	if ( $post_id <= 0 ) {
		return;
	}
	if ( wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) ) {
		return;
	}
	if ( ! $post instanceof WP_Post ) {
		return;
	}
	if ( ! motto_styler_is_frontend_cacheable_post_type( $post->post_type ) ) {
		return;
	}

	$stored_context = motto_styler_get_stored_frontend_cache_context_for_post( $post_id );
	if ( $stored_context !== '' && ! motto_styler_can_build_frontend_cache_context_for_post( $post_id, $stored_context ) ) {
		motto_styler_delete_frontend_cache_for_post( $post_id );
		return;
	}

	motto_styler_update_frontend_cache_for_post( $post_id, $stored_context );
}
add_action( 'save_post', 'motto_styler_save_frontend_cache_for_post', 20, 3 );

/**
 * Normalize a list of positive integer ids.
 *
 * @param mixed $values
 * @return array<int,int>
 */
function motto_styler_normalize_positive_int_list( $values ) {
	if ( ! is_array( $values ) ) {
		return array();
	}

	return array_values(
		array_unique(
			array_filter(
				array_map( 'intval', $values ),
				static function ( $value ) {
					return $value > 0;
				}
			)
		)
	);
}

/**
 * Normalize a list of non-empty strings with an optional sanitizer callback.
 *
 * @param mixed    $values
 * @param callable $sanitize_callback
 * @return array<int,string>
 */
function motto_styler_normalize_non_empty_string_list( $values, $sanitize_callback = 'strval' ) {
	if ( ! is_array( $values ) ) {
		return array();
	}

	$normalized = array();
	foreach ( $values as $value ) {
		$normalized_value = is_callable( $sanitize_callback )
			? call_user_func( $sanitize_callback, $value )
			: (string) $value;
		$normalized_value = (string) $normalized_value;
		if ( $normalized_value === '' ) {
			continue;
		}
		$normalized[] = $normalized_value;
	}

	return array_values( array_unique( $normalized ) );
}

/**
 * Normalize a stored frontend cache dependency payload.
 *
 * @param mixed $deps
 * @return array{
 *   reusableRefs:array<int,int>,
 *   templatePartRefs:array<int,string>,
 *   templatePartIds:array<int,int>,
 *   templateIds:array<int,int>,
 *   classSlugs:array<int,string>,
 *   conditionalClassSlugs:array<int,string>
 * }
 */
function motto_styler_normalize_frontend_cache_deps( $deps ) {
	$normalized = array(
		'reusableRefs' => array(),
		'templatePartRefs' => array(),
		'templatePartIds' => array(),
		'templateIds' => array(),
		'classSlugs' => array(),
		'conditionalClassSlugs' => array(),
	);

	if ( ! is_array( $deps ) ) {
		return $normalized;
	}

	if ( isset( $deps['reusableRefs'] ) && is_array( $deps['reusableRefs'] ) ) {
		$normalized['reusableRefs'] = motto_styler_normalize_positive_int_list( $deps['reusableRefs'] );
	}

	if ( isset( $deps['templatePartRefs'] ) && is_array( $deps['templatePartRefs'] ) ) {
		$normalized['templatePartRefs'] = motto_styler_normalize_non_empty_string_list( $deps['templatePartRefs'], 'strval' );
	}

	if ( isset( $deps['templatePartIds'] ) && is_array( $deps['templatePartIds'] ) ) {
		$normalized['templatePartIds'] = motto_styler_normalize_positive_int_list( $deps['templatePartIds'] );
	}

	if ( isset( $deps['templateIds'] ) && is_array( $deps['templateIds'] ) ) {
		$normalized['templateIds'] = motto_styler_normalize_positive_int_list( $deps['templateIds'] );
	}

	if ( isset( $deps['classSlugs'] ) && is_array( $deps['classSlugs'] ) ) {
		$normalized['classSlugs'] = motto_styler_normalize_non_empty_string_list( $deps['classSlugs'], 'sanitize_html_class' );
	}

	if ( isset( $deps['conditionalClassSlugs'] ) && is_array( $deps['conditionalClassSlugs'] ) ) {
		$normalized['conditionalClassSlugs'] = motto_styler_normalize_non_empty_string_list( $deps['conditionalClassSlugs'], 'sanitize_html_class' );
	}

	return $normalized;
}

/**
 * Read normalized frontend cache dependencies for a post.
 *
 * @param int $post_id
 * @return array{
 *   reusableRefs:array<int,int>,
 *   templatePartRefs:array<int,string>,
 *   templatePartIds:array<int,int>,
 *   templateIds:array<int,int>,
 *   classSlugs:array<int,string>,
 *   conditionalClassSlugs:array<int,string>
 * }
 */
function motto_styler_get_frontend_cache_deps_for_post( $post_id ) {
	$post_id = (int) $post_id;
	if ( $post_id <= 0 ) {
		return motto_styler_normalize_frontend_cache_deps( array() );
	}

	return motto_styler_normalize_frontend_cache_deps(
		get_post_meta( $post_id, MOTTO_STYLER_FRONT_DEPS_META_KEY, true )
	);
}

/**
 * Normalize a dependent post id list stored on a shared dependency entity.
 *
 * @param mixed $post_ids
 * @return array<int,int>
 */
function motto_styler_normalize_frontend_dependent_post_ids( $post_ids ) {
	return motto_styler_normalize_positive_int_list( $post_ids );
}

/**
 * Read dependent post ids for a shared dependency post.
 *
 * @param int $shared_post_id
 * @return array<int,int>
 */
function motto_styler_get_frontend_dependent_post_ids( $shared_post_id ) {
	$shared_post_id = (int) $shared_post_id;
	if ( $shared_post_id <= 0 ) {
		return array();
	}

	return motto_styler_normalize_frontend_dependent_post_ids(
		get_post_meta( $shared_post_id, MOTTO_STYLER_FRONT_DEPENDENTS_META_KEY, true )
	);
}

/**
 * Persist dependent post ids for a shared dependency post.
 *
 * @param int            $shared_post_id
 * @param array<int,int> $post_ids
 * @return void
 */
function motto_styler_set_frontend_dependent_post_ids( $shared_post_id, array $post_ids ) {
	$shared_post_id = (int) $shared_post_id;
	if ( $shared_post_id <= 0 ) {
		return;
	}

	$post_ids = motto_styler_normalize_frontend_dependent_post_ids( $post_ids );
	if ( empty( $post_ids ) ) {
		delete_post_meta( $shared_post_id, MOTTO_STYLER_FRONT_DEPENDENTS_META_KEY );
		return;
	}

	update_post_meta( $shared_post_id, MOTTO_STYLER_FRONT_DEPENDENTS_META_KEY, $post_ids );
}

/**
 * Read indexed dependent posts from a shared post id list.
 *
 * @param array<int,int> $shared_post_ids
 * @return array<int,int>
 */
function motto_styler_collect_frontend_cache_post_ids_from_shared_posts( array $shared_post_ids ) {
	$post_ids = array();
	foreach ( motto_styler_normalize_positive_int_list( $shared_post_ids ) as $shared_post_id ) {
		$post_ids = array_merge( $post_ids, motto_styler_get_frontend_dependent_post_ids( $shared_post_id ) );
	}

	return motto_styler_normalize_positive_int_list( $post_ids );
}

/**
 * Extract the final slug segment from a stored template-part dependency ref key.
 *
 * @param string $ref_key
 * @return string
 */
function motto_styler_get_template_part_slug_from_ref_key( $ref_key ) {
	$ref_key = (string) $ref_key;
	if ( strpos( $ref_key, 'slug:' ) !== 0 ) {
		return '';
	}

	$last_colon = strrpos( $ref_key, ':' );
	if ( false === $last_colon ) {
		return '';
	}

	return sanitize_title( substr( $ref_key, $last_colon + 1 ) );
}

/**
 * Resolve shared CSS class post ids from class slugs.
 *
 * @param array<int,string> $class_slugs
 * @return array<int,int>
 */
function motto_styler_get_css_class_post_ids_for_slugs( array $class_slugs ) {
	$post_ids = array();
	foreach ( $class_slugs as $class_slug ) {
		$class_slug = sanitize_html_class( (string) $class_slug );
		if ( $class_slug === '' ) {
			continue;
		}

		$post = get_page_by_path( $class_slug, OBJECT, 'motto_css_class' );
		if ( $post instanceof WP_Post && $post->post_status === 'publish' ) {
			$post_ids[] = (int) $post->ID;
		}
	}

	return array_values( array_unique( array_filter( $post_ids ) ) );
}

/**
 * Sync reverse dependency indexes for one cached frontend post.
 *
 * Currently indexed:
 * - reusable wp_block ids
 * - resolved wp_template_part post ids
 *
 * @param int                 $post_id
 * @param array<string,mixed> $old_deps
 * @param array<string,mixed> $new_deps
 * @return void
 */
function motto_styler_sync_frontend_dependency_indexes_for_post( $post_id, array $old_deps, array $new_deps ) {
	$post_id = (int) $post_id;
	if ( $post_id <= 0 ) {
		return;
	}

	$old_deps = motto_styler_normalize_frontend_cache_deps( $old_deps );
	$new_deps = motto_styler_normalize_frontend_cache_deps( $new_deps );

	$old_class_post_ids = motto_styler_get_css_class_post_ids_for_slugs(
		array_merge( $old_deps['classSlugs'], $old_deps['conditionalClassSlugs'] )
	);
	$new_class_post_ids = motto_styler_get_css_class_post_ids_for_slugs(
		array_merge( $new_deps['classSlugs'], $new_deps['conditionalClassSlugs'] )
	);

	$old_shared_post_ids = array_merge( $old_deps['reusableRefs'], $old_deps['templatePartIds'], $old_deps['templateIds'], $old_class_post_ids );
	$new_shared_post_ids = array_merge( $new_deps['reusableRefs'], $new_deps['templatePartIds'], $new_deps['templateIds'], $new_class_post_ids );

	$to_remove = array_diff( $old_shared_post_ids, $new_shared_post_ids );
	$to_add = array_diff( $new_shared_post_ids, $old_shared_post_ids );

	foreach ( $to_remove as $shared_post_id ) {
		$current_dependents = motto_styler_get_frontend_dependent_post_ids( (int) $shared_post_id );
		$next_dependents = array_values( array_diff( $current_dependents, array( $post_id ) ) );
		motto_styler_set_frontend_dependent_post_ids( (int) $shared_post_id, $next_dependents );
	}

	foreach ( $to_add as $shared_post_id ) {
		$current_dependents = motto_styler_get_frontend_dependent_post_ids( (int) $shared_post_id );
		$current_dependents[] = $post_id;
		motto_styler_set_frontend_dependent_post_ids( (int) $shared_post_id, $current_dependents );
	}
}

/**
 * Return cacheable post types that may persist derived frontend CSS.
 *
 * @return array<int,string>
 */
function motto_styler_get_frontend_cacheable_post_types() {
	$post_types = get_post_types( array( 'public' => true ), 'names' );
	if ( ! is_array( $post_types ) || empty( $post_types ) ) {
		return array();
	}

	$cacheable = array();
	foreach ( $post_types as $post_type ) {
		if ( motto_styler_is_frontend_cacheable_post_type( $post_type ) ) {
			$cacheable[] = (string) $post_type;
		}
	}

	return array_values( array_unique( $cacheable ) );
}

/**
 * Return post ids that currently store derived frontend cache dependencies.
 *
 * @return array<int,int>
 */
function motto_styler_get_frontend_cache_candidate_post_ids() {
	$post_types = motto_styler_get_frontend_cacheable_post_types();
	if ( empty( $post_types ) ) {
		return array();
	}

	$post_ids = get_posts(
		array(
			'post_type' => $post_types,
			'post_status' => array( 'publish', 'future', 'draft', 'pending', 'private' ),
			'fields' => 'ids',
			'numberposts' => -1,
			'orderby' => 'ID',
			'order' => 'ASC',
			'meta_query' => array(
				array(
					'key' => MOTTO_STYLER_FRONT_DEPS_META_KEY,
					'compare' => 'EXISTS',
				),
			),
			'suppress_filters' => false,
			'no_found_rows' => true,
			'update_post_meta_cache' => false,
			'update_post_term_cache' => false,
		)
	);

	if ( ! is_array( $post_ids ) || empty( $post_ids ) ) {
		return array();
	}

	return array_values( array_unique( array_map( 'intval', $post_ids ) ) );
}

/**
 * Collect cached post ids whose dependency payload matches the given callback.
 *
 * @param callable $matcher function( array $deps, int $post_id ): bool
 * @return array<int,int>
 */
function motto_styler_collect_frontend_cache_post_ids_by_dependency( $matcher ) {
	if ( ! is_callable( $matcher ) ) {
		return array();
	}

	$matched_post_ids = array();
	foreach ( motto_styler_get_frontend_cache_candidate_post_ids() as $post_id ) {
		$deps = motto_styler_get_frontend_cache_deps_for_post( $post_id );
		if ( $matcher( $deps, $post_id ) ) {
			$matched_post_ids[] = (int) $post_id;
		}
	}

	return array_values( array_unique( $matched_post_ids ) );
}

/**
 * Rebuild derived frontend caches for a post id list.
 *
 * @param array<int,int> $post_ids
 * @return array{scanned:int,rebuilt:int,invalidated:int,skipped:int}
 */
function motto_styler_rebuild_frontend_cache_for_posts( array $post_ids ) {
	$summary = array(
		'scanned' => 0,
		'rebuilt' => 0,
		'invalidated' => 0,
		'skipped' => 0,
	);

	foreach ( array_values( array_unique( array_map( 'intval', $post_ids ) ) ) as $post_id ) {
		if ( $post_id <= 0 ) {
			$summary['skipped']++;
			continue;
		}

		$post = get_post( $post_id );
		if ( ! $post || ! motto_styler_is_frontend_cacheable_post_type( $post->post_type ) ) {
			$summary['skipped']++;
			continue;
		}

		$summary['scanned']++;
		$stored_context = motto_styler_get_stored_frontend_cache_context_for_post( $post_id );
		if ( $stored_context !== '' && ! motto_styler_can_build_frontend_cache_context_for_post( $post_id, $stored_context ) ) {
			motto_styler_delete_frontend_cache_for_post( $post_id );
			$summary['invalidated']++;
			continue;
		}

		motto_styler_update_frontend_cache_for_post( $post_id, $stored_context );
		$summary['rebuilt']++;
	}

	return $summary;
}

/**
 * Invalidate derived frontend caches for a post id list.
 *
 * @param array<int,int> $post_ids
 * @return void
 */
function motto_styler_invalidate_frontend_cache_for_posts( array $post_ids ) {
	foreach ( array_values( array_unique( array_map( 'intval', $post_ids ) ) ) as $post_id ) {
		if ( $post_id <= 0 ) {
			continue;
		}

		motto_styler_delete_frontend_cache_for_post( $post_id );
	}
}

/**
 * Invalidate all stored derived frontend caches after a global breakpoint contract change.
 *
 * Breakpoint changes should keep the admin save path lightweight. Instead of reparsing
 * every cached post synchronously, invalidate the derived cache and let the first valid
 * frontend request rebuild it lazily with the correct resolved context.
 *
 * @return void
 */
function motto_styler_invalidate_frontend_cache_for_breakpoint_change() {
	$post_ids = motto_styler_get_frontend_cache_candidate_post_ids();
	if ( empty( $post_ids ) ) {
		return;
	}

	foreach ( $post_ids as $post_id ) {
		$post_id = (int) $post_id;
		if ( $post_id <= 0 ) {
			continue;
		}
		motto_styler_delete_frontend_cache_for_post( $post_id );
	}
}

/**
 * Rebuild stored derived frontend caches after a global breakpoint contract change.
 *
 * This is an explicit eager warming path intended for manual/admin usage. Entries that
 * require unresolved singular-template context remain invalidated and rebuild lazily on
 * the next valid frontend request.
 *
 * @return array{scanned:int,rebuilt:int,invalidated:int,skipped:int}
 */
function motto_styler_rebuild_frontend_cache_for_breakpoint_change() {
	$post_ids = motto_styler_get_frontend_cache_candidate_post_ids();
	if ( empty( $post_ids ) ) {
		return array(
			'scanned' => 0,
			'rebuilt' => 0,
			'invalidated' => 0,
			'skipped' => 0,
		);
	}

	return motto_styler_rebuild_frontend_cache_for_posts( $post_ids );
}

/**
 * Refresh all stored derived frontend caches after a global breakpoint contract change.
 *
 * Historically this rebuilt cache entries eagerly in admin. Keep the public function
 * name for callers, but route the work through lazy invalidation instead.
 *
 * @return void
 */
function motto_styler_refresh_frontend_cache_for_breakpoint_change() {
	motto_styler_invalidate_frontend_cache_for_breakpoint_change();
}

/**
 * Refresh cached posts that depend on a reusable wp_block reference.
 *
 * @param int $ref_id
 * @return void
 */
function motto_styler_refresh_frontend_cache_for_reusable_block( $ref_id ) {
	$post_ids = motto_styler_get_frontend_cache_post_ids_for_reusable_block( $ref_id );
	motto_styler_rebuild_frontend_cache_for_posts( $post_ids );
}

/**
 * Collect cached posts that depend on a reusable wp_block reference.
 *
 * @param int $ref_id
 * @return array<int,int>
 */
function motto_styler_get_frontend_cache_post_ids_for_reusable_block( $ref_id ) {
	$ref_id = (int) $ref_id;
	if ( $ref_id <= 0 ) {
		return array();
	}

	$post_ids = motto_styler_collect_frontend_cache_post_ids_from_shared_posts( array( $ref_id ) );
	if ( empty( $post_ids ) ) {
		$post_ids = motto_styler_collect_frontend_cache_post_ids_by_dependency(
			static function ( array $deps ) use ( $ref_id ) {
				return in_array( $ref_id, $deps['reusableRefs'], true );
			}
		);
	}

	return $post_ids;
}

/**
 * Refresh cached posts that depend on a wp_template reference.
 *
 * @param int $template_post_id
 * @return void
 */
function motto_styler_refresh_frontend_cache_for_template( $template_post_id ) {
	$post_ids = motto_styler_get_frontend_cache_post_ids_for_template( $template_post_id );
	motto_styler_rebuild_frontend_cache_for_posts( $post_ids );
}

/**
 * Collect cached posts that depend on a wp_template reference.
 *
 * @param int $template_post_id
 * @return array<int,int>
 */
function motto_styler_get_frontend_cache_post_ids_for_template( $template_post_id ) {
	$template_post_id = (int) $template_post_id;
	if ( $template_post_id <= 0 ) {
		return array();
	}

	$post_ids = motto_styler_collect_frontend_cache_post_ids_from_shared_posts( array( $template_post_id ) );
	if ( empty( $post_ids ) ) {
		$post_ids = motto_styler_collect_frontend_cache_post_ids_by_dependency(
			static function ( array $deps ) use ( $template_post_id ) {
				return in_array( $template_post_id, $deps['templateIds'], true );
			}
		);
	}

	return $post_ids;
}

/**
 * Build template-part dependency candidates from a post object.
 *
 * @param WP_Post|null $post
 * @return array{ids:array<int,int>,slugs:array<int,string>}
 */
function motto_styler_get_template_part_dependency_candidates_for_post( $post ) {
	if ( ! $post instanceof WP_Post || $post->post_type !== 'wp_template_part' ) {
		return array(
			'ids' => array(),
			'slugs' => array(),
		);
	}

	$slug = sanitize_title( isset( $post->post_name ) ? (string) $post->post_name : '' );

	return array(
		'ids' => array( (int) $post->ID ),
		'slugs' => $slug !== '' ? array( $slug ) : array(),
	);
}

/**
 * Refresh cached posts that depend on template-part refs.
 *
 * Template-part ref keys may include a theme segment; for now we match by id and by final slug.
 *
 * @param array{ids?:array<int,int>,slugs?:array<int,string>} $candidates
 * @return void
 */
function motto_styler_refresh_frontend_cache_for_template_part_candidates( array $candidates ) {
	$post_ids = motto_styler_get_frontend_cache_post_ids_for_template_part_candidates( $candidates );
	motto_styler_rebuild_frontend_cache_for_posts( $post_ids );
}

/**
 * Collect cached posts that depend on template-part refs.
 *
 * @param array{ids?:array<int,int>,slugs?:array<int,string>} $candidates
 * @return array<int,int>
 */
function motto_styler_get_frontend_cache_post_ids_for_template_part_candidates( array $candidates ) {
	$template_part_ids = isset( $candidates['ids'] ) && is_array( $candidates['ids'] )
		? motto_styler_normalize_positive_int_list( $candidates['ids'] )
		: array();
	$template_part_slugs = isset( $candidates['slugs'] ) && is_array( $candidates['slugs'] )
		? motto_styler_normalize_non_empty_string_list( $candidates['slugs'], 'sanitize_title' )
		: array();

	if ( empty( $template_part_ids ) && empty( $template_part_slugs ) ) {
		return array();
	}

	$post_ids = motto_styler_collect_frontend_cache_post_ids_from_shared_posts( $template_part_ids );

	if ( empty( $post_ids ) && ! empty( $template_part_slugs ) ) {
		$post_ids = array_merge(
			$post_ids,
			motto_styler_collect_frontend_cache_post_ids_by_dependency(
				static function ( array $deps ) use ( $template_part_ids, $template_part_slugs ) {
					if ( ! empty( $template_part_ids ) && isset( $deps['templatePartIds'] ) && ! empty( array_intersect( $template_part_ids, $deps['templatePartIds'] ) ) ) {
						return true;
					}
					if ( empty( $deps['templatePartRefs'] ) ) {
						return false;
					}

					foreach ( $deps['templatePartRefs'] as $ref_key ) {
						$ref_key = (string) $ref_key;
						if ( strpos( $ref_key, 'id:' ) === 0 ) {
							$ref_id = (int) substr( $ref_key, 3 );
							if ( $ref_id > 0 && in_array( $ref_id, $template_part_ids, true ) ) {
								return true;
							}
							continue;
						}

						if ( strpos( $ref_key, 'slug:' ) !== 0 ) {
							continue;
						}

						$slug = motto_styler_get_template_part_slug_from_ref_key( $ref_key );
						if ( $slug !== '' && in_array( $slug, $template_part_slugs, true ) ) {
							return true;
						}
					}

					return false;
				}
			)
		);
	}

	return $post_ids;
}

/**
 * Build CSS class dependency slugs from a class CPT post object.
 *
 * @param WP_Post|null $post
 * @return array<int,string>
 */
function motto_styler_get_css_class_dependency_slugs_for_post( $post ) {
	if ( ! $post instanceof WP_Post || $post->post_type !== 'motto_css_class' ) {
		return array();
	}

	$slug = sanitize_html_class( isset( $post->post_name ) ? (string) $post->post_name : '' );
	return $slug !== '' ? array( $slug ) : array();
}

/**
 * Refresh cached posts that depend on shared CSS class slugs.
 *
 * @param array<int,string> $class_slugs
 * @return void
 */
function motto_styler_refresh_frontend_cache_for_css_class_slugs( array $class_slugs ) {
	$post_ids = motto_styler_get_frontend_cache_post_ids_for_css_class_slugs( $class_slugs );
	motto_styler_rebuild_frontend_cache_for_posts( $post_ids );
}

/**
 * Collect cached posts that depend on shared CSS class slugs.
 *
 * @param array<int,string> $class_slugs
 * @return array<int,int>
 */
function motto_styler_get_frontend_cache_post_ids_for_css_class_slugs( array $class_slugs ) {
	$class_slugs = motto_styler_normalize_non_empty_string_list( $class_slugs, 'sanitize_html_class' );

	if ( empty( $class_slugs ) ) {
		return array();
	}

	$post_ids = motto_styler_collect_frontend_cache_post_ids_from_shared_posts(
		motto_styler_get_css_class_post_ids_for_slugs( $class_slugs )
	);

	if ( empty( $post_ids ) ) {
		$post_ids = motto_styler_collect_frontend_cache_post_ids_by_dependency(
			static function ( array $deps ) use ( $class_slugs ) {
				foreach ( array( 'classSlugs', 'conditionalClassSlugs' ) as $key ) {
					if ( ! empty( array_intersect( $class_slugs, $deps[ $key ] ) ) ) {
						return true;
					}
				}

				return false;
			}
		);
	}

	return $post_ids;
}

/**
 * Collect dependent cached post ids for a shared dependency post.
 *
 * Supported dependency entities:
 * - wp_block
 * - wp_template_part
 * - wp_template
 * - motto_css_class
 *
 * @param WP_Post|null $post
 * @return array<int,int>
 */
function motto_styler_get_dependent_frontend_cache_post_ids_for_shared_post( $post ) {
	if ( ! $post instanceof WP_Post ) {
		return array();
	}

	if ( $post->post_type === 'wp_block' ) {
		return motto_styler_get_frontend_cache_post_ids_for_reusable_block( (int) $post->ID );
	}

	if ( $post->post_type === 'wp_template_part' ) {
		return motto_styler_get_frontend_cache_post_ids_for_template_part_candidates(
			motto_styler_get_template_part_dependency_candidates_for_post( $post )
		);
	}

	if ( $post->post_type === 'wp_template' ) {
		return motto_styler_get_frontend_cache_post_ids_for_template( (int) $post->ID );
	}

	if ( $post->post_type === 'motto_css_class' ) {
		return motto_styler_get_frontend_cache_post_ids_for_css_class_slugs(
			motto_styler_get_css_class_dependency_slugs_for_post( $post )
		);
	}

	return array();
}

/**
 * Refresh dependent frontend caches for a shared dependency post.
 *
 * Supported dependency entities:
 * - wp_block
 * - wp_template_part
 * - wp_template
 * - motto_css_class
 *
 * @param WP_Post|null $post
 * @return void
 */
function motto_styler_refresh_dependent_frontend_cache_for_shared_post( $post ) {
	$post_ids = motto_styler_get_dependent_frontend_cache_post_ids_for_shared_post( $post );
	motto_styler_rebuild_frontend_cache_for_posts( $post_ids );
}

/**
 * Save hook: refresh cached pages that depend on a reusable wp_block.
 *
 * @param int     $post_id
 * @param WP_Post $post
 * @param bool    $update
 * @return void
 */
function motto_styler_refresh_dependent_frontend_cache_for_reusable_block( $post_id, $post, $update ) {
	unset( $update );

	$post_id = (int) $post_id;
	if ( $post_id <= 0 || wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) ) {
		return;
	}
	if ( ! $post instanceof WP_Post || $post->post_type !== 'wp_block' ) {
		return;
	}

	motto_styler_refresh_frontend_cache_for_reusable_block( $post_id );
}
add_action( 'save_post_wp_block', 'motto_styler_refresh_dependent_frontend_cache_for_reusable_block', 30, 3 );

/**
 * Save hook: refresh cached pages that depend on a wp_template.
 *
 * A saved template's resolved content only differs from its previously cached snapshot
 * once the edit is published, so this rebuilds dependents on every wp_template save
 * (mirrors the wp_block handler above) rather than waiting for a page-level edit.
 *
 * @param int     $post_id
 * @param WP_Post $post
 * @param bool    $update
 * @return void
 */
function motto_styler_refresh_dependent_frontend_cache_for_template( $post_id, $post, $update ) {
	unset( $update );

	$post_id = (int) $post_id;
	if ( $post_id <= 0 || wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) ) {
		return;
	}
	if ( ! $post instanceof WP_Post || $post->post_type !== 'wp_template' ) {
		return;
	}

	motto_styler_refresh_frontend_cache_for_template( $post_id );
}
add_action( 'save_post_wp_template', 'motto_styler_refresh_dependent_frontend_cache_for_template', 30, 3 );

/**
 * Update dependent frontend caches when shared dependency entities change.
 *
 * @param int     $post_id
 * @param WP_Post $post_after
 * @param WP_Post $post_before
 * @return void
 */
function motto_styler_refresh_dependent_frontend_cache_for_shared_post_update( $post_id, $post_after, $post_before ) {
	$post_id = (int) $post_id;
	if ( $post_id <= 0 || wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) ) {
		return;
	}
	if ( ! $post_after instanceof WP_Post || ! $post_before instanceof WP_Post ) {
		return;
	}

	if ( $post_after->post_type === 'wp_template_part' ) {
		$candidates_after = motto_styler_get_template_part_dependency_candidates_for_post( $post_after );
		$candidates_before = motto_styler_get_template_part_dependency_candidates_for_post( $post_before );
		$candidates = array(
			'ids' => array_merge( $candidates_after['ids'], $candidates_before['ids'] ),
			'slugs' => array_merge( $candidates_after['slugs'], $candidates_before['slugs'] ),
		);
		motto_styler_refresh_frontend_cache_for_template_part_candidates( $candidates );
		return;
	}

	if ( $post_after->post_type === 'motto_css_class' ) {
		$class_slugs = array_merge(
			motto_styler_get_css_class_dependency_slugs_for_post( $post_after ),
			motto_styler_get_css_class_dependency_slugs_for_post( $post_before )
		);
		motto_styler_refresh_frontend_cache_for_css_class_slugs( $class_slugs );
	}
}
add_action( 'post_updated', 'motto_styler_refresh_dependent_frontend_cache_for_shared_post_update', 20, 3 );

/**
 * Trash hook: refresh dependent caches before a shared dependency changes slug/status.
 *
 * @param int    $post_id
 * @param string $previous_status
 * @return void
 */
function motto_styler_refresh_dependent_frontend_cache_before_shared_post_trash( $post_id, $previous_status ) {
	unset( $previous_status );

	$post_id = (int) $post_id;
	if ( $post_id <= 0 ) {
		return;
	}

	$post_ids = motto_styler_get_dependent_frontend_cache_post_ids_for_shared_post( get_post( $post_id ) );
	motto_styler_invalidate_frontend_cache_for_posts( $post_ids );
}
add_action( 'wp_trash_post', 'motto_styler_refresh_dependent_frontend_cache_before_shared_post_trash', 20, 2 );

/**
 * Delete hook: refresh dependent caches before a shared dependency is permanently removed.
 *
 * @param int          $post_id
 * @param WP_Post|null $post
 * @return void
 */
function motto_styler_refresh_dependent_frontend_cache_before_shared_post_delete( $post_id, $post = null ) {
	$post_id = (int) $post_id;
	if ( $post_id <= 0 ) {
		return;
	}

	if ( ! $post instanceof WP_Post ) {
		$post = get_post( $post_id );
	}

	$post_ids = motto_styler_get_dependent_frontend_cache_post_ids_for_shared_post( $post );
	motto_styler_invalidate_frontend_cache_for_posts( $post_ids );
}
add_action( 'before_delete_post', 'motto_styler_refresh_dependent_frontend_cache_before_shared_post_delete', 20, 2 );

/**
 * Untrash hook: refresh dependent caches after a shared dependency is restored.
 *
 * @param int    $post_id
 * @param string $previous_status
 * @return void
 */
function motto_styler_refresh_dependent_frontend_cache_after_shared_post_untrash( $post_id, $previous_status ) {
	unset( $previous_status );

	$post_id = (int) $post_id;
	if ( $post_id <= 0 ) {
		return;
	}

	motto_styler_refresh_dependent_frontend_cache_for_shared_post( get_post( $post_id ) );
}
add_action( 'untrashed_post', 'motto_styler_refresh_dependent_frontend_cache_after_shared_post_untrash', 20, 2 );

/**
 * Resolve the current singular post id eligible for frontend derived cache usage.
 *
 * @return int
 */
function motto_styler_get_current_frontend_cache_post_id() {
	if ( is_admin() || ! is_singular() ) {
		return 0;
	}

	$post_id = get_queried_object_id();
	if ( ! $post_id ) {
		return 0;
	}

	$post = get_post( $post_id );
	if ( ! $post || ! motto_styler_is_frontend_cacheable_post_type( $post->post_type ) ) {
		return 0;
	}

	return (int) $post_id;
}

/**
 * Ensure the derived frontend cache exists and matches the current builder version.
 *
 * @param int $post_id
 * @return void
 */
function motto_styler_ensure_frontend_cache_for_post( $post_id ) {
	$post_id = (int) $post_id;
	if ( $post_id <= 0 ) {
		return;
	}

	$css = get_post_meta( $post_id, MOTTO_STYLER_FRONT_CSS_META_KEY, true );
	$builder_version = (string) get_post_meta( $post_id, MOTTO_STYLER_FRONT_BUILDER_VERSION_META_KEY, true );
	$stored_breakpoints_signature = (string) get_post_meta( $post_id, MOTTO_STYLER_FRONT_BREAKPOINTS_SIGNATURE_META_KEY, true );
	$current_breakpoints_signature = motto_styler_get_frontend_cache_breakpoints_signature();
	$stored_context = (string) get_post_meta( $post_id, MOTTO_STYLER_FRONT_CONTEXT_META_KEY, true );
	$desired_context = motto_styler_get_frontend_cache_context_for_post( $post_id );
	if (
		is_string( $css ) &&
		$css !== '' &&
		$builder_version === motto_styler_get_frontend_cache_builder_version() &&
		$stored_breakpoints_signature === $current_breakpoints_signature &&
		$stored_context === $desired_context
	) {
		return;
	}

	motto_styler_update_frontend_cache_for_post( $post_id, $desired_context );
}

/**
 * Read cached derived frontend CSS for a post.
 *
 * @param int $post_id
 * @return string
 */
function motto_styler_get_cached_frontend_styles_css_for_post( $post_id ) {
	$post_id = (int) $post_id;
	if ( $post_id <= 0 ) {
		return '';
	}

	motto_styler_ensure_frontend_cache_for_post( $post_id );
	$css = get_post_meta( $post_id, MOTTO_STYLER_FRONT_CSS_META_KEY, true );
	return is_string( $css ) ? $css : '';
}

/**
 * Build cached derived frontend styles HTML for a post.
 *
 * @param int $post_id
 * @return string
 */
function motto_styler_get_cached_frontend_styles_html_for_post( $post_id ) {
	$css = motto_styler_get_cached_frontend_styles_css_for_post( $post_id );
	if ( $css === '' ) {
		return '';
	}

	return '<style id="motto-styler-styles">' . $css . '</style>';
}

/**
 * Build cached derived frontend styles HTML for the current singular post.
 *
 * @return string
 */
function motto_styler_get_current_cached_frontend_styles_html() {
	$post_id = motto_styler_get_current_frontend_cache_post_id();
	if ( $post_id <= 0 ) {
		return '';
	}

	return motto_styler_get_cached_frontend_styles_html_for_post( $post_id );
}

/**
 * Add attributes to the first HTML tag of the block output.
 *
 * @param string $block_content
 * @param array  $attributes Array of [name,value] pairs.
 * @return string
 */
function motto_styler_add_attributes_to_block_html($block_content, array $attributes) {
	if (trim($block_content) === '' || empty($attributes)) {
		return $block_content;
	}

	$attrs = [];
	foreach ($attributes as $attr) {
		$name = isset($attr['name']) ? strtolower(trim((string) $attr['name'])) : '';
		$value = isset($attr['value']) ? (string) $attr['value'] : '';

		if ($name === '') {
			continue;
		}
		if (! preg_match('/^[a-zA-Z_:][a-zA-Z0-9:._-]*$/', $name)) {
			continue;
		}
		if (strpos($name, 'on') === 0 || $name === 'style' || $name === 'srcdoc') {
			continue;
		}

		$safe_value = motto_styler_sanitize_html_attribute_value($name, $value);
		if ($safe_value === null) {
			continue;
		}

		$attrs[] = [$name, $safe_value];
	}

	if (empty($attrs)) {
		return $block_content;
	}

	if (class_exists('WP_HTML_Tag_Processor')) {
		$processor = new WP_HTML_Tag_Processor($block_content);
		if ($processor->next_tag()) {
			foreach ($attrs as [$name, $value]) {
				$processor->set_attribute($name, $value);
			}
			return $processor->get_updated_html();
		}
		return $block_content;
	}

	// Fallback: inject attributes into first opening tag.
	if (preg_match('/^<([a-zA-Z0-9:-]+)(\s[^>]*)?>/', $block_content, $m)) {
		$tag  = $m[1];
		$rest = isset($m[2]) ? $m[2] : '';

		foreach ($attrs as [$name, $value]) {
			$rest .= ' ' . $name . '="' . esc_attr($value) . '"';
		}

		$new_opening = '<' . $tag . $rest . '>';
		return preg_replace('/^<([a-zA-Z0-9:-]+)(\s[^>]*)?>/', $new_opening, $block_content, 1);
	}

	return $block_content;
}

/**
 * Sanitize user-authored HTML attribute values for frontend wrapper injection.
 *
 * @param string $name
 * @param string $value
 * @return string|null
 */
function motto_styler_sanitize_html_attribute_value($name, $value) {
	$name = strtolower(trim((string) $name));
	$value = is_string($value) ? $value : (string) $value;
	$value = function_exists('wp_check_invalid_utf8') ? wp_check_invalid_utf8($value, true) : $value;
	$value = trim(str_replace(array("\r", "\n", "\t"), ' ', $value));

	if ($value === '') {
		return '';
	}

	if (preg_match('/^data-[a-z0-9_.:-]+$/', $name)) {
		return substr($value, 0, 500);
	}

	if (preg_match('/^aria-[a-z0-9_.:-]+$/', $name)) {
		return substr($value, 0, 500);
	}

	switch ($name) {
		case 'id':
			$value = sanitize_html_class($value);
			return $value !== '' ? $value : null;
		case 'role':
			$value = preg_replace('/[^a-z0-9_-]/', '', strtolower($value));
			return $value !== '' ? $value : null;
		case 'title':
		case 'lang':
		case 'dir':
			return substr($value, 0, 200);
		case 'tabindex':
			if (! preg_match('/^-?[0-9]+$/', $value)) {
				return null;
			}
			return (string) max(-1, min(32767, (int) $value));
		case 'hidden':
			return in_array(strtolower($value), array('', 'hidden', 'true', '1'), true) ? 'hidden' : null;
		default:
			return null;
	}
}

/**
 * Check whether CSS rows contain at least one non-empty name/value pair.
 *
 * @param mixed $rows
 * @return bool
 */
function motto_styler_has_non_empty_css_rows( $rows ) {
	if ( ! is_array( $rows ) ) {
		return false;
	}

	foreach ( $rows as $row ) {
		if ( ! is_array( $row ) ) {
			continue;
		}
		$name  = isset( $row['name'] ) ? trim( (string) $row['name'] ) : '';
		$value = isset( $row['value'] ) ? trim( (string) $row['value'] ) : '';
		if ( $name !== '' || $value !== '' ) {
			return true;
		}
	}

	return false;
}

/**
 * Check whether inner selector rows contain meaningful selector/css payload.
 *
 * @param mixed $rows
 * @return bool
 */
function motto_styler_has_non_empty_inner_selector_rows( $rows ) {
	if ( ! is_array( $rows ) ) {
		return false;
	}

	foreach ( $rows as $row ) {
		if ( ! is_array( $row ) ) {
			continue;
		}
		$selector = isset( $row['selector'] ) ? trim( (string) $row['selector'] ) : '';
		if ( $selector !== '' ) {
			return true;
		}
		if ( motto_styler_has_non_empty_css_rows( isset( $row['css'] ) ? $row['css'] : array() ) ) {
			return true;
		}
	}

	return false;
}

/**
 * Check whether a Styler payload contains meaningful data.
 *
 * @param mixed $value
 * @return bool
 */
function motto_styler_has_styler_content( $value ) {
	if ( ! is_array( $value ) ) {
		return false;
	}

	$css = ( isset( $value['css'] ) && is_array( $value['css'] ) ) ? $value['css'] : array();
	foreach ( $css as $rows ) {
		if ( motto_styler_has_non_empty_css_rows( $rows ) ) {
			return true;
		}
	}

	$inner = ( isset( $value['innerSelectors'] ) && is_array( $value['innerSelectors'] ) ) ? $value['innerSelectors'] : array();
	foreach ( $inner as $rows ) {
		if ( motto_styler_has_non_empty_inner_selector_rows( $rows ) ) {
			return true;
		}
	}

	$html = ( isset( $value['html'] ) && is_array( $value['html'] ) ) ? $value['html'] : array();
	if ( isset( $html['attributes'] ) && is_array( $html['attributes'] ) && ! empty( $html['attributes'] ) ) {
		return true;
	}

	if ( isset( $value['cssClasses'] ) && is_array( $value['cssClasses'] ) && ! empty( $value['cssClasses'] ) ) {
		return true;
	}

	$block_spacing = ( isset( $value['blockSpacing'] ) && is_array( $value['blockSpacing'] ) ) ? $value['blockSpacing'] : array();
	$block_spacing_enabled = isset( $block_spacing['enabled'] ) && true === $block_spacing['enabled'];
	$block_spacing_values = ( isset( $block_spacing['values'] ) && is_array( $block_spacing['values'] ) ) ? $block_spacing['values'] : array();
	if ( $block_spacing_enabled ) {
		foreach ( $block_spacing_values as $spacing_value ) {
			if ( is_string( $spacing_value ) && '' !== trim( $spacing_value ) ) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Resolve styler payload from block attributes.
 *
 * @param array $attrs Block attributes.
 * @return array
 */
function motto_styler_resolve_styler_attributes( array $attrs ) {
	$styler = ( isset( $attrs['mottoStyler'] ) && is_array( $attrs['mottoStyler'] ) ) ? $attrs['mottoStyler'] : array();
	if ( motto_styler_has_styler_content( $styler ) ) {
		return $styler;
	}
	if ( ! empty( $styler ) ) {
		return $styler;
	}
	return array();
}

/**
 * Filter: render_block
 *
 * - Resolve mottoStyler from block attributes
 * - Use instanceId to build a unique class
 * - Register CSS rule (desktop only)
 * - Inject class into HTML output
 */

function motto_styler_render_block_filter($block_content, $block) {
	try {
		if (is_admin()) {
			return $block_content;
		}

		if (empty($block['blockName']) || empty($block['attrs']) || ! is_array($block['attrs'])) {
			return $block_content;
		}

		// Synced patterns (`core/block`) render referenced content without a wrapper — skip.
		if ( $block['blockName'] === 'core/block' ) {
			return $block_content;
		}

		if (function_exists('motto_styler_is_target_block') && ! motto_styler_is_target_block((string) $block['blockName'])) {
			return $block_content;
		}

		$motto_styler = motto_styler_resolve_styler_attributes( $block['attrs'] );
		if ( empty( $motto_styler ) ) {
			return $block_content;
		}
		$GLOBALS['motto_styler_has_blocks'] = true;

		// Base helper class for any block using MottoStyler.
		$block_content = motto_styler_add_class_to_block_html($block_content, 'has-motto-styler');

		// Signal class for blocks with custom block spacing defined.
		$_bs = $motto_styler['blockSpacing'] ?? null;
		if (
			is_array( $_bs ) &&
			( $_bs['enabled'] ?? false ) === true &&
			is_array( $_bs['values'] ?? null ) &&
			array_filter( $_bs['values'], fn( $v ) => is_string( $v ) && trim( $v ) !== '' )
		) {
			$block_content = motto_styler_add_class_to_block_html( $block_content, 'motto-has-block-spacing' );
		}
		unset( $_bs );

		$css_class_conditionals = [];

		// Inject HTML attributes if provided.
		if (! empty($motto_styler['html']) && is_array($motto_styler['html']) && isset($motto_styler['html']['attributes'])) {
			$attrs = is_array($motto_styler['html']['attributes']) ? $motto_styler['html']['attributes'] : [];
			$block_content = motto_styler_add_attributes_to_block_html($block_content, $attrs);
		}

		// Apply CSS classes from cssClasses array.
		if ( isset( $motto_styler['cssClasses'] ) && is_array( $motto_styler['cssClasses'] ) ) {
			$resolved = motto_styler_resolve_css_class_items( $motto_styler['cssClasses'] );
			foreach ( $resolved['classes'] as $resolved_slug ) {
				motto_styler_register_css_class_slug( $resolved_slug, 'class' );
				$block_content = motto_styler_add_class_to_block_html( $block_content, $resolved_slug );
			}
			foreach ( $resolved['conditional'] as $extra_class ) {
				$css_class_conditionals[] = $extra_class;
				motto_styler_register_css_class_slug( $extra_class, 'conditional' );
			}
		}
		
		// Prefer instanceId for per-block uniqueness.
		$instance_id_raw = isset($motto_styler['instanceId']) ? $motto_styler['instanceId'] : '';
		if ($instance_id_raw === '' && isset($block['clientId'])) {
			$instance_id_raw = (string) $block['clientId'];
		}
		$instance_id     = motto_styler_sanitize_instance_id($instance_id_raw);

		// Desktop CSS rows (only used for fallback hash).
		$css_desktop = [];
		if (isset($motto_styler['css']['desktop']) && is_array($motto_styler['css']['desktop'])) {
			$css_desktop = $motto_styler['css']['desktop'];
		}

		if ($instance_id === '') {
			// Fallback for legacy blocks without instanceId.
			$instance_id = 'h-' . motto_styler_build_fallback_hash((string) $block['blockName'], $css_desktop);
		}

		$class    = 'motto-styler-' . $instance_id;
		$selector = 'html:root .' . $class;

		// Build CSS via the responsive builder.
		$css = motto_styler_build_block_css(
			$selector,
			$motto_styler,
			array(
				'blockName' => isset( $block['blockName'] ) ? (string) $block['blockName'] : '',
			)
		);
		if ($css === '') {
			// No styles to output, avoid injecting classes.
			if (! empty($css_class_conditionals)) {
				$seen = [];
				foreach ($css_class_conditionals as $extra_class) {
					$extra_class = sanitize_html_class((string) $extra_class);
					if ($extra_class === '' || isset($seen[$extra_class])) {
						continue;
					}
					$seen[$extra_class] = true;
					motto_styler_register_css_class_slug($extra_class, 'conditional');
					$block_content = motto_styler_add_class_to_block_html($block_content, $extra_class);
				}
			}
			return $block_content;
		}

		// Register (dedupe by class).
		$meta = motto_styler_get_current_render_meta();
		$depth = isset( $meta['depth'] ) ? (int) $meta['depth'] : 0;
		$tree_index = isset( $meta['treeIndex'] ) ? (int) $meta['treeIndex'] : 0;

		motto_styler_register_instance_css_rule(
			$class,
			$css,
			array(
				'depth' => $depth,
				'treeIndex' => $tree_index,
			)
		);

		// Inject the main instance class.
		$block_content = motto_styler_add_class_to_block_html($block_content, $class);

		$conditional_classes = $css_class_conditionals ?? [];
		if (function_exists('motto_styler_collect_conditional_classes')) {
			$extra_classes = motto_styler_collect_conditional_classes($motto_styler, $block);
			if (is_array($extra_classes) && ! empty($extra_classes)) {
				$conditional_classes = array_merge($conditional_classes, $extra_classes);
			}
		}
		if (! empty($conditional_classes)) {
			$seen = [];
			foreach ($conditional_classes as $extra_class) {
				$extra_class = sanitize_html_class((string) $extra_class);
				if ($extra_class === '' || isset($seen[$extra_class])) {
					continue;
				}
				$seen[$extra_class] = true;
				motto_styler_register_css_class_slug($extra_class, 'conditional');
				$block_content = motto_styler_add_class_to_block_html($block_content, $extra_class);
			}
		}

		return $block_content;
	} finally {
		motto_styler_pop_current_render_meta();
	}
}
add_filter('render_block', 'motto_styler_render_block_filter', 999, 2);

/**
 * Capture a frontend style registry snapshot from the current request globals.
 *
 * @return array{css:array<string,mixed>,class:array<string,bool>,conditional:array<string,bool>}
 */
function motto_styler_get_frontend_registry_snapshot() {
	return array(
		'css' => isset( $GLOBALS['motto_styler_css_registry'] ) && is_array( $GLOBALS['motto_styler_css_registry'] )
			? $GLOBALS['motto_styler_css_registry']
			: array(),
		'class' => isset( $GLOBALS['motto_styler_css_class_registry'] ) && is_array( $GLOBALS['motto_styler_css_class_registry'] )
			? $GLOBALS['motto_styler_css_class_registry']
			: array(),
		'conditional' => isset( $GLOBALS['motto_styler_css_conditional_registry'] ) && is_array( $GLOBALS['motto_styler_css_conditional_registry'] )
			? $GLOBALS['motto_styler_css_conditional_registry']
			: array(),
	);
}

/**
 * Build the global frontend CSS variables string.
 *
 * @return string
 */
function motto_styler_get_frontend_variables_css() {
	if ( ! function_exists( 'motto_styler_build_css_variables_rules' ) ) {
		return '';
	}

	return (string) motto_styler_build_css_variables_rules();
}

/**
 * Build the global frontend CSS variables style tag.
 *
 * @return string
 */
function motto_styler_get_frontend_variables_html() {
	if ( is_admin() ) {
		return '';
	}

	$css = motto_styler_get_frontend_variables_css();
	if ( $css === '' ) {
		return '';
	}

	return '<style id="motto-styler-vars">' . $css . '</style>';
}

/**
 * Build the shared frontend CSS classes string.
 *
 * @param array<string,mixed> $registry_snapshot
 * @return string
 */
function motto_styler_get_frontend_shared_classes_css( array $registry_snapshot = array() ) {
	if ( empty( $registry_snapshot ) ) {
		$registry_snapshot = motto_styler_get_frontend_registry_snapshot();
	}

	$class_registry = isset( $registry_snapshot['class'] ) && is_array( $registry_snapshot['class'] )
		? $registry_snapshot['class']
		: array();

	if ( empty( $class_registry ) || ! function_exists( 'motto_styler_build_css_class_rules' ) ) {
		return '';
	}

	return (string) motto_styler_build_css_class_rules( array_keys( $class_registry ) );
}

/**
 * Build the shared frontend CSS classes style tag.
 *
 * @param array<string,mixed> $registry_snapshot
 * @return string
 */
function motto_styler_get_frontend_shared_classes_html( array $registry_snapshot = array() ) {
	if ( is_admin() ) {
		return '';
	}

	$css = motto_styler_get_frontend_shared_classes_css( $registry_snapshot );
	if ( $css === '' ) {
		return '';
	}

	return '<style id="motto-styler-classes">' . $css . '</style>';
}

/**
 * Build sorted instance rows from the current CSS registry.
 *
 * @param array<string,mixed> $css_registry
 * @return array<int,array{class:string,css:string,depth:int,treeIndex:int}>
 */
function motto_styler_build_frontend_instance_rows( array $css_registry ) {
	if ( empty( $css_registry ) ) {
		return array();
	}

	$instance_rows = array();
	foreach ( $css_registry as $class_name => $entry ) {
		if ( is_array( $entry ) ) {
			$instance_rows[] = array(
				'class' => (string) $class_name,
				'css' => isset( $entry['css'] ) ? (string) $entry['css'] : '',
				'depth' => isset( $entry['depth'] ) ? (int) $entry['depth'] : 0,
				'treeIndex' => isset( $entry['treeIndex'] ) ? (int) $entry['treeIndex'] : PHP_INT_MAX,
			);
			continue;
		}
		$instance_rows[] = array(
			'class' => (string) $class_name,
			'css' => (string) $entry,
			'depth' => 0,
			'treeIndex' => PHP_INT_MAX,
		);
	}

	$instance_sort = function_exists('motto_styler_get_css_output_instance_sort')
		? motto_styler_get_css_output_instance_sort()
		: array('depthAsc', 'treeIndexAsc');

	usort($instance_rows, function ($a, $b) use ($instance_sort) {
		foreach ($instance_sort as $rule) {
			$rule = (string) $rule;
			if ($rule === 'depthAsc') {
				if ((int) $a['depth'] !== (int) $b['depth']) {
					return (int) $a['depth'] - (int) $b['depth'];
				}
				continue;
			}
			if ($rule === 'treeIndexAsc') {
				if ((int) $a['treeIndex'] !== (int) $b['treeIndex']) {
					return (int) $a['treeIndex'] - (int) $b['treeIndex'];
				}
			}
		}
		return strcmp((string) $a['class'], (string) $b['class']);
	});

	return $instance_rows;
}

/**
 * Build frontend CSS buckets from a registry snapshot.
 *
 * @param array<string,mixed> $registry_snapshot {
 *   @type array<string,mixed> $css         Instance CSS registry.
 *   @type array<string,bool>  $class       CSS class registry.
 *   @type array<string,bool>  $conditional Conditional CSS class registry.
 * }
 * @return array{class:string,instance:string,conditional:string}
 */
function motto_styler_build_frontend_style_buckets( array $registry_snapshot = array() ) {
	if ( empty( $registry_snapshot ) ) {
		$registry_snapshot = motto_styler_get_frontend_registry_snapshot();
	}

	$css_registry = isset( $registry_snapshot['css'] ) && is_array( $registry_snapshot['css'] )
		? $registry_snapshot['css']
		: array();
	$class_registry = isset( $registry_snapshot['class'] ) && is_array( $registry_snapshot['class'] )
		? $registry_snapshot['class']
		: array();
	$conditional_registry = isset( $registry_snapshot['conditional'] ) && is_array( $registry_snapshot['conditional'] )
		? $registry_snapshot['conditional']
		: array();

	$bucket_css = array(
		'class' => '',
		'instance' => '',
		'conditional' => '',
	);

	if ( ! empty( $class_registry ) && function_exists( 'motto_styler_build_css_class_rules' ) ) {
		$bucket_css['class'] = motto_styler_build_css_class_rules( array_keys( $class_registry ) );
	}

	if ( ! empty( $css_registry ) ) {
		$instance_rows = motto_styler_build_frontend_instance_rows( $css_registry );
		$bucket_css['instance'] = implode('', array_map(
			function ($row) {
				return isset($row['css']) ? (string) $row['css'] : '';
			},
			$instance_rows
		));
	}

	if ( ! empty( $conditional_registry ) && function_exists( 'motto_styler_build_css_class_rules' ) ) {
		$bucket_css['conditional'] = motto_styler_build_css_class_rules( array_keys( $conditional_registry ) );
	}

	return $bucket_css;
}

/**
 * Build the final frontend CSS string from resolved buckets.
 *
 * @param array{class:string,instance:string,conditional:string} $bucket_css
 * @return string
 */
function motto_styler_build_frontend_styles_css( array $bucket_css ) {
	$css = '';

	$bucket_order = function_exists('motto_styler_get_css_output_bucket_order')
		? motto_styler_get_css_output_bucket_order()
		: array('class', 'instance', 'conditional');
	foreach ($bucket_order as $bucket) {
		$bucket = (string) $bucket;
		if (isset($bucket_css[$bucket])) {
			$css .= (string) $bucket_css[$bucket];
		}
	}
	foreach ($bucket_css as $bucket => $bucket_css_value) {
		if (! in_array($bucket, $bucket_order, true)) {
			$css .= (string) $bucket_css_value;
		}
	}

	return $css;
}

/**
 * Build the final frontend stylesheet tag from collected rules.
 *
 * @return string
 */
function motto_styler_get_frontend_styles_html() {
	if (is_admin()) {
		return '';
	}

	$bucket_css = motto_styler_build_frontend_style_buckets( motto_styler_get_frontend_registry_snapshot() );
	unset( $bucket_css['class'] );
	$css = motto_styler_build_frontend_styles_css( $bucket_css );

	if ($css === '') {
		return '';
	}

	return '<style id="motto-styler-styles">' . $css . '</style>';
}

/**
 * Print global frontend CSS variables early in head.
 *
 * @return void
 */
function motto_styler_print_frontend_variables() {
	$html = motto_styler_get_frontend_variables_html();
	if ( $html === '' ) {
		return;
	}

	$GLOBALS['motto_styler_frontend_variables_printed'] = true;
	echo $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $html is a <style> tag wrapping generated CSS (motto_styler_get_frontend_variables_html()); esc_html() would corrupt valid CSS syntax.
}
add_action( 'wp_head', 'motto_styler_print_frontend_variables', 999997 );

/**
 * Print shared frontend CSS classes early in head.
 *
 * @return void
 */
function motto_styler_print_frontend_shared_classes() {
	$html = motto_styler_get_frontend_shared_classes_html();
	if ( $html === '' ) {
		return;
	}

	$GLOBALS['motto_styler_frontend_shared_classes_printed'] = true;
	echo $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $html is a <style> tag wrapping generated CSS (motto_styler_get_frontend_shared_classes_html()); esc_html() would corrupt valid CSS syntax.
}
add_action( 'wp_head', 'motto_styler_print_frontend_shared_classes', 999998 );

/**
 * Print cached derived frontend styles in head when available.
 *
 * @return void
 */
function motto_styler_print_cached_frontend_styles() {
	$html = motto_styler_get_current_cached_frontend_styles_html();
	if ( $html === '' ) {
		return;
	}

	$GLOBALS['motto_styler_frontend_cached_styles_printed'] = true;
	echo $html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $html is a <style> tag wrapping generated CSS (motto_styler_get_current_cached_frontend_styles_html()); esc_html() would corrupt valid CSS syntax.
}
add_action( 'wp_head', 'motto_styler_print_cached_frontend_styles', 999999 );

/**
 * Return the head placeholder used for late CSS injection.
 *
 * @return string
 */
function motto_styler_get_frontend_styles_head_placeholder() {
	return '<!-- motto-styler-styles -->';
}

/**
 * Check whether front-end head injection is enabled for the current request.
 *
 * @return bool
 */
function motto_styler_is_frontend_styles_head_injection_enabled() {
	return ! empty($GLOBALS['motto_styler_frontend_styles_head_injection']);
}

/**
 * Decide whether the current request should buffer HTML output for late head injection.
 *
 * @return bool
 */
function motto_styler_should_buffer_frontend_output() {
	if (is_admin() || wp_doing_ajax()) {
		return false;
	}

	if (function_exists('wp_is_json_request') && wp_is_json_request()) {
		return false;
	}

	if (is_feed() || is_robots() || is_trackback()) {
		return false;
	}

	if ( motto_styler_get_current_cached_frontend_styles_html() !== '' ) {
		return false;
	}

	return true;
}

/**
 * Inject the collected stylesheet into the lowest possible point inside <head>.
 *
 * @param string $html
 * @return string
 */
function motto_styler_inject_frontend_styles_into_head($html) {
	if (! is_string($html) || $html === '') {
		return $html;
	}

	$placeholder = motto_styler_get_frontend_styles_head_placeholder();
	if ( ! empty( $GLOBALS['motto_styler_frontend_cached_styles_printed'] ) ) {
		return str_replace( $placeholder, '', $html );
	}

	$style_tag = motto_styler_get_frontend_styles_html();

	if ($style_tag === '') {
		return str_replace($placeholder, '', $html);
	}

	if (strpos($html, $placeholder) !== false) {
		return str_replace($placeholder, $style_tag, $html);
	}

	if (stripos($html, '</head>') !== false) {
		return preg_replace('/<\/head>/i', $style_tag . '</head>', $html, 1);
	}

	if (stripos($html, '</body>') !== false) {
		return preg_replace('/<\/body>/i', $style_tag . '</body>', $html, 1);
	}

	return $html . $style_tag;
}

/**
 * Start output buffering early enough to move late-generated CSS into <head>.
 *
 * @return void
 */
function motto_styler_start_frontend_styles_head_injection() {
	if (! motto_styler_should_buffer_frontend_output()) {
		return;
	}

	$GLOBALS['motto_styler_frontend_styles_head_injection'] = true;
	$GLOBALS['motto_styler_frontend_styles_head_injection_ob_level'] = ob_get_level();
	ob_start('motto_styler_inject_frontend_styles_into_head');
}
add_action('template_redirect', 'motto_styler_start_frontend_styles_head_injection', 0);

/**
 * Explicitly close the buffer opened by motto_styler_start_frontend_styles_head_injection(),
 * instead of relying on PHP's implicit flush-on-shutdown. Only acts if that buffer is still
 * the current one (its start level plus one) — if something else has since opened and not
 * closed its own buffer on top of ours, this leaves the stack alone rather than risk closing
 * a buffer it doesn't own.
 *
 * @return void
 */
function motto_styler_close_frontend_styles_head_injection() {
	if ( empty( $GLOBALS['motto_styler_frontend_styles_head_injection'] ) ) {
		return;
	}

	$expected_level = ( $GLOBALS['motto_styler_frontend_styles_head_injection_ob_level'] ?? 0 ) + 1;
	if ( ob_get_level() === $expected_level ) {
		ob_end_flush();
	}

	unset( $GLOBALS['motto_styler_frontend_styles_head_injection'] );
}
add_action('shutdown', 'motto_styler_close_frontend_styles_head_injection', 0);

/**
 * Print a placeholder at the very end of <head> for late CSS injection.
 *
 * @return void
 */
function motto_styler_print_frontend_styles_head_placeholder() {
	if ( ! empty( $GLOBALS['motto_styler_frontend_cached_styles_printed'] ) ) {
		return;
	}
	if (! motto_styler_is_frontend_styles_head_injection_enabled()) {
		return;
	}

	echo motto_styler_get_frontend_styles_head_placeholder(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- returns a fixed HTML comment literal, no dynamic data.
}
add_action('wp_head', 'motto_styler_print_frontend_styles_head_placeholder', 999999);

/**
 * Print all collected rules once.
 */
function motto_styler_print_frontend_styles() {
	if (motto_styler_is_frontend_styles_head_injection_enabled()) {
		return;
	}

	if ( ! empty( $GLOBALS['motto_styler_frontend_cached_styles_printed'] ) ) {
		return;
	}

	if ( empty( $GLOBALS['motto_styler_frontend_variables_printed'] ) ) {
		echo motto_styler_get_frontend_variables_html(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- <style> tag wrapping generated CSS; esc_html() would corrupt valid CSS syntax.
	}
	if ( empty( $GLOBALS['motto_styler_frontend_shared_classes_printed'] ) ) {
		echo motto_styler_get_frontend_shared_classes_html(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- <style> tag wrapping generated CSS; esc_html() would corrupt valid CSS syntax.
	}

	$cached_html = motto_styler_get_current_cached_frontend_styles_html();
	if ( $cached_html !== '' ) {
		echo $cached_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- <style> tag wrapping generated CSS; esc_html() would corrupt valid CSS syntax.
		return;
	}

	echo motto_styler_get_frontend_styles_html(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- <style> tag wrapping generated CSS; esc_html() would corrupt valid CSS syntax.
}

add_action('wp_footer', 'motto_styler_print_frontend_styles', 20);
