<?php

if (! defined('ABSPATH')) {
	exit;
}

/**
 * Render the General tab.
 *
 * @return void
 */
function motto_styler_render_general_tab() {
?>
	<div class="motto-styler-overview-card">

		<div class="postbox-header">
			<?php motto_styler_render_admin_logo(); ?>
			<h2 class="hndle"><?php echo esc_html__('Motto Blocks Control center', 'motto-blocks'); ?></h2>
		</div>
		<div class="inside lead">

			<p><?php echo esc_html__('Configure core behavior for Motto Blocks from one place, including global classes, CSS variables, block targeting, and external API connections.', 'motto-blocks'); ?></p>
		</div>
	</div>
<?php
}

/**
 * Render the Classes tab.
 *
 * @return void
 */
function motto_styler_render_classes_tab() {
	$classes_order = motto_styler_get_classes_library_order(isset($_GET['classes_order']) ? $_GET['classes_order'] : 'created');
?>
	<p><?php echo esc_html__('Manage reusable CSS classes used by Motto Styler.', 'motto-blocks'); ?></p>

	<div class="postbox motto-styler-classes-library">
		<div class="postbox-header">
			<h3 class="hndle"><?php echo esc_html__('CSS Class Library', 'motto-blocks'); ?></h3>
		</div>
		<div class="inside">
			<?php motto_styler_render_classes_library_inner($classes_order); ?>
		</div>
	</div>
<?php
}

/**
 * Render the CSS Variables tab.
 *
 * @return void
 */
function motto_styler_render_css_variables_tab() {
	$variable_posts = get_posts(
		array(
			'post_type'        => 'motto_css_variable',
			'post_status'      => array('publish', 'draft', 'pending', 'private', 'future'),
			'numberposts'      => 200,
			'orderby'          => 'menu_order title',
			'order'            => 'ASC',
			'suppress_filters' => false,
		)
	);
	$delete_confirm_message = __('Are you sure you want to move this variable to Trash?', 'motto-blocks');

	$variable_rows = array();
	if (is_array($variable_posts)) {
		foreach ($variable_posts as $post) {
			$post_id = isset($post->ID) ? (int) $post->ID : 0;
			if ($post_id <= 0) {
				continue;
			}

			$payload = motto_styler_get_css_variable_row_payload($post_id);
			if (! is_array($payload)) {
				continue;
			}

			$variable_rows[$post_id] = $payload;
		}
	}
?>
	<p><?php echo esc_html__('Manage reusable CSS variables used by Motto Styler.', 'motto-blocks'); ?></p>

	<div class="postbox motto-styler-classes-library">
		<div class="postbox-header">
			<h3 class="hndle"><?php echo esc_html__('CSS Variables Library', 'motto-blocks'); ?></h3>
		</div>
		<div class="inside">
			<div class="motto-styler-tab-header">
				<div class="motto-styler-tab-header-actions">
					<button type="button" class="button button-primary" id="motto-styler-add-variable-row">
						<?php echo esc_html__('Add New CSS Variable', 'motto-blocks'); ?>
					</button>
				</div>
			</div>
			<div id="motto-styler-variable-notices" aria-live="polite"></div>
			<form
				method="post"
				action="<?php echo esc_url(admin_url('admin-post.php')); ?>"
				id="motto-styler-variables-form"
				data-ajax-url="<?php echo esc_url(admin_url('admin-ajax.php')); ?>"
				data-row-save-action="motto_styler_save_css_variable_row"
				data-delete-confirm="<?php echo esc_attr($delete_confirm_message); ?>"
				data-delete-label="<?php echo esc_attr__('Delete variable', 'motto-blocks'); ?>"
				data-save-success-message="<?php echo esc_attr__('CSS variable saved.', 'motto-blocks'); ?>"
				data-save-error-message="<?php echo esc_attr__('Could not save CSS variable.', 'motto-blocks'); ?>">
				<?php wp_nonce_field('motto_styler_save_css_variables'); ?>
				<input type="hidden" name="action" value="motto_styler_save_css_variables" />
				<input type="hidden" name="motto_variable_row_target" id="motto-variable-row-target" value="" />

				<table class="widefat striped motto-styler-variables-table">
					<tbody>
						<?php foreach ($variable_rows as $variable_post_id => $entry) : ?>
							<tr class="motto-styler-variable-row" data-post-id="<?php echo esc_attr((string) $variable_post_id); ?>" draggable="true">
								<td class="motto-styler-variable-drag-cell">
									<button
										type="button"
										class="button motto-styler-icon-action motto-styler-variable-drag-handle"
										aria-label="<?php echo esc_attr__('Reorder variable', 'motto-blocks'); ?>"
										title="<?php echo esc_attr__('Reorder variable', 'motto-blocks'); ?>">
										<span class="dashicons dashicons-move" aria-hidden="true"></span>
										<span class="screen-reader-text"><?php echo esc_html__('Reorder variable', 'motto-blocks'); ?></span>
									</button>
									<input
										type="hidden"
										class="motto-styler-variable-order-input"
										name="<?php echo esc_attr("motto_variable_order[$variable_post_id]"); ?>"
										value="<?php echo esc_attr((string) $variable_post_id); ?>" />
								</td>
								<td>
									<input
										type="text"
										name="<?php echo esc_attr("motto_variable_rows[$variable_post_id][label]"); ?>"
										value="<?php echo esc_attr((string) $entry['label']); ?>"
										class="widefat motto-styler-variable-input"
										disabled />
								</td>
								<td>
									<input
										type="text"
										name="<?php echo esc_attr("motto_variable_rows[$variable_post_id][slug]"); ?>"
										value="<?php echo esc_attr((string) $entry['slug']); ?>"
										class="widefat motto-styler-variable-input"
										placeholder="--<?php echo esc_attr($variable_post_id); ?>"
										disabled />
								</td>
								<td>
									<input
										type="text"
										name="<?php echo esc_attr("motto_variable_rows[$variable_post_id][value]"); ?>"
										value="<?php echo esc_attr((string) $entry['value']); ?>"
										class="widefat motto-styler-variable-input"
										disabled />
								</td>
								<td>
									<div class="motto-styler-variable-actions" role="group" aria-label="<?php echo esc_attr__('Variable actions', 'motto-blocks'); ?>">
										<button
											type="button"
											class="button motto-styler-icon-action motto-styler-variable-edit-toggle"
											data-post-id="<?php echo esc_attr((string) $variable_post_id); ?>"
											aria-label="<?php echo esc_attr__('Edit variable', 'motto-blocks'); ?>"
											title="<?php echo esc_attr__('Edit variable', 'motto-blocks'); ?>">
											<span class="dashicons dashicons-edit" aria-hidden="true"></span>
											<span class="screen-reader-text"><?php echo esc_html__('Edit variable', 'motto-blocks'); ?></span>
										</button>
										<div class="motto-styler-variable-edit-actions" hidden>
											<button
												type="button"
												class="button motto-styler-icon-action motto-styler-variable-save-toggle"
												data-post-id="<?php echo esc_attr((string) $variable_post_id); ?>"
												aria-label="<?php echo esc_attr__('Save variable', 'motto-blocks'); ?>"
												title="<?php echo esc_attr__('Save variable', 'motto-blocks'); ?>">
												<span class="dashicons dashicons-yes" aria-hidden="true"></span>
												<span class="screen-reader-text"><?php echo esc_html__('Save variable', 'motto-blocks'); ?></span>
											</button>
											<button
												type="button"
												class="button motto-styler-icon-action motto-styler-variable-cancel-toggle"
												data-post-id="<?php echo esc_attr((string) $variable_post_id); ?>"
												aria-label="<?php echo esc_attr__('Cancel edit', 'motto-blocks'); ?>"
												title="<?php echo esc_attr__('Cancel edit', 'motto-blocks'); ?>">
												<span class="dashicons dashicons-no-alt" aria-hidden="true"></span>
												<span class="screen-reader-text"><?php echo esc_html__('Cancel edit', 'motto-blocks'); ?></span>
											</button>
										</div>
										<?php if (! empty($entry['deleteUrl']) && is_string($entry['deleteUrl'])) : ?>
											<a
												href="<?php echo esc_url($entry['deleteUrl']); ?>"
												class="button motto-styler-icon-action is-destructive motto-styler-delete-variable-link"
												data-confirm="<?php echo esc_attr($delete_confirm_message); ?>"
												aria-label="<?php echo esc_attr__('Delete variable', 'motto-blocks'); ?>"
												title="<?php echo esc_attr__('Delete variable', 'motto-blocks'); ?>">
												<span class="dashicons dashicons-trash" aria-hidden="true"></span>
												<span class="screen-reader-text"><?php echo esc_html__('Delete variable', 'motto-blocks'); ?></span>
											</a>
										<?php endif; ?>
									</div>
								</td>
							</tr>
						<?php endforeach; ?>
						<?php if (empty($variable_rows)) : ?>
							<tr class="motto-styler-variable-empty-row">
								<td colspan="5"><?php echo esc_html__('No CSS variables found yet. Use Add New Variable to create one.', 'motto-blocks'); ?></td>
							</tr>
						<?php endif; ?>
					</tbody>
				</table>

				<?php submit_button(__('Save Changes', 'motto-blocks')); ?>
			</form>
		</div>
	</div>
<?php
}

/**
 * Render the Breakpoints tab.
 *
 * @return void
 */
function motto_styler_render_breakpoints_tab() {
	$breakpoints = function_exists('motto_styler_get_breakpoint_config')
		? motto_styler_get_breakpoint_config()
		: array();
	$rows = array(
		'desktop' => array(
			'label'       => __('Desktop', 'motto-blocks'),
			'editable'    => false,
		),
		'tablet' => array(
			'label'       => __('Tablet', 'motto-blocks'),
			'description' => __('Applies at the tablet breakpoint and below.', 'motto-blocks'),
			'editable'    => true,
		),
		'landscapePhone' => array(
			'label'       => __('Landscape Phone', 'motto-blocks'),
			'description' => __('Applies below tablet and above the phone breakpoint.', 'motto-blocks'),
			'editable'    => true,
		),
		'phone' => array(
			'label'       => __('Phone', 'motto-blocks'),
			'description' => __('Applies at the smallest viewport breakpoint.', 'motto-blocks'),
			'editable'    => true,
		),
	);
?>
	<p><?php echo esc_html__('Update the max-width values used by Motto Styler responsive CSS. Desktop remains the base breakpoint.', 'motto-blocks'); ?></p>
	<div class="postbox">
		<div class="postbox-header">
			<h3 class="hndle"><?php echo esc_html__('Responsive Breakpoints', 'motto-blocks'); ?></h3>
		</div>

		<div class="inside">

			<form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
				<?php wp_nonce_field('motto_styler_save_breakpoints'); ?>
				<input type="hidden" name="action" value="motto_styler_save_breakpoints" />

				<table class="form-table" role="presentation">
					<tbody>
						<?php foreach ($rows as $key => $meta) : ?>
							<?php
							$entry = isset($breakpoints[$key]) && is_array($breakpoints[$key]) ? $breakpoints[$key] : array();
							$max_width = isset($entry['maxWidth']) ? (int) $entry['maxWidth'] : 0;
							$media = isset($entry['media']) && is_string($entry['media']) ? trim($entry['media']) : '';
							$is_editable = ! empty($meta['editable']);
							?>
							<tr>
								<th scope="row">
									<label for="<?php echo esc_attr('motto-breakpoint-' . $key); ?>">
										<?php echo esc_html($meta['label']); ?>
									</label>
								</th>
								<td>
									<?php if ($is_editable) : ?>
										<input
											name="<?php echo esc_attr("motto_breakpoint_rows[$key][maxWidth]"); ?>"
											type="number"
											min="1"
											step="1"
											id="<?php echo esc_attr('motto-breakpoint-' . $key); ?>"
											value="<?php echo esc_attr((string) $max_width); ?>"
											class="small-text" />
										<span><?php echo esc_html__('px', 'motto-blocks'); ?></span>
										<p class="description"><?php echo esc_html($meta['description']); ?></p>
										<p class="description">
											<?php
											printf(
												/* translators: %s: media query string */
												esc_html__('Resolved media query: %s', 'motto-blocks'),
												esc_html($media !== '' ? $media : __('None (base styles)', 'motto-blocks'))
											);
											?>
										</p>
									<?php else : ?>
										<p><?php echo esc_html__('Base breakpoint', 'motto-blocks'); ?></p>
									<?php endif; ?>
								</td>
							</tr>
						<?php endforeach; ?>
					</tbody>
				</table>

				<?php submit_button(__('Save Breakpoints', 'motto-blocks')); ?>
			</form>
		</div>
	</div>
<?php
}

/**
 * Render the Cache tab.
 *
 * @return void
 */
function motto_styler_render_cache_tab() {
	$cached_post_ids = function_exists('motto_styler_get_frontend_cache_candidate_post_ids')
		? motto_styler_get_frontend_cache_candidate_post_ids()
		: array();
	$cached_post_count = is_array($cached_post_ids) ? count($cached_post_ids) : 0;
?>
	<div class="postbox">
		<div class="postbox-header">
			<h3 class="hndle"><?php echo esc_html__('Styler Cache', 'motto-blocks'); ?></h3>
		</div>

		<div class="inside">
			<p>
				<?php
				printf(
					/* translators: %d: cached post count */
					esc_html__('Motto currently has %d cached style entries eligible for rebuild. Use this action if something looks wrong on the frontend: it clears the stored CSS and regenerates it immediately.', 'motto-blocks'),
					(int) $cached_post_count
				);
				?>
			</p>
			<p><?php echo esc_html__('This action rebuilds only cache entries that can be resolved from the current admin request. Entries that require real singular-template context stay invalidated and rebuild lazily on the next valid frontend visit.', 'motto-blocks'); ?></p>

			<form id="motto-styler-cache-rebuild-form" method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
				<?php wp_nonce_field('motto_styler_rebuild_frontend_caches'); ?>
				<input type="hidden" name="action" value="motto_styler_rebuild_frontend_caches" />
				<?php submit_button(__('Rebuild Styler Cache', 'motto-blocks'), 'secondary', 'submit', false, $cached_post_count > 0 ? array('id' => 'motto-styler-cache-rebuild-submit') : array('id' => 'motto-styler-cache-rebuild-submit', 'disabled' => 'disabled')); ?>
			</form>
			<div
				id="motto-styler-cache-rebuild-status"
				data-ajax-url="<?php echo esc_url(admin_url('admin-ajax.php')); ?>"
				data-ajax-nonce="<?php echo esc_attr(wp_create_nonce('motto_styler_frontend_cache_rebuild')); ?>"
				data-start-action="motto_styler_start_frontend_cache_rebuild"
				data-process-action="motto_styler_process_frontend_cache_rebuild"
				data-running-label="<?php echo esc_attr__('Rebuilding styler cache...', 'motto-blocks'); ?>"
				data-progress-template="<?php /* translators: 1: number of cache entries processed so far, 2: total number of cache entries */ echo esc_attr__('Processed %1$d of %2$d cached entries.', 'motto-blocks'); ?>"
				data-empty-message="<?php echo esc_attr__('There are no cached style entries to rebuild right now.', 'motto-blocks'); ?>"
				data-error-message="<?php echo esc_attr__('The styler cache rebuild could not be completed.', 'motto-blocks'); ?>"
				data-has-cached-posts="<?php echo $cached_post_count > 0 ? '1' : '0'; ?>"
				aria-live="polite">
				<progress class="progress-bar" id="motto-styler-cache-rebuild-progress" max="<?php echo esc_attr((string) max(1, $cached_post_count)); ?>" value="0" hidden></progress>
				<p id="motto-styler-cache-rebuild-text"></p>
				<div id="motto-styler-cache-rebuild-notices"></div>
			</div>
		</div>
	</div>
<?php
}

/**
 * Render the Block Targeting tab.
 *
 * @return void
 */
function motto_styler_render_targeting_tab() {
	$groups  = motto_styler_get_registered_blocks_by_namespace();
	$targets = function_exists('motto_styler_get_target_blocks')
		? motto_styler_get_target_blocks()
		: array('all');
	$required_namespaces = motto_styler_get_required_target_namespaces();

	$has_all   = in_array('all', $targets, true);
	$selections = motto_styler_parse_target_selections($targets);
	$selected_namespaces = $selections['namespaces'];
	$selected_blocks     = $selections['blocks'];
?>

	<h3 class="hndle"><?php echo esc_html__('Block Targeting', 'motto-blocks'); ?></h3>
	<p><?php echo esc_html__('Select which blocks can use Motto Styler. Changes apply immediately without rebuilding assets.', 'motto-blocks'); ?></p>

	<form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
		<?php wp_nonce_field('motto_styler_save_target_blocks'); ?>
		<input type="hidden" name="action" value="motto_styler_save_target_blocks" />

		<p>
			<label class="motto-toggle">
				<input type="checkbox" class="motto-toggle__input" id="motto-styler-apply-all" name="apply_all_blocks" value="1" <?php checked($has_all); ?> />
				<span class="motto-toggle__track"></span>
				<strong><?php echo esc_html__('Apply to all blocks', 'motto-blocks'); ?></strong>
			</label>
		</p>

		<div
			id="motto-styler-target-groups"
			class="motto-styler-target-groups<?php echo $has_all ? ' is-disabled' : ''; ?>">
			<div class="postbox motto-styler-target-group">
				<div class="inside">
					<?php foreach ($groups as $namespace => $blocks) :
						$namespace_locked  = in_array($namespace, $required_namespaces, true);
						$namespace_checked = $has_all || in_array($namespace, $selected_namespaces, true);
						if ($namespace_locked) {
							$namespace_checked = true;
						}
					?>
						<label class="motto-target-group-title motto-toggle">
							<input
								type="checkbox"
								class="motto-toggle__input motto-styler-namespace-toggle"
								<?php echo $namespace_locked ? 'data-locked="1"' : ''; ?>
								data-namespace="<?php echo esc_attr($namespace); ?>"
								name="target_namespaces[]"
								value="<?php echo esc_attr($namespace); ?>"
								<?php checked($namespace_checked); ?>
								<?php disabled($namespace_locked); ?> />
							<span class="motto-toggle__track"></span>
							<strong><?php echo esc_html($namespace); ?></strong>
						</label>
						<div class="motto-blocks-grid">
							<?php foreach ($blocks as $block) :
								$block_name    = $block['name'];
								$block_title   = $block['title'];
								$block_locked  = $namespace_locked;
								$block_checked = $namespace_checked || in_array($block_name, $selected_blocks, true);
								if ($block_locked) {
									$block_checked = true;
								}
							?>
								<label class="motto-admin-card motto-admin-card--block motto-admin-card--block-target">
									<input
										type="checkbox"
										class="motto-toggle__input motto-styler-block-toggle"
										<?php echo $block_locked ? 'data-locked="1"' : ''; ?>
										data-namespace="<?php echo esc_attr($namespace); ?>"
										name="target_blocks[]"
										value="<?php echo esc_attr($block_name); ?>"
										<?php checked($block_checked); ?>
										<?php disabled($block_locked); ?> />
									<span class="motto-toggle__track"></span>
									<h3 class="motto-admin-card-title"><?php echo esc_html($block_title); ?></h3>
								</label>
							<?php endforeach; ?>
						</div>
					<?php endforeach; ?>
				</div>
			</div>
		</div>

		<?php submit_button(__('Save Changes', 'motto-blocks')); ?>
	</form>

<?php
}

/**
 * Render the Blocks tab.
 *
 * @return void
 */
function motto_blocks_render_blocks_tab() {
	$groups = function_exists('motto_blocks_get_available_block_definitions_by_namespace')
		? motto_blocks_get_available_block_definitions_by_namespace()
		: array();
	$enabled_blocks = function_exists('motto_blocks_get_enabled_blocks')
		? motto_blocks_get_enabled_blocks()
		: array();
	$feature_manifest = function_exists( 'motto_styler_read_config_json' )
		? motto_styler_read_config_json( 'features.json' )
		: array();
	$pro_blocks = array();

	if ( is_array( $feature_manifest ) && ! empty( $feature_manifest['features'] ) && is_array( $feature_manifest['features'] ) ) {
		foreach ( $feature_manifest['features'] as $feature ) {
			if ( ! is_array( $feature ) ) {
				continue;
			}
			$category = isset( $feature['category'] ) ? (string) $feature['category'] : '';
			$tier     = isset( $feature['tier'] ) ? (string) $feature['tier'] : '';
			$parent = isset( $feature['parent'] ) ? (string) $feature['parent'] : '';
			$gate   = isset( $feature['gate'] ) ? (string) $feature['gate'] : '';

			// Pro blocks list is informational: only list blocks that are Pro-only.
			// Pro sub-features (e.g. parented upgrades on free blocks) should not appear here.
			if ( $category !== 'block' || $tier !== 'pro' || $parent !== '' || $gate !== 'hard' ) {
				continue;
			}
			$slug = isset( $feature['slug'] ) ? sanitize_key( (string) $feature['slug'] ) : '';
			if ( $slug === '' ) {
				continue;
			}
			$pro_blocks[] = array(
				'slug'        => $slug,
				'name'        => isset( $feature['name'] ) ? (string) $feature['name'] : $slug,
				'description' => isset( $feature['description'] ) ? (string) $feature['description'] : '',
				// "shipped" = exists in the Pro addon, just not installed/active here (show
				// "Get Pro"). Anything else ("planned"/"proposed") doesn't exist yet in any
				// Pro package — show "Coming soon" instead, since there's nothing to buy yet.
				'is_shipped'  => isset( $feature['status'] ) && 'shipped' === $feature['status'],
			);
		}
	}

	$all_block_names = array();
	$all_definitions = array();

	foreach ($groups as $namespace => $definitions) {
		foreach ($definitions as $definition) {
			// Skip child blocks — they are auto-managed by their parent.
			if (! empty($definition['parents'])) {
				continue;
			}
			if (! empty($definition['name'])) {
				$all_block_names[] = strtolower(trim((string) $definition['name']));
				$definition['namespace'] = $namespace;
				$all_definitions[] = $definition;
			}
		}
	}

	// Sort so free-tier blocks render before pro-tier blocks, stable within each tier
	// (PHP 7.4 usort() isn't guaranteed stable, so sort order is decorated in manually).
	$decorated_definitions = array();
	foreach ( $all_definitions as $index => $definition ) {
		$decorated_definitions[] = array(
			'is_pro'     => isset( $definition['tier'] ) && 'pro' === $definition['tier'],
			'index'      => $index,
			'definition' => $definition,
		);
	}
	usort(
		$decorated_definitions,
		static function ( $a, $b ) {
			if ( $a['is_pro'] === $b['is_pro'] ) {
				return $a['index'] <=> $b['index'];
			}
			return $a['is_pro'] ? 1 : -1;
		}
	);
	$all_definitions = array_column( $decorated_definitions, 'definition' );

	$all_block_names = array_values(array_unique(array_filter($all_block_names)));
	$has_all = ! empty($all_block_names) && empty(array_diff($all_block_names, $enabled_blocks));

	// A pro-tier catalog entry that's actually registered (Pro active) already
	// appears above via $all_definitions with a real toggle — don't also show
	// its informational "Get Pro" card.
	$pro_blocks = array_values(
		array_filter(
			$pro_blocks,
			static function ( $pro_block ) use ( $all_block_names ) {
				$pro_domain = ! empty( $pro_block['slug'] ) ? 'motto/' . sanitize_key( (string) $pro_block['slug'] ) : '';
				return $pro_domain === '' || ! in_array( $pro_domain, $all_block_names, true );
			}
		)
	);
?>
	<div class="postbox-header">
		<h3 class="hndle"><?php echo esc_html__('Block Availability', 'motto-blocks'); ?></h3>
	</div>
	<p><?php echo esc_html__('Enable or disable blocks. Child blocks activate automatically with their parent.', 'motto-blocks'); ?></p>
	<?php if ( ! empty( $pro_blocks ) ) : ?>
		<p class="description"><?php echo esc_html__( 'Blocks marked as Pro are available with the Motto Blocks Pro addon.', 'motto-blocks' ); ?></p>
	<?php endif; ?>

	<form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
		<?php wp_nonce_field('motto_blocks_save_enabled_blocks'); ?>
		<input type="hidden" name="action" value="motto_blocks_save_enabled_blocks" />

		<p>
			<label class="motto-toggle">
				<input type="checkbox" class="motto-toggle__input" id="motto-blocks-enable-all" name="enable_all_blocks" value="1" <?php checked($has_all); ?> />
				<span class="motto-toggle__track"></span>
				<strong><?php echo esc_html__('Enable all blocks', 'motto-blocks'); ?></strong>
			</label>
		</p>

		<div
			id="motto-blocks-groups"
			class="motto-styler-target-groups">
			<div class="postbox motto-styler-target-group">
				<div class="inside motto-blocks-grid">
					<?php foreach ($all_definitions as $definition) :
						$block_name = isset($definition['name']) ? strtolower(trim((string) $definition['name'])) : '';
						$is_checked = $has_all || in_array($block_name, $enabled_blocks, true);
						$icon       = ! empty( $definition['slug'] ) ? motto_blocks_render_block_icon( $definition['slug'], array( 'class' => 'motto-admin-card-icon' ) ) : '';
						$description = ! empty( $definition['description'] ) ? (string) $definition['description'] : '';
						$is_pro     = isset( $definition['tier'] ) && 'pro' === $definition['tier'];
					?>
						<label class="motto-admin-card motto-admin-card--block">
							<input
								type="checkbox"
								class="motto-toggle__input motto-blocks-toggle"
								data-block-name="<?php echo esc_attr($block_name); ?>"
								name="motto_blocks[]"
								value="<?php echo esc_attr($block_name); ?>"
								<?php checked($is_checked); ?> />
							<span class="motto-toggle__track"></span>
							<h3 class="motto-admin-card-title">
								<?php echo $icon; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sanitized by motto_blocks_sanitize_svg(). ?>
								<?php echo esc_html(! empty($definition['title']) ? $definition['title'] : $block_name); ?>
							</h3>
							<?php if ( $is_pro ) : ?>
								<div class="motto-admin-card-badges">
									<span class="motto-badge motto-badge--pro"><?php echo esc_html__( 'Pro', 'motto-blocks' ); ?></span>
								</div>
							<?php endif; ?>
							<?php if ( $description !== '' ) : ?>
								<p class="description motto-admin-card-description"><?php echo esc_html( $description ); ?></p>
							<?php endif; ?>
						</label>
					<?php endforeach; ?>

					<?php if ( ! empty( $pro_blocks ) ) : ?>
						<?php
						$pro_url = apply_filters( 'motto_blocks_pro_url', 'https://mottoblocks.com/' );
						?>
						<?php foreach ( $pro_blocks as $pro_block ) : ?>
							<?php
							$pro_icon = motto_blocks_render_block_icon( $pro_block['slug'], array( 'class' => 'motto-admin-card-icon' ) );
							?>
							<div class="motto-admin-card motto-admin-card--block is-disabled">
								<span class="motto-toggle__track" aria-hidden="true"></span>
								<h3 class="motto-admin-card-title">
									<?php echo $pro_icon; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- sanitized by motto_blocks_sanitize_svg(). ?>
									<?php echo esc_html( $pro_block['name'] ); ?>
								</h3>
								<div class="motto-admin-card-badges">
									<span class="motto-badge motto-badge--pro"><?php echo esc_html__( 'Pro', 'motto-blocks' ); ?></span>
									<?php if ( empty( $pro_block['is_shipped'] ) ) : ?>
										<span class="motto-badge motto-badge--soon"><?php echo esc_html__( 'Coming soon', 'motto-blocks' ); ?></span>
									<?php endif; ?>
								</div>
								<?php if ( ! empty( $pro_block['is_shipped'] ) && $pro_url ) : ?>
									<a class="button button-secondary" href="<?php echo esc_url( $pro_url ); ?>" target="_blank" rel="noreferrer noopener">
										<?php echo esc_html__( 'Get Pro', 'motto-blocks' ); ?>
									</a>
								<?php endif; ?>
								<?php if ( $pro_block['description'] !== '' ) : ?>
									<p class="description motto-admin-card-description"><?php echo esc_html( $pro_block['description'] ); ?></p>
								<?php endif; ?>
							</div>
						<?php endforeach; ?>
					<?php endif; ?>
				</div>
			</div>
		</div>

		<?php submit_button(__('Save Block Settings', 'motto-blocks')); ?>
	</form>

<?php
}

/**
 * Render API settings tab.
 *
 * @return void
 */
function motto_styler_render_api_tab() {
	$google_maps_api_key = get_option('motto_blocks_google_maps_api_key', '');
	$google_maps_placeholder = motto_styler_get_masked_secret_placeholder(
		$google_maps_api_key,
		__('Enter API key here', 'motto-blocks')
	);
?>
	<div class="postbox-header">
		<h3 class="hndle"><?php echo esc_html__('API Connections', 'motto-blocks'); ?></h3>
	</div>
	<p><?php echo esc_html__('Configure external service keys used by Motto Blocks features.', 'motto-blocks'); ?></p>

	<form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
		<?php wp_nonce_field('motto_styler_save_api_settings'); ?>
		<input type="hidden" name="action" value="motto_styler_save_api_settings" />

		<table class="form-table" role="presentation">
			<tr>
				<th scope="row">
					<label for="motto_blocks_google_maps_api_key"><?php echo esc_html__('Google Maps API Key', 'motto-blocks'); ?></label>
				</th>
				<td>
					<input
						name="motto_blocks_google_maps_api_key"
						type="text"
						id="motto_blocks_google_maps_api_key"
						value=""
						class="regular-text"
						autocomplete="off"
						placeholder="<?php echo esc_attr($google_maps_placeholder); ?>" />
					<p class="description">
						<?php echo esc_html__('Used by map-based blocks and integrations. Enter a new key to replace the saved one.', 'motto-blocks'); ?>
					</p>
					<p class="description">
						<?php echo esc_html__('Tip: Google Maps keys used in the browser are public by design. Restrict this key in Google Cloud Console to your site\'s HTTP referrers and only enable the specific Maps APIs you need.', 'motto-blocks'); ?>
					</p>
				</td>
			</tr>
		</table>

		<?php submit_button(__('Save API Settings', 'motto-blocks')); ?>
	</form>
<?php
}

/**
 * Render MottoStyler top-level tab with nested sub-tabs.
 *
 * @return void
 */
function motto_styler_render_styler_tab() {
	$active_style_tab = motto_styler_get_admin_active_styler_tab();
	$sub_tabs         = array(
		'classes'     => __('Classes', 'motto-blocks'),
		'variables'   => __('Vars', 'motto-blocks'),
		'breakpoints' => __('Breakpoints', 'motto-blocks'),
		'target'      => __('Target', 'motto-blocks'),
		'cache'       => __('Cache', 'motto-blocks'),
	);
?>
	<!-- <div class="postbox-header">
		<h3 class="hndle"><?php echo esc_html__('Meet the block Styler!', 'motto-blocks'); ?></h3>
	</div> -->
	<p class="lead"><?php echo esc_html__('Motto Styler is the styling engine for Motto Blocks. Use it to create reusable classes, manage design tokens with CSS variables, and control where styling features are available across your blocks.', 'motto-blocks'); ?></p>
	<?php motto_styler_render_legacy_assistant_card(); ?>
	<nav class="nav-tab-wrapper motto-blocks-settings-subtabs" aria-label="<?php echo esc_attr__('Motto Styler sections', 'motto-blocks'); ?>">
		<?php foreach ($sub_tabs as $sub_tab_slug => $sub_tab_label) : ?>
			<a
				href="<?php echo esc_url(motto_styler_get_settings_page_url('styler', array('styler_tab' => $sub_tab_slug))); ?>"
				class="nav-tab<?php echo $active_style_tab === $sub_tab_slug ? ' nav-tab-active' : ''; ?>">
				<?php echo esc_html($sub_tab_label); ?>
			</a>
		<?php endforeach; ?>
	</nav>
	<div class="motto-blocks-settings-subtab-content">
		<?php if ('variables' === $active_style_tab) : ?>
			<?php motto_styler_render_css_variables_tab(); ?>
		<?php elseif ('breakpoints' === $active_style_tab) : ?>
			<?php motto_styler_render_breakpoints_tab(); ?>
		<?php elseif ('target' === $active_style_tab) : ?>
			<?php motto_styler_render_targeting_tab(); ?>
		<?php elseif ('cache' === $active_style_tab) : ?>
			<?php motto_styler_render_cache_tab(); ?>
		<?php else : ?>
			<?php motto_styler_render_classes_tab(); ?>
		<?php endif; ?>
	</div>
<?php
}

/**
 * Render MottoBlocks settings page.
 *
 * @return void
 */
function motto_styler_render_settings_page() {
	if (! current_user_can('manage_options')) {
		return;
	}

	$tabs       = motto_styler_get_admin_tabs();
	$active_tab = motto_styler_get_admin_active_tab();
?>
	<div class="wrap motto-blocks-settings-page">
		<h1 class="motto-flex align-center gap-md"><?php motto_styler_render_admin_logo('inline', 'mottoblocks-admin-header'); ?><?php echo esc_html__('Motto Blocks', 'motto-blocks'); ?></h1>

		<nav class="nav-tab-wrapper motto-blocks-settings-tabs" aria-label="<?php echo esc_attr__('Motto Blocks sections', 'motto-blocks'); ?>">
			<?php foreach ($tabs as $tab_slug => $tab_label) : ?>
				<a
					href="<?php echo esc_url(motto_styler_get_settings_page_url($tab_slug)); ?>"
					class="nav-tab<?php echo $active_tab === $tab_slug ? ' nav-tab-active' : ''; ?>">
					<?php echo esc_html($tab_label); ?>
				</a>
			<?php endforeach; ?>
		</nav>

		<?php motto_styler_render_admin_notice(); ?>

		<div class="motto-blocks-settings-tab-content">
			<?php if ($active_tab === 'api') : ?>
				<?php motto_styler_render_api_tab(); ?>
			<?php elseif ($active_tab === 'blocks') : ?>
				<?php motto_blocks_render_blocks_tab(); ?>
			<?php elseif ($active_tab === 'styler') : ?>
				<?php motto_styler_render_styler_tab(); ?>
			<?php elseif ( has_action( 'motto_blocks_render_admin_tab_' . $active_tab ) ) : ?>
				<?php do_action( 'motto_blocks_render_admin_tab_' . $active_tab ); ?>
			<?php else : ?>
				<?php motto_styler_render_general_tab(); ?>
			<?php endif; ?>
		</div>
	</div>
<?php
}
