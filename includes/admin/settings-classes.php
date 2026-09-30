<?php

if (! defined('ABSPATH')) {
	exit;
}

/**
 * Normalize CSS classes library order key.
 *
 * @param mixed $raw_order Raw order key.
 * @return string
 */
function motto_styler_get_classes_library_order($raw_order = null) {
	$classes_order = is_scalar($raw_order) ? sanitize_key(wp_unslash((string) $raw_order)) : 'created';
	if (! in_array($classes_order, array('alpha', 'created'), true)) {
		return 'created';
	}

	return $classes_order;
}

/**
 * Fetch CSS class library posts for a given order.
 *
 * @param string $classes_order Order key.
 * @return array<int,WP_Post>
 */
function motto_styler_get_css_class_library_posts($classes_order = 'created') {
	$classes_order = motto_styler_get_classes_library_order($classes_order);
	$query_args    = array(
		'post_type'        => 'motto_css_class',
		'post_status'      => array('publish', 'draft', 'pending', 'private', 'future'),
		'numberposts'      => 100,
		'suppress_filters' => false,
	);

	if ('created' === $classes_order) {
		$query_args['orderby'] = 'date';
		$query_args['order']   = 'DESC';
	} else {
		$query_args['orderby'] = 'name';
		$query_args['order']   = 'ASC';
	}

	$posts = get_posts($query_args);
	return is_array($posts) ? $posts : array();
}

/**
 * Render CSS classes library inner content.
 *
 * @param string $classes_order Order key.
 * @return void
 */
function motto_styler_render_classes_library_inner($classes_order = 'created') {
	$classes_order           = motto_styler_get_classes_library_order($classes_order);
	$css_class_posts         = motto_styler_get_css_class_library_posts($classes_order);
	$new_class_url           = admin_url('post-new.php?post_type=motto_css_class');
	$delete_confirm_message  = __('Are you sure you want to move this class to Trash?', 'motto-blocks');
	$ajax_nonce              = wp_create_nonce('motto_styler_classes_library');
?>
	<div
		class="motto-styler-classes-library__body"
		data-ajax-url="<?php echo esc_url(admin_url('admin-ajax.php')); ?>"
		data-fetch-action="motto_styler_fetch_classes_library"
		data-delete-action="motto_styler_trash_css_class"
		data-ajax-nonce="<?php echo esc_attr($ajax_nonce); ?>"
		data-delete-confirm="<?php echo esc_attr($delete_confirm_message); ?>"
		data-delete-success-message="<?php echo esc_attr__('CSS class moved to Trash.', 'motto-blocks'); ?>"
		data-delete-error-message="<?php echo esc_attr__('Could not delete CSS class.', 'motto-blocks'); ?>"
		data-fetch-error-message="<?php echo esc_attr__('Could not update CSS classes order.', 'motto-blocks'); ?>">
		<div id="motto-styler-classes-notices" aria-live="polite"></div>
		<div class="motto-styler-tab-header">
			<div class="motto-styler-tab-header-actions">
				<a class="button button-primary" href="<?php echo esc_url($new_class_url); ?>">
					<?php echo esc_html__('Add New CSS Class', 'motto-blocks'); ?>
				</a>
			</div>
			<form method="get" class="motto-styler-classes-toolbar">
				<input type="hidden" name="page" value="motto-blocks-settings" />
				<input type="hidden" name="tab" value="styler" />
				<input type="hidden" name="styler_tab" value="classes" />
				<label for="motto-styler-classes-order">
					<?php echo esc_html__('Order by', 'motto-blocks'); ?>
				</label>
				<select id="motto-styler-classes-order" name="classes_order">
					<option value="alpha" <?php selected($classes_order, 'alpha'); ?>>
						<?php echo esc_html__('Alphabetical (slug)', 'motto-blocks'); ?>
					</option>
					<option value="created" <?php selected($classes_order, 'created'); ?>>
						<?php echo esc_html__('Creation date', 'motto-blocks'); ?>
					</option>
				</select>
				<button type="submit" class="button button-secondary">
					<?php echo esc_html__('Apply', 'motto-blocks'); ?>
				</button>
			</form>
		</div>

		<div class="motto-styler-classes-results">
			<?php if (empty($css_class_posts)) : ?>
				<p><?php echo esc_html__('No CSS classes found yet.', 'motto-blocks'); ?></p>
			<?php else : ?>
				<div class="motto-styler-classes-grid">
					<?php foreach ($css_class_posts as $post) : ?>
						<?php
						$post_id      = isset($post->ID) ? (int) $post->ID : 0;
						$post_slug    = isset($post->post_name) ? sanitize_html_class((string) $post->post_name) : '';
						$display_slug = $post_slug !== '' ? $post_slug : __('(no slug)', 'motto-blocks');
						$card_classes = array('motto-admin-card', 'motto-admin-card--class');
						if ($post_slug !== '') {
							$card_classes[] = $post_slug;
						}
						$edit_url = get_edit_post_link($post_id, '');
						?>
						<article class="<?php echo esc_attr(implode(' ', $card_classes)); ?>" data-post-id="<?php echo esc_attr((string) $post_id); ?>">
							<div class="motto-admin-card-content">
								<div class="motto-admin-card__body">
									<h3 class="motto-admin-card-slug">
										<?php echo esc_html('.' . $display_slug); ?>
									</h3>
								</div>
								<div class="motto-admin-card__actions" role="group" aria-label="<?php echo esc_attr__('Class actions', 'motto-blocks'); ?>">
									<?php if (is_string($edit_url) && $edit_url !== '') : ?>
										<a
											href="<?php echo esc_url($edit_url); ?>"
											class="motto-styler-icon-action"
											aria-label="<?php echo esc_attr__('Edit class', 'motto-blocks'); ?>"
											title="<?php echo esc_attr__('Edit class', 'motto-blocks'); ?>">
											<span class="dashicons dashicons-edit" aria-hidden="true"></span>
											<span class="screen-reader-text"><?php echo esc_html__('Edit class', 'motto-blocks'); ?></span>
										</a>
									<?php endif; ?>
									<button
										type="button"
										class="button-reset motto-styler-icon-action is-destructive motto-styler-delete-class-link"
										data-post-id="<?php echo esc_attr((string) $post_id); ?>"
										aria-label="<?php echo esc_attr__('Delete class', 'motto-blocks'); ?>"
										title="<?php echo esc_attr__('Delete class', 'motto-blocks'); ?>">
										<span class="dashicons dashicons-trash" aria-hidden="true"></span>
										<span class="screen-reader-text"><?php echo esc_html__('Delete class', 'motto-blocks'); ?></span>
									</button>
								</div>
							</div>
						</article>
					<?php endforeach; ?>
				</div>
			<?php endif; ?>
		</div>
	</div>
<?php
}

/**
 * AJAX: fetch classes library markup.
 *
 * @return void
 */
function motto_styler_handle_ajax_fetch_classes_library() {
	if (! current_user_can('manage_options')) {
		wp_send_json_error(
			array(
				'message' => __('You are not allowed to manage CSS classes.', 'motto-blocks'),
			),
			403
		);
	}

	check_ajax_referer('motto_styler_classes_library');
	$classes_order = motto_styler_get_classes_library_order(isset($_POST['classes_order']) ? $_POST['classes_order'] : 'created');

	ob_start();
	motto_styler_render_classes_library_inner($classes_order);
	$html = ob_get_clean();

	wp_send_json_success(
		array(
			'html'         => is_string($html) ? $html : '',
			'classesOrder' => $classes_order,
		)
	);
}
add_action('wp_ajax_motto_styler_fetch_classes_library', 'motto_styler_handle_ajax_fetch_classes_library');

/**
 * AJAX: trash a CSS class and return refreshed library markup.
 *
 * @return void
 */
function motto_styler_handle_ajax_trash_css_class() {
	if (! current_user_can('manage_options')) {
		wp_send_json_error(
			array(
				'message' => __('You are not allowed to delete CSS classes.', 'motto-blocks'),
			),
			403
		);
	}

	check_ajax_referer('motto_styler_classes_library');
	$post_id       = isset($_POST['post_id']) ? (int) wp_unslash($_POST['post_id']) : 0;
	$classes_order = motto_styler_get_classes_library_order(isset($_POST['classes_order']) ? $_POST['classes_order'] : 'created');
	$post          = $post_id > 0 ? get_post($post_id) : null;

	if (! ($post instanceof WP_Post) || 'motto_css_class' !== $post->post_type) {
		wp_send_json_error(
			array(
				'message' => __('CSS class not found.', 'motto-blocks'),
			),
			404
		);
	}

	if (! current_user_can('delete_post', $post_id)) {
		wp_send_json_error(
			array(
				'message' => __('You are not allowed to delete this CSS class.', 'motto-blocks'),
			),
			403
		);
	}

	$trashed = wp_trash_post($post_id);
	if (! $trashed) {
		wp_send_json_error(
			array(
				'message' => __('Could not move CSS class to Trash.', 'motto-blocks'),
			),
			500
		);
	}

	ob_start();
	motto_styler_render_classes_library_inner($classes_order);
	$html = ob_get_clean();

	wp_send_json_success(
		array(
			'html'         => is_string($html) ? $html : '',
			'message'      => __('CSS class moved to Trash.', 'motto-blocks'),
			'classesOrder' => $classes_order,
		)
	);
}
add_action('wp_ajax_motto_styler_trash_css_class', 'motto_styler_handle_ajax_trash_css_class');
