<?php
/**
 * One-time migration: rename motto/container CSS classes in post_content.
 *
 * Replaces old class strings saved inside Gutenberg block HTML
 * (static block — classes are stored in wp_posts.post_content directly).
 *
 * Run once via WP-CLI:
 *   wp eval-file docs/migrate-container-classes.php
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
	'motto-container-link-overlay' => 'motto-container__link-overlay',
	'motto-bg-overlay'             => 'motto-container__bg-overlay',
	'motto-bg-image'               => 'motto-container__bg-image',
);

$posts = $wpdb->get_results(
	"SELECT ID, post_content FROM {$wpdb->posts}
	 WHERE (
	   post_content LIKE '%motto-bg-image%'
	   OR post_content LIKE '%motto-bg-overlay%'
	   OR post_content LIKE '%motto-container-link-overlay%'
	 )
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
