<?php

if (! defined('ABSPATH')) {
	exit;
}

/**
 * Return the option key used to store the legacy Styler assistant state.
 *
 * @return string
 */
function motto_styler_get_legacy_assistant_state_option_key() {
	return 'motto_styler_legacy_assistant_state';
}

/**
 * Return the default summary payload for the legacy Styler assistant.
 *
 * @return array<string,int>
 */
function motto_styler_get_default_legacy_assistant_summary() {
	return array(
		'postsScanned'             => 0,
		'postsUpdated'             => 0,
		'blocksScanned'            => 0,
		'legacyBlocksFound'        => 0,
		'safeToMigrateAndClean'    => 0,
		'safeToClean'              => 0,
		'migratedAndCleaned'       => 0,
		'cleanedOnly'              => 0,
		'conflicts'                => 0,
		'errors'                   => 0,
	);
}

/**
 * Return the default persisted state for the legacy Styler assistant.
 *
 * @return array<string,mixed>
 */
function motto_styler_get_default_legacy_assistant_state() {
	return array(
		'version'    => defined('MOTTO_BLOCKS_VERSION') ? MOTTO_BLOCKS_VERSION : '',
		'status'     => 'unknown',
		'summary'    => motto_styler_get_default_legacy_assistant_summary(),
		'updatedAt'  => 0,
	);
}

/**
 * Read the persisted state for the legacy Styler assistant.
 *
 * Resets to `unknown` when plugin version changes so the assistant may re-run
 * after contract changes or future import paths introduce legacy content again.
 *
 * @return array<string,mixed>
 */
function motto_styler_get_legacy_assistant_state() {
	$default = motto_styler_get_default_legacy_assistant_state();
	$state   = get_option(motto_styler_get_legacy_assistant_state_option_key(), array());

	if (! is_array($state)) {
		$state = array();
	}

	$state = array_merge($default, $state);
	$state['summary'] = array_merge(
		motto_styler_get_default_legacy_assistant_summary(),
		isset($state['summary']) && is_array($state['summary']) ? array_map('intval', $state['summary']) : array()
	);

	$current_version = defined('MOTTO_BLOCKS_VERSION') ? MOTTO_BLOCKS_VERSION : '';
	if ((string) $state['version'] !== (string) $current_version) {
		$state = $default;
		update_option(motto_styler_get_legacy_assistant_state_option_key(), $state, false);
	}

	return $state;
}

/**
 * Persist the legacy Styler assistant state.
 *
 * @param array<string,mixed> $state State payload.
 * @return array<string,mixed>
 */
function motto_styler_set_legacy_assistant_state(array $state) {
	$next_state = array_merge(
		motto_styler_get_default_legacy_assistant_state(),
		$state
	);
	$next_state['version'] = defined('MOTTO_BLOCKS_VERSION') ? MOTTO_BLOCKS_VERSION : '';
	$next_state['updatedAt'] = time();
	$next_state['summary'] = array_merge(
		motto_styler_get_default_legacy_assistant_summary(),
		isset($next_state['summary']) && is_array($next_state['summary']) ? array_map('intval', $next_state['summary']) : array()
	);

	update_option(motto_styler_get_legacy_assistant_state_option_key(), $next_state, false);
	return $next_state;
}

/**
 * Mark the legacy Styler assistant as clean.
 *
 * @param array<string,int> $summary Optional latest summary.
 * @return array<string,mixed>
 */
function motto_styler_mark_legacy_assistant_clean(array $summary = array()) {
	return motto_styler_set_legacy_assistant_state(
		array(
			'status'  => 'clean',
			'summary' => $summary,
		)
	);
}

/**
 * Mark the legacy Styler assistant as actionable and store the latest summary.
 *
 * @param array<string,int> $summary Latest analysis summary.
 * @return array<string,mixed>
 */
function motto_styler_mark_legacy_assistant_actionable(array $summary) {
	return motto_styler_set_legacy_assistant_state(
		array(
			'status'  => 'actionable',
			'summary' => $summary,
		)
	);
}

/**
 * Mark the legacy Styler assistant as unknown so analysis may be run again.
 *
 * @return array<string,mixed>
 */
function motto_styler_mark_legacy_assistant_unknown() {
	return motto_styler_set_legacy_assistant_state(
		array(
			'status'  => 'unknown',
			'summary' => motto_styler_get_default_legacy_assistant_summary(),
		)
	);
}

/**
 * Return whether an analysis summary contains safe actions.
 *
 * @param array<string,int> $summary Summary payload.
 * @return bool
 */
function motto_styler_legacy_assistant_has_actionable_summary(array $summary) {
	$safe_migrate = isset($summary['safeToMigrateAndClean']) ? (int) $summary['safeToMigrateAndClean'] : 0;
	$safe_clean   = isset($summary['safeToClean']) ? (int) $summary['safeToClean'] : 0;
	return $safe_migrate > 0 || $safe_clean > 0;
}

/**
 * Format the analysis summary for the legacy Styler assistant.
 *
 * @param array<string,int> $summary Summary payload.
 * @return string
 */
function motto_styler_format_legacy_assistant_analysis_summary(array $summary) {
	$summary = array_merge(motto_styler_get_default_legacy_assistant_summary(), array_map('intval', $summary));

	return sprintf(
		/* translators: 1: posts scanned, 2: blocks scanned, 3: legacy blocks found, 4: safe migrate count, 5: safe clean count, 6: conflicts, 7: errors */
		__('Analysis finished. Posts scanned: %1$d. Blocks scanned: %2$d. Legacy blocks found: %3$d. Safe to migrate and clean: %4$d. Safe to clean: %5$d. Conflicts: %6$d. Errors: %7$d.', 'motto-blocks'),
		$summary['postsScanned'],
		$summary['blocksScanned'],
		$summary['legacyBlocksFound'],
		$summary['safeToMigrateAndClean'],
		$summary['safeToClean'],
		$summary['conflicts'],
		$summary['errors']
	);
}

/**
 * Format the migration summary for the legacy Styler assistant.
 *
 * @param array<string,int> $summary Summary payload.
 * @param bool              $is_clean Whether the install is clean after execution.
 * @return string
 */
function motto_styler_format_legacy_assistant_migration_summary(array $summary, $is_clean = false) {
	$summary = array_merge(motto_styler_get_default_legacy_assistant_summary(), array_map('intval', $summary));

	$message = sprintf(
		/* translators: 1: posts scanned, 2: posts updated, 3: migrated and cleaned blocks, 4: cleaned-only blocks, 5: conflicts, 6: errors */
		__('Migration finished. Posts scanned: %1$d. Posts updated: %2$d. Migrated and cleaned: %3$d. Cleaned only: %4$d. Conflicts skipped: %5$d. Errors: %6$d.', 'motto-blocks'),
		$summary['postsScanned'],
		$summary['postsUpdated'],
		$summary['migratedAndCleaned'],
		$summary['cleanedOnly'],
		$summary['conflicts'],
		$summary['errors']
	);

	if ($is_clean) {
		return $message . ' ' . __('Styler data is now fully normalized.', 'motto-blocks');
	}

	return $message . ' ' . __('Run Analyze Styler Data again if you want to inspect any remaining unresolved legacy content.', 'motto-blocks');
}

/**
 * Return post types that may persist block-based legacy Styler data in post_content.
 *
 * @return array<int,string>
 */
function motto_styler_get_legacy_assistant_candidate_post_types() {
	$post_types = function_exists('get_post_types_by_support')
		? get_post_types_by_support('editor')
		: array();

	$post_types = is_array($post_types) ? $post_types : array();
	$post_types = array_merge($post_types, array('wp_block', 'wp_template', 'wp_template_part', 'wp_navigation'));

	$existing = array();
	foreach (array_values(array_unique(array_map('strval', $post_types))) as $post_type) {
		if (post_type_exists($post_type)) {
			$existing[] = $post_type;
		}
	}

	return $existing;
}

/**
 * Return post ids whose raw block content still contains legacy mottoProps payloads.
 *
 * @return array<int,int>
 */
function motto_styler_get_legacy_assistant_candidate_post_ids() {
	global $wpdb;

	$post_types = motto_styler_get_legacy_assistant_candidate_post_types();
	if (empty($post_types)) {
		return array();
	}

	$type_placeholders = implode(', ', array_fill(0, count($post_types), '%s'));
	$query_args        = array_merge($post_types, array('%"mottoProps"%'));

	// phpcs:disable WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
	// $type_placeholders is built exclusively from array_fill()/implode() above — it can only ever
	// contain repeated "%s" tokens joined by ", ", never attacker-influenced content — and the whole
	// template is passed through $wpdb->prepare() in the same statement as the query. PHPCS's static
	// analysis can't verify a dynamically-sized IN(...) placeholder list is safe, hence this suppression.
	$post_ids = $wpdb->get_col(
		$wpdb->prepare(
			"
				SELECT ID
				FROM {$wpdb->posts}
				WHERE post_type IN ($type_placeholders)
					AND post_status NOT IN ('trash', 'inherit', 'auto-draft')
					AND post_content LIKE %s
				ORDER BY ID ASC
			",
			$query_args
		)
	);
	// phpcs:enable WordPress.DB.PreparedSQL.InterpolatedNotPrepared,WordPress.DB.PreparedSQL.NotPrepared,WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching

	if (! is_array($post_ids) || empty($post_ids)) {
		return array();
	}

	return array_values(array_unique(array_map('intval', $post_ids)));
}

/**
 * Return whether there is still at least one semantically actionable legacy payload.
 *
 * @return bool
 */
function motto_styler_has_legacy_assistant_candidates() {
	$post_ids = motto_styler_get_legacy_assistant_candidate_post_ids();
	if (empty($post_ids)) {
		return false;
	}

	$summary = motto_styler_analyze_legacy_assistant_posts($post_ids);
	return (int) $summary['legacyBlocksFound'] > 0 || (int) $summary['errors'] > 0;
}

/**
 * Return whether one raw post_content contains semantic legacy Styler payloads.
 *
 * @param string $content Raw post_content.
 * @return bool
 */
function motto_styler_content_has_semantic_legacy_payloads($content) {
	$content = (string) $content;
	if ($content === '' || strpos($content, '"mottoProps"') === false) {
		return false;
	}

	$blocks = parse_blocks($content);
	if (! is_array($blocks) || empty($blocks)) {
		return false;
	}

	$summary = motto_styler_get_default_legacy_assistant_summary();
	motto_styler_analyze_legacy_blocks($blocks, $summary);
	return (int) $summary['legacyBlocksFound'] > 0;
}

/**
 * Drop legacy-only flags from a styler payload.
 *
 * @param mixed $value Raw styler payload.
 * @return array<string,mixed>
 */
function motto_styler_strip_legacy_flags_from_payload($value) {
	if (! is_array($value)) {
		return array();
	}

	$next = $value;
	unset($next['readyToDelete']);
	return $next;
}

/**
 * Normalize cssClasses to a comparable list.
 *
 * @param mixed $value Raw cssClasses value.
 * @return array<int,array<string,mixed>>
 */
function motto_styler_normalize_css_classes_for_compare($value) {
	if (! is_array($value)) {
		return array();
	}

	$normalized = array();
	foreach ($value as $item) {
		if (is_string($item)) {
			$slug = sanitize_html_class(ltrim(trim($item), '.'));
			if ($slug !== '') {
				$normalized[] = array('id' => 0, 'slug' => $slug);
			}
			continue;
		}

		if (! is_array($item)) {
			continue;
		}

		$id   = isset($item['id']) ? max(0, (int) $item['id']) : 0;
		$slug = isset($item['slug']) ? sanitize_html_class(ltrim(trim((string) $item['slug']), '.')) : '';
		if ($id <= 0 && $slug === '') {
			continue;
		}

		$normalized[] = array(
			'id'   => $id,
			'slug' => $slug,
		);
	}

	usort(
		$normalized,
		static function ($a, $b) {
			return strcmp(wp_json_encode($a), wp_json_encode($b));
		}
	);

	return $normalized;
}

/**
 * Recursively remove non-semantic keys from a styler payload for equality checks.
 *
 * @param mixed $value Raw comparable value.
 * @return mixed
 */
function motto_styler_prepare_payload_value_for_compare($value) {
	if (! is_array($value)) {
		return $value;
	}

	$is_list = function_exists('array_is_list') ? array_is_list($value) : motto_styler_array_is_list($value);
	if ($is_list) {
		return array_map('motto_styler_prepare_payload_value_for_compare', $value);
	}

	$next = array();
	foreach ($value as $key => $item) {
		if (in_array((string) $key, array('id', 'instanceId', 'readyToDelete', 'ui'), true)) {
			continue;
		}
		$next[$key] = motto_styler_prepare_payload_value_for_compare($item);
	}

	ksort($next, SORT_NATURAL | SORT_FLAG_CASE);
	return $next;
}

/**
 * Build a comparable normalized payload for equality checks.
 *
 * @param mixed $value Raw styler payload.
 * @return array<string,mixed>
 */
function motto_styler_prepare_styler_payload_for_compare($value) {
	if (! is_array($value)) {
		return array();
	}

	$payload = motto_styler_strip_legacy_flags_from_payload($value);
	if (isset($payload['cssClasses'])) {
		$payload['cssClasses'] = motto_styler_normalize_css_classes_for_compare($payload['cssClasses']);
	}
	if (
		isset($payload['blockSelectors']) ||
		isset($payload['innerSelectors']) ||
		isset($payload['selectors'])
	) {
		$payload['blockSelectors'] = motto_styler_normalize_inner_selectors_by_breakpoint($payload);
		unset($payload['innerSelectors'], $payload['selectors']);
	}

	return motto_styler_prepare_payload_value_for_compare($payload);
}

/**
 * Return whether two styler payloads are semantically equivalent for cleanup.
 *
 * @param mixed $styler Canonical mottoStyler payload.
 * @param mixed $legacy Legacy mottoProps payload.
 * @return bool
 */
function motto_styler_are_payloads_equivalent_for_cleanup($styler, $legacy) {
	return wp_json_encode(motto_styler_prepare_styler_payload_for_compare($styler)) === wp_json_encode(motto_styler_prepare_styler_payload_for_compare($legacy));
}

/**
 * Analyze legacy Styler data for one block attribute bag.
 *
 * @param array<string,mixed> $attrs Block attributes.
 * @return array<string,mixed>
 */
function motto_styler_analyze_legacy_block_attributes(array $attrs) {
	$styler = isset($attrs['mottoStyler']) && is_array($attrs['mottoStyler']) ? $attrs['mottoStyler'] : array();
	$legacy = isset($attrs['mottoProps']) && is_array($attrs['mottoProps']) ? $attrs['mottoProps'] : array();

	if (empty($legacy)) {
		return array(
			'hasLegacy' => false,
			'status'    => 'none',
		);
	}

	$legacy_clean        = motto_styler_strip_legacy_flags_from_payload($legacy);
	$legacy_has_content  = function_exists('motto_styler_has_styler_content') ? motto_styler_has_styler_content($legacy_clean) : ! empty($legacy_clean);
	$styler_has_content  = function_exists('motto_styler_has_styler_content') ? motto_styler_has_styler_content($styler) : ! empty($styler);
	$legacy_ready_delete = isset($legacy['readyToDelete']) && true === $legacy['readyToDelete'];

	if (! $legacy_has_content) {
		return array(
			'hasLegacy' => true,
			'status'    => 'safe_to_clean',
		);
	}

	if (! $styler_has_content) {
		return array(
			'hasLegacy'          => true,
			'status'             => 'safe_to_migrate_and_clean',
			'migratedMottoStyler'=> $legacy_clean,
		);
	}

	if ($legacy_ready_delete || motto_styler_are_payloads_equivalent_for_cleanup($styler, $legacy_clean)) {
		return array(
			'hasLegacy' => true,
			'status'    => 'safe_to_clean',
		);
	}

	return array(
		'hasLegacy' => true,
		'status'    => 'conflict',
	);
}

/**
 * Analyze parsed blocks for legacy Styler data.
 *
 * @param array<int,array<string,mixed>> $blocks Parsed blocks.
 * @param array<string,int>              $summary Running summary.
 * @return void
 */
function motto_styler_analyze_legacy_blocks(array $blocks, array &$summary) {
	foreach ($blocks as $block) {
		$summary['blocksScanned']++;
		$analysis = motto_styler_analyze_legacy_block_attributes(
			isset($block['attrs']) && is_array($block['attrs']) ? $block['attrs'] : array()
		);

		if (! empty($analysis['hasLegacy'])) {
			$summary['legacyBlocksFound']++;
			switch ($analysis['status']) {
				case 'safe_to_migrate_and_clean':
					$summary['safeToMigrateAndClean']++;
					break;
				case 'safe_to_clean':
					$summary['safeToClean']++;
					break;
				case 'conflict':
					$summary['conflicts']++;
					break;
			}
		}

		if (isset($block['innerBlocks']) && is_array($block['innerBlocks']) && ! empty($block['innerBlocks'])) {
			motto_styler_analyze_legacy_blocks($block['innerBlocks'], $summary);
		}
	}
}

/**
 * Analyze legacy Styler data for a batch of post ids.
 *
 * @param array<int,int> $post_ids Post ids.
 * @return array<string,int>
 */
function motto_styler_analyze_legacy_assistant_posts(array $post_ids) {
	$summary = motto_styler_get_default_legacy_assistant_summary();

	foreach (array_values(array_unique(array_map('intval', $post_ids))) as $post_id) {
		if ($post_id <= 0) {
			$summary['errors']++;
			continue;
		}

		$post = get_post($post_id);
		if (! $post instanceof WP_Post) {
			$summary['errors']++;
			continue;
		}

		$summary['postsScanned']++;
		$blocks = parse_blocks((string) $post->post_content);
		if (! is_array($blocks)) {
			$summary['errors']++;
			continue;
		}

		motto_styler_analyze_legacy_blocks($blocks, $summary);
	}

	return $summary;
}

/**
 * Migrate and clean one parsed block tree.
 *
 * @param array<int,array<string,mixed>> $blocks Parsed blocks.
 * @param array<string,int>              $summary Running summary.
 * @param bool                           $changed Whether any content changed.
 * @return array<int,array<string,mixed>>
 */
function motto_styler_migrate_legacy_blocks(array $blocks, array &$summary, &$changed = false) {
	$next_blocks = array();

	foreach ($blocks as $block) {
		$summary['blocksScanned']++;
		$next_block = $block;
		$attrs      = isset($next_block['attrs']) && is_array($next_block['attrs']) ? $next_block['attrs'] : array();
		$analysis   = motto_styler_analyze_legacy_block_attributes($attrs);

		if (! empty($analysis['hasLegacy'])) {
			$summary['legacyBlocksFound']++;
			switch ($analysis['status']) {
				case 'safe_to_migrate_and_clean':
					$attrs['mottoStyler'] = isset($analysis['migratedMottoStyler']) && is_array($analysis['migratedMottoStyler'])
						? $analysis['migratedMottoStyler']
						: array();
					unset($attrs['mottoProps']);
					$next_block['attrs'] = $attrs;
					$summary['migratedAndCleaned']++;
					$changed = true;
					break;
				case 'safe_to_clean':
					unset($attrs['mottoProps']);
					$next_block['attrs'] = $attrs;
					$summary['cleanedOnly']++;
					$changed = true;
					break;
				case 'conflict':
					$summary['conflicts']++;
					break;
			}
		}

		if (isset($next_block['innerBlocks']) && is_array($next_block['innerBlocks']) && ! empty($next_block['innerBlocks'])) {
			$next_block['innerBlocks'] = motto_styler_migrate_legacy_blocks($next_block['innerBlocks'], $summary, $changed);
		}

		$next_blocks[] = $next_block;
	}

	return $next_blocks;
}

/**
 * Migrate and clean legacy Styler data for a batch of posts.
 *
 * @param array<int,int> $post_ids Post ids.
 * @return array<string,int>
 */
function motto_styler_migrate_legacy_assistant_posts(array $post_ids) {
	$summary = motto_styler_get_default_legacy_assistant_summary();

	foreach (array_values(array_unique(array_map('intval', $post_ids))) as $post_id) {
		if ($post_id <= 0) {
			$summary['errors']++;
			continue;
		}

		$post = get_post($post_id);
		if (! $post instanceof WP_Post) {
			$summary['errors']++;
			continue;
		}

		$summary['postsScanned']++;
		$blocks = parse_blocks((string) $post->post_content);
		if (! is_array($blocks)) {
			$summary['errors']++;
			continue;
		}

		$changed     = false;
		$next_blocks = motto_styler_migrate_legacy_blocks($blocks, $summary, $changed);
		if (! $changed) {
			continue;
		}

		$next_content = serialize_blocks($next_blocks);
		if ((string) $next_content === (string) $post->post_content) {
			continue;
		}

		$updated = wp_update_post(
			array(
				'ID'           => $post_id,
				'post_content' => $next_content,
			),
			true
		);

		if (is_wp_error($updated)) {
			$summary['errors']++;
			continue;
		}

		$summary['postsUpdated']++;
	}

	return $summary;
}

/**
 * Return the async batch size for legacy assistant jobs.
 *
 * @return int
 */
function motto_styler_get_legacy_assistant_batch_size() {
	$batch_size = (int) apply_filters('motto_styler_legacy_assistant_batch_size', 10);
	return $batch_size > 0 ? $batch_size : 10;
}

/**
 * Build the transient key used for one legacy assistant job.
 *
 * @param string $job_id Job token.
 * @return string
 */
function motto_styler_get_legacy_assistant_job_key($job_id) {
	$job_id = sanitize_key((string) $job_id);
	return 'motto_legacy_job_' . $job_id;
}

/**
 * Build the lock key used while one legacy assistant batch is processing.
 *
 * @param string $job_id Job token.
 * @return string
 */
function motto_styler_get_legacy_assistant_job_lock_key($job_id) {
	$job_id = sanitize_key((string) $job_id);
	return 'motto_legacy_lock_' . $job_id;
}

/**
 * Acquire a short-lived lock for one legacy assistant job.
 *
 * @param string $job_id Job token.
 * @param int    $ttl    Lock TTL in seconds.
 * @return bool
 */
function motto_styler_acquire_legacy_assistant_job_lock($job_id, $ttl = 30) {
	$ttl = max(1, (int) $ttl);
	$key = motto_styler_get_legacy_assistant_job_lock_key($job_id);
	$now = time();

	if (add_option($key, (string) $now, '', false)) {
		return true;
	}

	$existing = (int) get_option($key, 0);
	if ($existing > 0 && ($now - $existing) < $ttl) {
		return false;
	}

	delete_option($key);
	return add_option($key, (string) $now, '', false);
}

/**
 * Release the short-lived lock for one legacy assistant job.
 *
 * @param string $job_id Job token.
 * @return void
 */
function motto_styler_release_legacy_assistant_job_lock($job_id) {
	delete_option(motto_styler_get_legacy_assistant_job_lock_key($job_id));
}

/**
 * Create a new async legacy assistant job.
 *
 * @param string $mode Supported values: analyze, migrate.
 * @return array<string,mixed>|WP_Error
 */
function motto_styler_create_legacy_assistant_job($mode) {
	$mode = sanitize_key((string) $mode);
	if (! in_array($mode, array('analyze', 'migrate'), true)) {
		return new WP_Error('invalid_mode', __('Invalid legacy assistant mode.', 'motto-blocks'));
	}

	$post_ids = motto_styler_get_legacy_assistant_candidate_post_ids();
	$summary  = motto_styler_get_default_legacy_assistant_summary();

	if (empty($post_ids)) {
		motto_styler_mark_legacy_assistant_clean($summary);

		return array(
			'id'             => '',
			'mode'           => $mode,
			'total'          => 0,
			'offset'         => 0,
			'done'           => true,
			'summary'        => $summary,
			'assistantStatus'=> 'clean',
			'hasActionable'  => false,
			'message'        => __('Styler data is already normalized. No legacy attributes were found.', 'motto-blocks'),
		);
	}

	$job_id = function_exists('wp_generate_uuid4') ? wp_generate_uuid4() : uniqid('motto-legacy-', true);
	$job    = array(
		'mode'      => $mode,
		'postIds'   => $post_ids,
		'offset'    => 0,
		'summary'   => $summary,
		'batchSize' => motto_styler_get_legacy_assistant_batch_size(),
		'createdAt' => time(),
	);

	set_transient(motto_styler_get_legacy_assistant_job_key($job_id), $job, HOUR_IN_SECONDS);

	return array(
		'id'             => (string) $job_id,
		'mode'           => $mode,
		'total'          => count($post_ids),
		'offset'         => 0,
		'done'           => false,
		'summary'        => $summary,
		'assistantStatus'=> $mode === 'analyze' ? 'unknown' : motto_styler_get_legacy_assistant_state()['status'],
		'hasActionable'  => false,
		'message'        => '',
	);
}

/**
 * Process the next batch for one legacy assistant job.
 *
 * @param string $job_id Job token.
 * @return array<string,mixed>|WP_Error
 */
function motto_styler_process_legacy_assistant_job($job_id) {
	$job_key = motto_styler_get_legacy_assistant_job_key($job_id);
	$job     = get_transient($job_key);
	if (! is_array($job)) {
		return new WP_Error('missing_job', __('The legacy assistant job could not be found or has expired.', 'motto-blocks'));
	}

	if (! motto_styler_acquire_legacy_assistant_job_lock($job_id)) {
		return new WP_Error('job_locked', __('Another legacy assistant batch is already processing for this job. Please try again.', 'motto-blocks'));
	}

	try {
		$mode       = isset($job['mode']) ? sanitize_key((string) $job['mode']) : 'analyze';
		$post_ids   = isset($job['postIds']) && is_array($job['postIds']) ? array_values(array_map('intval', $job['postIds'])) : array();
		$total      = count($post_ids);
		$offset     = isset($job['offset']) ? max(0, (int) $job['offset']) : 0;
		$batch_size = isset($job['batchSize']) ? max(1, (int) $job['batchSize']) : motto_styler_get_legacy_assistant_batch_size();
		$summary    = array_merge(
			motto_styler_get_default_legacy_assistant_summary(),
			isset($job['summary']) && is_array($job['summary']) ? array_map('intval', $job['summary']) : array()
		);

		$batch_post_ids = array_slice($post_ids, $offset, $batch_size);
		if (! empty($batch_post_ids)) {
			$batch_summary = $mode === 'migrate'
				? motto_styler_migrate_legacy_assistant_posts($batch_post_ids)
				: motto_styler_analyze_legacy_assistant_posts($batch_post_ids);

			foreach (array_keys($summary) as $key) {
				$summary[$key] += isset($batch_summary[$key]) ? (int) $batch_summary[$key] : 0;
			}
		}

		$offset += count($batch_post_ids);
		$done = $offset >= $total;
		$assistant_status = 'unknown';
		$has_actionable   = false;
		$message          = '';

		if ($done) {
			delete_transient($job_key);

			if ($mode === 'analyze') {
				if ((int) $summary['legacyBlocksFound'] <= 0 && (int) $summary['errors'] <= 0) {
					motto_styler_mark_legacy_assistant_clean($summary);
					$assistant_status = 'clean';
				} else {
					motto_styler_mark_legacy_assistant_actionable($summary);
					$assistant_status = 'actionable';
				}

				$has_actionable = motto_styler_legacy_assistant_has_actionable_summary($summary);
				$message = motto_styler_format_legacy_assistant_analysis_summary($summary);
			} else {
				$remaining_post_ids = motto_styler_get_legacy_assistant_candidate_post_ids();
				$is_clean           = empty($remaining_post_ids);
				if ($is_clean) {
					motto_styler_mark_legacy_assistant_clean($summary);
					$assistant_status = 'clean';
					$has_actionable   = false;
				} else {
					$analysis_summary = motto_styler_analyze_legacy_assistant_posts($remaining_post_ids);
					if ((int) $analysis_summary['legacyBlocksFound'] <= 0 && (int) $analysis_summary['errors'] <= 0) {
						motto_styler_mark_legacy_assistant_clean($analysis_summary);
						$assistant_status = 'clean';
						$has_actionable   = false;
					} else {
						motto_styler_mark_legacy_assistant_actionable($analysis_summary);
						$assistant_status = 'actionable';
						$has_actionable   = motto_styler_legacy_assistant_has_actionable_summary($analysis_summary);
					}
				}

				$message = motto_styler_format_legacy_assistant_migration_summary($summary, $is_clean);
			}
		} else {
			$job['offset']  = $offset;
			$job['summary'] = $summary;
			set_transient($job_key, $job, HOUR_IN_SECONDS);
			$assistant_status = $mode === 'analyze'
				? motto_styler_get_legacy_assistant_state()['status']
				: 'unknown';
		}

		return array(
			'id'             => (string) $job_id,
			'mode'           => $mode,
			'total'          => $total,
			'offset'         => $offset,
			'done'           => $done,
			'summary'        => $summary,
			'assistantStatus'=> $assistant_status,
			'hasActionable'  => $has_actionable,
			'message'        => $message,
		);
	} finally {
		motto_styler_release_legacy_assistant_job_lock($job_id);
	}
}

/**
 * Re-open the legacy assistant when new content containing legacy mottoProps is saved.
 *
 * @param int     $post_id Post id.
 * @param WP_Post $post    Saved post object.
 * @param bool    $update  Whether this is an update.
 * @return void
 */
function motto_styler_maybe_reopen_legacy_assistant_on_save($post_id, $post, $update) {
	unset($update);

	$post_id = (int) $post_id;
	if ($post_id <= 0 || wp_is_post_autosave($post_id) || wp_is_post_revision($post_id)) {
		return;
	}

	if (! $post instanceof WP_Post) {
		return;
	}

	$state = motto_styler_get_legacy_assistant_state();
	if (($state['status'] ?? 'unknown') !== 'clean') {
		return;
	}

	if (! motto_styler_content_has_semantic_legacy_payloads((string) $post->post_content)) {
		return;
	}

	motto_styler_mark_legacy_assistant_unknown();
}
add_action('save_post', 'motto_styler_maybe_reopen_legacy_assistant_on_save', 20, 3);

/**
 * AJAX: start an async legacy assistant job.
 *
 * @return void
 */
function motto_styler_handle_ajax_start_legacy_assistant_job() {
	if (! current_user_can('manage_options')) {
		wp_send_json_error(array('message' => __('You do not have permission to run the legacy assistant.', 'motto-blocks')), 403);
	}

	check_ajax_referer('motto_styler_legacy_assistant');
	$mode = isset($_POST['mode']) ? sanitize_key(wp_unslash($_POST['mode'])) : 'analyze';

	$result = motto_styler_create_legacy_assistant_job($mode);
	if (is_wp_error($result)) {
		wp_send_json_error(array('message' => $result->get_error_message()), 400);
	}

	wp_send_json_success($result);
}
add_action('wp_ajax_motto_styler_start_legacy_assistant_job', 'motto_styler_handle_ajax_start_legacy_assistant_job');

/**
 * AJAX: process the next async legacy assistant batch.
 *
 * @return void
 */
function motto_styler_handle_ajax_process_legacy_assistant_job() {
	if (! current_user_can('manage_options')) {
		wp_send_json_error(array('message' => __('You do not have permission to run the legacy assistant.', 'motto-blocks')), 403);
	}

	check_ajax_referer('motto_styler_legacy_assistant');
	$job_id = isset($_POST['job_id']) ? sanitize_text_field(wp_unslash($_POST['job_id'])) : '';
	if ($job_id === '') {
		wp_send_json_error(array('message' => __('Missing legacy assistant job id.', 'motto-blocks')), 400);
	}

	$result = motto_styler_process_legacy_assistant_job($job_id);
	if (is_wp_error($result)) {
		wp_send_json_error(array('message' => $result->get_error_message()), 404);
	}

	wp_send_json_success($result);
}
add_action('wp_ajax_motto_styler_process_legacy_assistant_job', 'motto_styler_handle_ajax_process_legacy_assistant_job');

/**
 * Render the transient legacy Styler assistant card.
 *
 * @return void
 */
function motto_styler_render_legacy_assistant_card() {
	$state = motto_styler_get_legacy_assistant_state();
	if (! motto_styler_has_legacy_assistant_candidates()) {
		if (($state['status'] ?? 'unknown') !== 'clean') {
			motto_styler_mark_legacy_assistant_clean();
		}
		return;
	}

	if (($state['status'] ?? 'unknown') === 'clean') {
		$state = motto_styler_mark_legacy_assistant_unknown();
	}

	$summary        = isset($state['summary']) && is_array($state['summary']) ? $state['summary'] : motto_styler_get_default_legacy_assistant_summary();
	$has_summary    = array_sum(array_map('intval', $summary)) > 0;
	$has_actionable = motto_styler_legacy_assistant_has_actionable_summary($summary);
	$status         = sanitize_key((string) ($state['status'] ?? 'unknown'));
	$summary_items  = array(
		'postsScanned'          => __('Posts scanned', 'motto-blocks'),
		'postsUpdated'          => __('Posts updated', 'motto-blocks'),
		'blocksScanned'         => __('Blocks scanned', 'motto-blocks'),
		'legacyBlocksFound'     => __('Legacy blocks found', 'motto-blocks'),
		'safeToMigrateAndClean' => __('Safe to migrate and clean', 'motto-blocks'),
		'safeToClean'           => __('Safe to clean', 'motto-blocks'),
		'migratedAndCleaned'    => __('Migrated and cleaned', 'motto-blocks'),
		'cleanedOnly'           => __('Cleaned only', 'motto-blocks'),
		'conflicts'             => __('Conflicts', 'motto-blocks'),
		'errors'                => __('Errors', 'motto-blocks'),
	);
	$intro = $status === 'actionable'
		? __('The last analysis found legacy Styler payloads. Review the summary, then run migration and cleanup for the safe cases.', 'motto-blocks')
		: __('Analyze saved block content for legacy `mottoProps` payloads. If safe cases are found, you can migrate and clean them in one confirmed pass.', 'motto-blocks');
?>
	<div
		id="motto-styler-legacy-assistant"
		class="notice inline notice-info"
		data-ajax-url="<?php echo esc_url(admin_url('admin-ajax.php')); ?>"
		data-ajax-nonce="<?php echo esc_attr(wp_create_nonce('motto_styler_legacy_assistant')); ?>"
		data-start-action="motto_styler_start_legacy_assistant_job"
		data-process-action="motto_styler_process_legacy_assistant_job"
		data-status="<?php echo esc_attr($status); ?>"
		data-has-actionable="<?php echo $has_actionable ? '1' : '0'; ?>"
		data-analyze-label="<?php echo esc_attr__('Analyze Styler Data', 'motto-blocks'); ?>"
		data-analyze-again-label="<?php echo esc_attr__('Analyze Again', 'motto-blocks'); ?>"
		data-migrate-label="<?php echo esc_attr__('Migrate and Clean Up', 'motto-blocks'); ?>"
		data-running-analyze-label="<?php echo esc_attr__('Analyzing Styler data...', 'motto-blocks'); ?>"
		data-running-migrate-label="<?php echo esc_attr__('Migrating and cleaning Styler data...', 'motto-blocks'); ?>"
		data-progress-template="<?php /* translators: 1: number of posts processed so far, 2: total number of posts */ echo esc_attr__('Processed %1$d of %2$d posts.', 'motto-blocks'); ?>"
		data-empty-analyze-message="<?php echo esc_attr__('Styler data is already normalized. No legacy attributes were found.', 'motto-blocks'); ?>"
		data-default-intro="<?php echo esc_attr__('Analyze saved block content for legacy `mottoProps` payloads. If safe cases are found, you can migrate and clean them in one confirmed pass.', 'motto-blocks'); ?>"
		data-actionable-intro="<?php echo esc_attr__('The last analysis found legacy Styler payloads. Review the summary, then run migration and cleanup for the safe cases.', 'motto-blocks'); ?>"
		data-default-error-message="<?php echo esc_attr__('The legacy Styler assistant could not complete this request.', 'motto-blocks'); ?>">
		<h4><?php echo esc_html__('Legacy Styler Assistant', 'motto-blocks'); ?></h4>
		<p id="motto-styler-legacy-assistant-intro"><?php echo esc_html($intro); ?></p>
		<div id="motto-styler-legacy-assistant-summary" <?php echo $has_summary ? '' : 'hidden'; ?>>
			<ul>
				<?php foreach ($summary_items as $key => $label) : ?>
					<li>
						<strong><?php echo esc_html($label); ?>:</strong>
						<span data-summary-key="<?php echo esc_attr($key); ?>"><?php echo esc_html((string) ((int) ($summary[$key] ?? 0))); ?></span>
					</li>
				<?php endforeach; ?>
			</ul>
		</div>
		<p class="motto-flex gap-sm">
			<button type="button" class="button button-secondary" id="motto-styler-legacy-analyze">
				<?php echo esc_html($status === 'actionable' ? __('Analyze Again', 'motto-blocks') : __('Analyze Styler Data', 'motto-blocks')); ?>
			</button>
			<button
				type="button"
				class="button button-primary"
				id="motto-styler-legacy-migrate"
				<?php echo ($status === 'actionable' && $has_actionable) ? '' : 'hidden'; ?>>
				<?php echo esc_html__('Migrate and Clean Up', 'motto-blocks'); ?>
			</button>
		</p>
		<progress class="progress-bar" id="motto-styler-legacy-progress" value="0" max="1" hidden></progress>
		<p id="motto-styler-legacy-progress-text"></p>
		<div id="motto-styler-legacy-notices" aria-live="polite"></div>
	</div>
<?php
}
