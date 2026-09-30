<?php
/**
 * One-time migration: all accumulated CSS class renames in post_content and post meta.
 *
 * Covers:
 *   - motto/classic-menu  (2026-03-26)
 *   - motto/container     (2026-03-27)
 *
 * Scopes:
 *   1. wp_posts.post_content  — block HTML + mottoStyler attributes in block comments
 *   2. wp_postmeta (meta_key = 'motto_styler') — motto_css_class CPT Styler data
 *      Uses get_post_meta/update_post_meta to handle PHP serialization correctly.
 *
 * Run once via WP-CLI:
 *   wp eval-file docs/migrate-all-classes.php
 *
 * Or drop temporarily in a theme's functions.php, load the page once, then remove.
 *
 * See: docs/class-rename-log.md for full rename reference.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

global $wpdb;

// Order matters: more specific strings first to avoid partial matches.
$replacements = array(
	// motto/classic-menu
	'motto-block-navigation-item__content'      => 'motto-classic-menu__item-content',
	'motto-block-navigation-submenu__toggle'    => 'motto-classic-menu__submenu-toggle',
	'motto-block-navigation__submenu-container' => 'motto-classic-menu__submenu-container',
	'motto-block-navigation__submenu-icon'      => 'motto-classic-menu__submenu-icon',
	'motto-block-navigation__submenu'           => 'motto-classic-menu__submenu',
	'motto-block-navigation__container'         => 'motto-classic-menu__container',
	'motto-block-navigation-item'               => 'motto-classic-menu__item',

	// motto/container
	'motto-container-link-overlay'              => 'motto-container__link-overlay',
	'motto-bg-overlay'                          => 'motto-container__bg-overlay',
	'motto-bg-image'                            => 'motto-container__bg-image',
);

$search_terms = array(
	'motto-block-navigation',
	'motto-bg-image',
	'motto-bg-overlay',
	'motto-container-link-overlay',
);

/**
 * Apply $replacements recursively to all string values in a mixed value.
 */
function motto_migrate_replace_recursive( $value, array $replacements ) {
	if ( is_string( $value ) ) {
		return str_replace( array_keys( $replacements ), array_values( $replacements ), $value );
	}

	if ( is_array( $value ) ) {
		foreach ( $value as $k => $v ) {
			$value[ $k ] = motto_migrate_replace_recursive( $v, $replacements );
		}
		return $value;
	}

	if ( is_object( $value ) ) {
		foreach ( get_object_vars( $value ) as $k => $v ) {
			$value->$k = motto_migrate_replace_recursive( $v, $replacements );
		}
		return $value;
	}

	return $value;
}

// ---------------------------------------------------------------------------
// 1. wp_posts.post_content (plain HTML — str_replace is safe here)
// ---------------------------------------------------------------------------

$like_clauses = implode( ' OR ', array_map(
	fn( $term ) => "post_content LIKE '%" . esc_sql( $term ) . "%'",
	$search_terms
) );

$posts = $wpdb->get_results(
	"SELECT ID, post_content FROM {$wpdb->posts}
	 WHERE ( {$like_clauses} )
	 AND post_status NOT IN ('auto-draft', 'trash')",
	ARRAY_A
);

$posts_updated = 0;

if ( empty( $posts ) ) {
	echo "post_content: no posts found with old class names.\n";
} else {
	echo sprintf( "post_content: found %d post(s).\n", count( $posts ) );

	foreach ( $posts as $post ) {
		$new_content = str_replace(
			array_keys( $replacements ),
			array_values( $replacements ),
			$post['post_content']
		);

		if ( $new_content === $post['post_content'] ) {
			continue;
		}

		$result = $wpdb->update(
			$wpdb->posts,
			array( 'post_content' => $new_content ),
			array( 'ID' => $post['ID'] ),
			array( '%s' ),
			array( '%d' )
		);

		if ( false !== $result ) {
			echo sprintf( "  Updated post ID %d\n", $post['ID'] );
			clean_post_cache( $post['ID'] );
			$posts_updated++;
		} else {
			echo sprintf( "  ERROR updating post ID %d\n", $post['ID'] );
		}
	}
}

echo sprintf( "post_content: %d post(s) updated.\n\n", $posts_updated );

// ---------------------------------------------------------------------------
// 2. wp_postmeta meta_key='motto_styler' (PHP-serialized object)
//    Use get_post_meta/update_post_meta so WP handles serialization correctly.
// ---------------------------------------------------------------------------

$meta_like_clauses = implode( ' OR ', array_map(
	fn( $term ) => "meta_value LIKE '%" . esc_sql( $term ) . "%'",
	$search_terms
) );

$meta_post_ids = $wpdb->get_col(
	"SELECT DISTINCT post_id FROM {$wpdb->postmeta}
	 WHERE meta_key = 'motto_styler'
	 AND ( {$meta_like_clauses} )"
);

$meta_updated = 0;

if ( empty( $meta_post_ids ) ) {
	echo "postmeta: no motto_styler rows found with old class names.\n";
} else {
	echo sprintf( "postmeta: found %d post(s) with matching motto_styler meta.\n", count( $meta_post_ids ) );

	foreach ( $meta_post_ids as $post_id ) {
		$post_id  = (int) $post_id;
		$original = get_post_meta( $post_id, 'motto_styler', true );
		$updated  = motto_migrate_replace_recursive( $original, $replacements );

		// Use serialize comparison to detect actual changes in nested structures.
		if ( serialize( $updated ) === serialize( $original ) ) {
			continue;
		}

		$result = update_post_meta( $post_id, 'motto_styler', $updated );

		if ( false !== $result ) {
			echo sprintf( "  Updated post ID %d\n", $post_id );
			$meta_updated++;
		} else {
			echo sprintf( "  ERROR updating post ID %d\n", $post_id );
		}
	}
}

echo sprintf( "postmeta: %d post(s) updated.\n\n", $meta_updated );

echo sprintf( "Done. Total: %d post_content + %d postmeta updated.\n", $posts_updated, $meta_updated );
