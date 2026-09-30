<?php
/**
 * Styler class and variable custom post types.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! defined( 'MOTTO_STYLER_CLASS_META_KEY' ) ) {
	define( 'MOTTO_STYLER_CLASS_META_KEY', 'motto_styler' );
}
if ( ! defined( 'MOTTO_STYLER_CLASS_CONDITIONAL_META_KEY' ) ) {
	define( 'MOTTO_STYLER_CLASS_CONDITIONAL_META_KEY', 'motto_styler_conditional_classes' );
}
if ( ! defined( 'MOTTO_CSS_CLASS_UID_META_KEY' ) ) {
	define( 'MOTTO_CSS_CLASS_UID_META_KEY', 'motto_class_uid' );
}
function motto_blocks_can_manage_styler_library() {
	return current_user_can( 'manage_options' );
}

function motto_styler_sanitize_conditional_classes_meta( $value ) {
	if ( ! is_array( $value ) ) {
		return array();
	}
	$clean = array();
	foreach ( $value as $item ) {
		$item = sanitize_html_class( (string) $item );
		if ( '' !== $item ) {
			$clean[] = $item;
		}
	}
	return array_values( array_unique( $clean ) );
}

function motto_blocks_get_styler_library_capabilities() {
	return array(
		'edit_posts'             => 'manage_options',
		'edit_others_posts'      => 'manage_options',
		'publish_posts'          => 'manage_options',
		'read'                   => 'manage_options',
		'read_private_posts'     => 'manage_options',
		'delete_posts'           => 'manage_options',
		'delete_private_posts'   => 'manage_options',
		'delete_published_posts' => 'manage_options',
		'delete_others_posts'    => 'manage_options',
		'edit_private_posts'     => 'manage_options',
		'edit_published_posts'   => 'manage_options',
		'create_posts'           => 'manage_options',
	);
}

function motto_styler_get_cpt_menu_icon() {
	$data_uri = function_exists( 'motto_styler_get_svg_data_uri' )
		? motto_styler_get_svg_data_uri( 'mottoblocks-menu-icon' )
		: '';
	return $data_uri !== '' ? $data_uri : 'dashicons-editor-code';
}

function motto_blocks_register_css_class_post_type() {
	$labels = array(
		'name'               => __( 'CSS Classes', 'motto-blocks' ),
		'singular_name'      => __( 'CSS Class', 'motto-blocks' ),
		'add_new'            => __( 'Add New', 'motto-blocks' ),
		'add_new_item'       => __( 'Add New CSS Class', 'motto-blocks' ),
		'edit_item'          => __( 'Edit CSS Class', 'motto-blocks' ),
		'new_item'           => __( 'New CSS Class', 'motto-blocks' ),
		'view_item'          => __( 'View CSS Class', 'motto-blocks' ),
		'view_items'         => __( 'View CSS Classes', 'motto-blocks' ),
		'search_items'       => __( 'Search CSS Classes', 'motto-blocks' ),
		'not_found'          => __( 'No CSS classes found', 'motto-blocks' ),
		'not_found_in_trash' => __( 'No CSS classes found in Trash', 'motto-blocks' ),
		'all_items'          => __( 'All CSS Classes', 'motto-blocks' ),
		'menu_name'          => __( 'CSS Classes', 'motto-blocks' ),
	);

	register_post_type(
		'motto_css_class',
		array(
			'labels'              => $labels,
			'public'              => false,
			'show_ui'             => true,
			'show_in_menu'        => false,
			'exclude_from_search' => true,
			'show_in_rest'        => true,
			'map_meta_cap'        => true,
			'capabilities'        => motto_blocks_get_styler_library_capabilities(),
			'menu_icon'           => motto_styler_get_cpt_menu_icon(),
			'supports'            => array( 'title', 'editor', 'custom-fields', 'slug' ),
		)
	);
}
add_action( 'init', 'motto_blocks_register_css_class_post_type' );

/**
 * Preloads the `motto_css_class` list query the block editor always runs on
 * mount (post editor, Site Editor, and Widgets screen alike), so its
 * response ships in the initial `_wpAPIDataPreload` payload instead of
 * costing a second REST round trip after JS mounts. Keep this query in
 * sync with `CLASS_QUERY_BASE` in
 * src/styler/classes/css-class-registry-maps.js.
 *
 * @param array $preload_paths REST paths to preload.
 * @return array
 */
function motto_blocks_preload_css_class_registry_paths( $preload_paths ) {
	$preload_paths[] = add_query_arg(
		array(
			'per_page' => 100,
			'status'   => array( 'publish', 'private', 'draft', 'pending', 'future' ),
			'context'  => 'edit',
			'_fields'  => 'id,slug,title,meta',
			'page'     => 1,
		),
		'/wp/v2/motto_css_class'
	);
	return $preload_paths;
}
add_filter( 'block_editor_rest_api_preload_paths', 'motto_blocks_preload_css_class_registry_paths' );

function motto_blocks_register_css_variable_post_type() {
	$labels = array(
		'name'               => __( 'CSS Variables', 'motto-blocks' ),
		'singular_name'      => __( 'CSS Variable', 'motto-blocks' ),
		'add_new'            => __( 'Add New', 'motto-blocks' ),
		'add_new_item'       => __( 'Add New CSS Variable', 'motto-blocks' ),
		'edit_item'          => __( 'Edit CSS Variable', 'motto-blocks' ),
		'new_item'           => __( 'New CSS Variable', 'motto-blocks' ),
		'view_item'          => __( 'View CSS Variable', 'motto-blocks' ),
		'view_items'         => __( 'View CSS Variables', 'motto-blocks' ),
		'search_items'       => __( 'Search CSS Variables', 'motto-blocks' ),
		'not_found'          => __( 'No CSS variables found', 'motto-blocks' ),
		'not_found_in_trash' => __( 'No CSS variables found in Trash', 'motto-blocks' ),
		'all_items'          => __( 'All CSS Variables', 'motto-blocks' ),
		'menu_name'          => __( 'CSS Variables', 'motto-blocks' ),
	);

	register_post_type(
		'motto_css_variable',
		array(
			'labels'          => $labels,
			'public'          => false,
			'show_ui'         => true,
			'show_in_menu'    => false,
			'exclude_from_search' => true,
			'show_in_rest'    => true,
			'map_meta_cap'    => true,
			'capabilities'    => motto_blocks_get_styler_library_capabilities(),
			'menu_icon'       => motto_styler_get_cpt_menu_icon(),
			'supports'        => array( 'title', 'custom-fields', 'slug' ),
			'rewrite'         => false,
		)
	);
}
add_action( 'init', 'motto_blocks_register_css_variable_post_type' );

function motto_styler_normalize_css_variable_name( $raw_name ) {
	$name = trim( (string) $raw_name );
	if ( '' === $name ) {
		return '';
	}

	$name = preg_replace( '/\s+/', '-', $name );
	$name = preg_replace( '/[^a-zA-Z0-9_\-]/', '', $name );
	$name = strtolower( $name );

	if ( strpos( $name, '--' ) !== 0 ) {
		$name = "--$name";
	}

	return $name;
}

function motto_styler_get_css_variable_name_index( $exclude_post_id = 0 ) {
	$exclude_post_id = (int) $exclude_post_id;
	$variable_posts = get_posts(
		array(
			'post_type'      => 'motto_css_variable',
			'post_status'    => array( 'publish', 'private', 'draft', 'pending', 'future' ),
			'numberposts'    => -1,
			'orderby'        => 'modified',
			'order'          => 'DESC',
			'suppress_filters' => false,
		)
	);

	if ( empty( $variable_posts ) ) {
		return array();
	}

	$names = array();
	foreach ( $variable_posts as $post ) {
		if ( isset( $post->ID ) && $post->ID === $exclude_post_id ) {
			continue;
		}

		$raw_name = isset( $post->post_title ) ? (string) $post->post_title : '';
		$meta_name = get_post_meta( (int) $post->ID, 'motto_variable_name', true );
		if ( '' !== trim( (string) $meta_name ) ) {
			$raw_name = $meta_name;
		}

		$normalized_name = motto_styler_normalize_css_variable_name( $raw_name );
		if ( '' !== $normalized_name ) {
			$names[] = $normalized_name;
		}
	}

	return array_values( array_unique( $names ) );
}

function motto_styler_register_css_variable_meta() {
	register_meta(
		'post',
		'motto_variable_name',
		array(
			'object_subtype' => 'motto_css_variable',
			'single'         => true,
			'type'           => 'string',
			'default'        => '',
			'sanitize_callback' => 'motto_styler_normalize_css_variable_name',
			'auth_callback'  => 'motto_blocks_can_manage_styler_library',
			'show_in_rest'   => array(
				'schema' => array(
					'type' => 'string',
				),
			),
		)
	);

	register_meta(
		'post',
		'motto_variable_value',
		array(
			'object_subtype' => 'motto_css_variable',
			'single'         => true,
			'type'           => 'string',
			'default'        => '',
			'auth_callback'  => 'motto_blocks_can_manage_styler_library',
			'sanitize_callback' => function( $value ) {
				if ( ! is_scalar( $value ) ) {
					return '';
				}
				return function_exists( 'motto_styler_sanitize_css_value' )
					? motto_styler_sanitize_css_value( (string) $value )
					: trim( (string) $value );
			},
			'show_in_rest'   => array(
				'schema' => array(
					'type' => 'string',
				),
			),
		)
	);
}
add_action( 'init', 'motto_styler_register_css_variable_meta' );

function motto_styler_render_css_variable_meta_box( $post ) {
	if ( ! $post instanceof WP_Post ) {
		return;
	}

	wp_nonce_field( 'motto_variable_meta', 'motto_variable_meta_nonce' );
	$name = get_post_meta( $post->ID, 'motto_variable_name', true );
	if ( $name === '' ) {
		$name = $post->post_title;
	}
	$value = get_post_meta( $post->ID, 'motto_variable_value', true );
	$existing_variable_names = motto_styler_get_css_variable_name_index( (int) $post->ID );
	?>
	<p>
		<label for="motto-variable-name" class="components-heading-label"><?php echo esc_html__( 'Variable slug', 'motto-blocks' ); ?></label>
		<input
			type="text"
			id="motto-variable-name"
			name="motto_variable_name"
			value="<?php echo esc_attr( (string) $name ); ?>"
			class="widefat"
			placeholder="<?php echo esc_attr( '--my-variable' ); ?>"
		/>
		<span class="description"><?php echo esc_html__( 'Use the CSS custom property format, for example --accent-color', 'motto-blocks' ); ?></span>
	</p>
	<p>
		<span
			id="motto-variable-name-feedback"
			class="description"
			aria-live="polite"
			data-existing-names="<?php echo esc_attr( wp_json_encode( $existing_variable_names ) ); ?>"
			data-duplicate-message="<?php echo esc_attr__( 'This variable name already exists.', 'motto-blocks' ); ?>"
		></span>
	</p>
	<p>
		<label for="motto-variable-value" class="components-heading-label"><?php echo esc_html__( 'Variable value', 'motto-blocks' ); ?></label>
		<input
			type="text"
			id="motto-variable-value"
			name="motto_variable_value"
			class="widefat"
			spellcheck="false"
			value="<?php echo esc_attr( (string) $value ); ?>"
			placeholder="<?php echo esc_attr( 'clamp(1rem, 2vw, 3rem)' ); ?>"
		/>
	</p>
	<?php
}

function motto_styler_add_css_variable_meta_box() {
	add_meta_box(
		'motto-css-variable',
		__( 'CSS Variable', 'motto-blocks' ),
		'motto_styler_render_css_variable_meta_box',
		'motto_css_variable',
		'normal',
		'high'
	);
}
add_action( 'add_meta_boxes', 'motto_styler_add_css_variable_meta_box' );

function motto_styler_save_css_variable_meta( $post_id ) {
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}

	if ( ! isset( $_POST['motto_variable_meta_nonce'] ) || ! wp_verify_nonce( wp_unslash( $_POST['motto_variable_meta_nonce'] ), 'motto_variable_meta' ) ) {
		return;
	}

	if ( ! current_user_can( 'edit_post', $post_id ) ) {
		return;
	}

	if ( isset( $_POST['motto_variable_name'] ) ) {
		$raw_name = wp_unslash( $_POST['motto_variable_name'] );
		$normalized_name = motto_styler_normalize_css_variable_name( $raw_name );
		update_post_meta( $post_id, 'motto_variable_name', $normalized_name );
	}

	if ( isset( $_POST['motto_variable_value'] ) ) {
		$raw_value = wp_unslash( $_POST['motto_variable_value'] );
		$safe_value = is_scalar( $raw_value ) ? (string) $raw_value : '';
		if ( function_exists( 'motto_styler_sanitize_css_value' ) ) {
			$safe_value = motto_styler_sanitize_css_value( $safe_value );
		}
		update_post_meta( $post_id, 'motto_variable_value', $safe_value );
	}
}
add_action( 'save_post_motto_css_variable', 'motto_styler_save_css_variable_meta', 10, 1 );

/**
 * Transient key caching the computed CSS-variables :root{} block (see
 * motto_styler_build_css_variables_rules()). Invalidated explicitly on
 * save/delete of a motto_css_variable post; the TTL below is only a safety net.
 */
define( 'MOTTO_BLOCKS_CSS_VARIABLES_TRANSIENT', 'motto_blocks_css_variables_css' );

/**
 * Compute (or return cached) the :root{} CSS block for all published
 * motto_css_variable posts. Runs on every frontend request via wp_head, so
 * results are cached in a transient and only recomputed when a save/delete
 * on that post type invalidates it.
 */
function motto_styler_build_css_variables_rules() {
	$cached = get_transient( MOTTO_BLOCKS_CSS_VARIABLES_TRANSIENT );
	if ( is_string( $cached ) ) {
		return $cached;
	}

	$variable_posts = get_posts(
		array(
			'post_type'      => 'motto_css_variable',
			'post_status'    => array( 'publish' ),
			'numberposts'    => -1,
			'orderby'        => 'modified',
			'order'          => 'DESC',
			'suppress_filters' => false,
		)
	);

	if ( empty( $variable_posts ) ) {
		set_transient( MOTTO_BLOCKS_CSS_VARIABLES_TRANSIENT, '', DAY_IN_SECONDS );
		return '';
	}

	$variables = array();
	foreach ( $variable_posts as $post ) {
		$raw_name = get_post_meta( $post->ID, 'motto_variable_name', true );
		if ( '' === trim( (string) $raw_name ) ) {
			$raw_name = isset( $post->post_title ) ? $post->post_title : '';
		}
		$name  = motto_styler_normalize_css_variable_name( $raw_name );
		$value = trim( (string) get_post_meta( $post->ID, 'motto_variable_value', true ) );

		if ( '' === $name || '' === $value ) {
			continue;
		}

		$safe_value = function_exists( 'motto_styler_sanitize_css_value' )
			? motto_styler_sanitize_css_value( $value )
			: str_replace( array( "\r", "\n", '<', '>', '{', '}' ), ' ', $value );
		if ( '' === $safe_value ) {
			continue;
		}

		$variables[ $name ] = $safe_value;
	}

	if ( empty( $variables ) ) {
		set_transient( MOTTO_BLOCKS_CSS_VARIABLES_TRANSIENT, '', DAY_IN_SECONDS );
		return '';
	}

	$out = '';
	foreach ( $variables as $name => $value ) {
		$out .= $name . ': ' . $value . ';';
	}

	$css = ':root{' . $out . '}';
	set_transient( MOTTO_BLOCKS_CSS_VARIABLES_TRANSIENT, $css, DAY_IN_SECONDS );

	return $css;
}

/**
 * Clear the cached CSS-variables :root{} block. Hooked to save/delete of the
 * motto_css_variable post type.
 *
 * @param int $post_id Post ID being saved or deleted.
 * @return void
 */
function motto_styler_clear_css_variables_cache( $post_id ) {
	if ( 'motto_css_variable' !== get_post_type( $post_id ) ) {
		return;
	}
	delete_transient( MOTTO_BLOCKS_CSS_VARIABLES_TRANSIENT );
}
add_action( 'save_post_motto_css_variable', 'motto_styler_clear_css_variables_cache' );
add_action( 'before_delete_post', 'motto_styler_clear_css_variables_cache' );

function motto_styler_unregister_third_party_rest_fields_for_css_class() {
	if ( ! function_exists( 'unregister_rest_field' ) ) {
		return;
	}

	$fields = array(
		// Qubely.
		'qubely_featured_image_url',
		'qubely_author',
		'qubely_comment',
		'qubely_category',
		'qubely_excerpt',
		// Stackable (v2 compatibility fields).
		'featured_image_urls_v2',
		'post_excerpt_stackable_v2',
		'category_list_v2',
		'author_info_v2',
		'comments_num_v2',
	);

	foreach ( $fields as $field ) {
		unregister_rest_field( 'motto_css_class', $field );
	}
}
add_action( 'rest_api_init', 'motto_styler_unregister_third_party_rest_fields_for_css_class', 100 );

function motto_styler_get_css_class_meta_value( $post_id ) {
	$post_id = (int) $post_id;
	if ( $post_id <= 0 ) {
		return array();
	}

	$styler = get_post_meta( $post_id, MOTTO_STYLER_CLASS_META_KEY, true );
	if ( is_array( $styler ) ) {
		return $styler;
	}
	return array();
}

function motto_styler_get_css_class_conditional_meta_value( $post_id ) {
	$post_id = (int) $post_id;
	if ( $post_id <= 0 ) {
		return array();
	}

	$classes = get_post_meta( $post_id, MOTTO_STYLER_CLASS_CONDITIONAL_META_KEY, true );
	return is_array( $classes ) ? $classes : array();
}

function motto_styler_register_css_class_meta() {
	register_meta(
		'post',
		MOTTO_STYLER_CLASS_META_KEY,
		array(
			'object_subtype' => 'motto_css_class',
			'single' => true,
			'type' => 'object',
			'default' => array(),
			'sanitize_callback' => 'motto_styler_sanitize_css_class_meta',
			'auth_callback' => 'motto_blocks_can_manage_styler_library',
			'show_in_rest' => array(
				'schema' => array(
					'type' => 'object',
					'additionalProperties' => true,
				),
			),
		)
	);
		register_meta(
			'post',
			MOTTO_STYLER_CLASS_CONDITIONAL_META_KEY,
			array(
				'object_subtype'    => 'motto_css_class',
				'single'            => true,
				'type'              => 'array',
				'default'           => array(),
				'sanitize_callback' => 'motto_styler_sanitize_conditional_classes_meta',
				'auth_callback'     => 'motto_blocks_can_manage_styler_library',
				'show_in_rest'      => false,
			)
		);
		register_meta(
			'post',
			MOTTO_CSS_CLASS_UID_META_KEY,
			array(
				'object_subtype'    => 'motto_css_class',
				'single'            => true,
				'type'              => 'string',
				'default'           => '',
				'sanitize_callback' => 'motto_styler_sanitize_css_class_uid_meta',
				'auth_callback'     => 'motto_blocks_can_manage_styler_library',
				'show_in_rest'      => array(
					'schema' => array(
						'type' => 'string',
					),
				),
			)
		);
	}
add_action( 'init', 'motto_styler_register_css_class_meta' );

/**
 * Whether the string is a canonical lowercase UUID v4.
 *
 * @param string $value Raw value.
 * @return bool
 */
function motto_styler_is_valid_css_class_uid( $value ) {
	return is_string( $value )
		&& preg_match( '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/', $value );
}

/**
 * Sanitize immutable class uid stored on motto_css_class.
 *
 * @param mixed $value Meta value.
 * @return string Normalized uid or empty string.
 */
function motto_styler_sanitize_css_class_uid_meta( $value ) {
	$raw = is_string( $value ) ? trim( $value ) : '';
	if ( '' === $raw ) {
		return '';
	}
	$lower = strtolower( $raw );
	return motto_styler_is_valid_css_class_uid( $lower ) ? $lower : '';
}

/**
 * Assign a stable UUID once per CSS class CPT (editor + migration rely on it).
 *
 * @param int          $post_id Post ID.
 * @param WP_Post|null $post    Post object.
 * @param bool|null    $update  Whether this is an existing post being updated.
 */
function motto_styler_ensure_css_class_uid( $post_id, $post = null, $update = null ) {
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}
	if ( wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) ) {
		return;
	}
	$post = $post instanceof WP_Post ? $post : get_post( $post_id );
	if ( ! $post || $post->post_type !== 'motto_css_class' ) {
		return;
	}
	$existing = get_post_meta( (int) $post_id, MOTTO_CSS_CLASS_UID_META_KEY, true );
	if ( is_string( $existing ) && motto_styler_is_valid_css_class_uid( strtolower( trim( $existing ) ) ) ) {
		return;
	}
	if ( function_exists( 'wp_generate_uuid4' ) ) {
		update_post_meta( (int) $post_id, MOTTO_CSS_CLASS_UID_META_KEY, wp_generate_uuid4() );
	}
}
add_action( 'save_post_motto_css_class', 'motto_styler_ensure_css_class_uid', 5, 3 );

function motto_styler_sanitize_css_class_meta( $value ) {
	$sanitize_recursive = static function( $node ) use ( &$sanitize_recursive ) {
		if ( is_array( $node ) ) {
			$out = array();
			foreach ( $node as $key => $item ) {
				$safe_key = is_int( $key ) ? $key : (string) $key;
				$out[ $safe_key ] = $sanitize_recursive( $item );
			}
			return $out;
		}
		if ( is_object( $node ) ) {
			return $sanitize_recursive( (array) $node );
		}
		if ( is_string( $node ) ) {
			return function_exists( 'wp_check_invalid_utf8' ) ? wp_check_invalid_utf8( $node, true ) : $node;
		}
		if ( is_bool( $node ) || is_int( $node ) || is_float( $node ) || $node === null ) {
			return $node;
		}
		return '';
	};

	if ( is_array( $value ) ) {
		return $sanitize_recursive( $value );
	}
	if ( is_object( $value ) ) {
		return $sanitize_recursive( (array) $value );
	}
	return array();
}

/**
 * Keep class REST writes aligned with Styler SSOT.
 * Drop third-party/legacy meta keys that can cause rest_meta_database_error.
 */
function motto_styler_filter_css_class_rest_update_meta( $response, $handler, $request ) {
	if ( ! ( $request instanceof WP_REST_Request ) ) {
		return $response;
	}

	$route = (string) $request->get_route();
	if ( strpos( $route, '/wp/v2/motto_css_class/' ) !== 0 ) {
		return $response;
	}

	$method = strtoupper( (string) $request->get_method() );
	if ( $method !== 'PUT' && $method !== 'POST' && $method !== 'PATCH' ) {
		return $response;
	}

	$params = $request->get_json_params();
	if ( ! is_array( $params ) || ! isset( $params['meta'] ) || ! is_array( $params['meta'] ) ) {
		return $response;
	}

	$meta = $params['meta'];
	$filtered_meta = isset( $meta[ MOTTO_STYLER_CLASS_META_KEY ] )
		? array( MOTTO_STYLER_CLASS_META_KEY => $meta[ MOTTO_STYLER_CLASS_META_KEY ] )
		: array();

	// Apply filtered meta to both request layers used by WP_REST_Request.
	$request->set_param( 'meta', $filtered_meta );
	$request->set_body_params( array_merge( (array) $request->get_body_params(), array( 'meta' => $filtered_meta ) ) );

	return $response;
}
add_filter( 'rest_request_before_callbacks', 'motto_styler_filter_css_class_rest_update_meta', 9, 3 );

function motto_styler_update_css_class_conditionals( $post_id ) {
	if ( ! $post_id ) {
		return;
	}
	$post = get_post( $post_id );
	if ( ! $post || $post->post_type !== 'motto_css_class' ) {
		return;
	}

	$motto_styler = motto_styler_get_css_class_meta_value( $post_id );
	if ( empty( $motto_styler ) || ! is_array( $motto_styler ) ) {
		delete_post_meta( $post_id, MOTTO_STYLER_CLASS_CONDITIONAL_META_KEY );
		return;
	}

	if ( function_exists( 'motto_styler_collect_conditional_classes' ) ) {
		try {
			$classes = motto_styler_collect_conditional_classes( $motto_styler );
			if ( empty( $classes ) || ! is_array( $classes ) ) {
				delete_post_meta( $post_id, MOTTO_STYLER_CLASS_CONDITIONAL_META_KEY );
				return;
			}
			update_post_meta( $post_id, MOTTO_STYLER_CLASS_CONDITIONAL_META_KEY, $classes );
		} catch ( Throwable $e ) {
			if ( defined( 'WP_DEBUG' ) && WP_DEBUG ) {
				error_log(
					sprintf(
						'[motto-styler] Failed syncing conditional classes for post %d: %s',
						(int) $post_id,
						$e->getMessage()
					)
				);
			}
			delete_post_meta( $post_id, MOTTO_STYLER_CLASS_CONDITIONAL_META_KEY );
		}
	}
}

function motto_styler_sync_css_class_conditionals( $post_id, $post, $update ) {
	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}
	if ( wp_is_post_autosave( $post_id ) || wp_is_post_revision( $post_id ) ) {
		return;
	}
	if ( ! $post || $post->post_type !== 'motto_css_class' ) {
		return;
	}

	motto_styler_update_css_class_conditionals( $post_id );
}
add_action( 'save_post_motto_css_class', 'motto_styler_sync_css_class_conditionals', 10, 3 );

function motto_styler_on_css_class_meta_update( $meta_id, $post_id, $meta_key, $meta_value ) {
	if ( $meta_key !== MOTTO_STYLER_CLASS_META_KEY ) {
		return;
	}
	motto_styler_update_css_class_conditionals( $post_id );
}
add_action( 'updated_post_meta', 'motto_styler_on_css_class_meta_update', 10, 4 );
add_action( 'added_post_meta', 'motto_styler_on_css_class_meta_update', 10, 4 );

function motto_styler_build_css_class_rules( array $class_slugs ) {
	if ( empty( $class_slugs ) ) {
		return '';
	}

	$sanitized = array();
	foreach ( $class_slugs as $slug ) {
		$class = sanitize_html_class( (string) $slug );
		if ( $class !== '' ) {
			$sanitized[] = $class;
		}
	}

	$sanitized = array_values( array_unique( $sanitized ) );
	if ( empty( $sanitized ) ) {
		return '';
	}

	$posts = get_posts(
		array(
			'post_type' => 'motto_css_class',
			'post_status' => 'publish',
			'numberposts' => -1,
			'post_name__in' => $sanitized,
		)
	);

	if ( empty( $posts ) ) {
		return '';
	}

	$posts_by_slug = array();
	foreach ( $posts as $post ) {
		$slug = isset( $post->post_name ) ? sanitize_html_class( (string) $post->post_name ) : '';
		if ( $slug === '' ) {
			continue;
		}
		$posts_by_slug[ $slug ] = $post;
	}

	$css = '';
	foreach ( $sanitized as $slug ) {
		if ( ! isset( $posts_by_slug[ $slug ] ) ) {
			continue;
		}
		$post = $posts_by_slug[ $slug ];
		$motto_styler = motto_styler_get_css_class_meta_value( $post->ID );
		if ( empty( $motto_styler ) || ! is_array( $motto_styler ) ) {
			continue;
		}
		$selector = ':root .' . $slug;
		$css .= motto_styler_build_block_css( $selector, $motto_styler );
	}

	return $css;
}

function motto_styler_css_class_editor_canvas_styles( $settings, $context ) {
	if ( isset( $context->post->post_type ) && $context->post->post_type === 'motto_css_class' ) {
		$settings['styles'][] = array(
			'css' => '.is-root-container { margin-inline: 24px !important; } .is-root-container > .alignfull{margin-inline: 0 !important}',
		);
	}
	return $settings;
}
add_filter( 'block_editor_settings_all', 'motto_styler_css_class_editor_canvas_styles', 10, 2 );
