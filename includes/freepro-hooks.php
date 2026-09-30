<?php
/**
 * Centralized Free/Pro PHP render-extension hook name constants.
 *
 * PHP-side counterpart to STYLER_HOOKS/BLOCKS_HOOKS (src/lib/freepro-ids.js,
 * src/blocks/freepro/blocks-freepro-ids.js). See docs/specs/SDD-031 for the
 * contract each of these fires under. Never inline these hook names —
 * always reference the constant.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Filter: resolve a dynamic background override for motto/container.
 *
 * Fired by includes/container-render.php from its own render_block_motto/container
 * registration. Default value is `null` (no override — save()'s own background
 * stands). A registered filter returns an array shaped as documented in
 * docs/specs/SDD-031 §5.1.
 */
define( 'MOTTO_HOOK_CONTAINER_BACKGROUND', 'motto_blocks_container_background' );

/**
 * Filter: resolve a dynamic link override for motto/container's link overlay.
 *
 * See docs/specs/SDD-031 §5.2. Default `null`; registered filter returns an array
 * shaped as `['url' => string, 'target' => string, 'rel' => string]`.
 */
define( 'MOTTO_HOOK_CONTAINER_LINK', 'motto_blocks_container_link' );

/**
 * Filter: resolve a dynamic link override for motto/button.
 *
 * See docs/specs/SDD-031 §5.3. Default `null`; registered filter returns a
 * non-empty URL string.
 */
define( 'MOTTO_HOOK_BUTTON_LINK', 'motto_blocks_button_link' );

/**
 * Filter: resolve a dynamic image source payload for motto/image.
 *
 * See docs/specs/SDD-031 §5.4. Default `null` (no filter registered / dynamic
 * source not configured). An empty array `[]` (not `null`) means a dynamic source
 * was configured but resolved to nothing, which suppresses a bare img-less
 * wrapper. A non-empty array is the resolved payload.
 */
define( 'MOTTO_HOOK_IMAGE_SOURCE', 'motto_blocks_image_source' );

/**
 * Filter: contribute additional block definitions to the shared catalog used by
 * the enabled-blocks toggle system and the admin Blocks tab.
 *
 * Fired by Free at the end of `motto_blocks_get_available_block_definitions()`.
 * See docs/specs/SDD-033 §5.1. Default value is the Free-only definitions array
 * (keyed by block name). A registered filter (Pro) returns the same array with
 * its own block.json-derived definitions merged in, each tagged `tier => 'pro'`.
 */
define( 'MOTTO_HOOK_BLOCK_DEFINITIONS', 'motto_blocks_available_block_definitions' );
