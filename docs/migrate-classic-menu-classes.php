<?php
/**
 * One-time migration: rename motto/classic-menu CSS classes in post_content.
 *
 * Replaces old class strings saved inside mottoStyler block attributes
 * (stored as JSON inside Gutenberg block comments in wp_posts.post_content).
 *
 * Run once via WP-CLI:
 *   wp eval-file docs/migrate-classic-menu-classes.php
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
	'motto-block-navigation-item__content'  => 'motto-classic-menu__item-content',
	'motto-block-navigation-submenu__toggle' => 'motto-classic-menu__submenu-toggle',
	'motto-block-navigation__submenu-container' => 'motto-classic-menu__submenu-container',
	'motto-block-navigation__submenu-icon'  => 'motto-classic-menu__submenu-icon',
	'motto-block-navigation__submenu'       => 'motto-classic-menu__submenu',
	'motto-block-navigation__container'     => 'motto-classic-menu__container',
	'motto-block-navigation-item'           => 'motto-classic-menu__item',
);

$posts = $wpdb->get_results(
	"SELECT ID, post_content FROM {$wpdb->posts}
	 WHERE post_content LIKE '%motto-block-navigation%'
	 AND post_status NOT IN ('auto-draft', 'trash')",
	ARRAY_A
);

if ( empty( $posts ) ) {
	echo "No posts found with old class names. Nothing to migrate.\n";
	return;
}

echo sprintf( "Found %d post(s) to migrate.\n", count( $posts ) );

$updated = 0;

foreach ( $posts as $post ) {
	$new_content = $post['post_content'];

	foreach ( $replacements as $old => $new ) {
		$new_content = str_replace( $old, $new, $new_content );
	}

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
		$updated++;
	} else {
		echo sprintf( "  ERROR updating post ID %d\n", $post['ID'] );
	}
}

echo sprintf( "Done. %d post(s) updated.\n", $updated );
