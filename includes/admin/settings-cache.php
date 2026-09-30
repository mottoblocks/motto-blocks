<?php

if (! defined('ABSPATH')) {
	exit;
}

/**
 * Rebuild cached frontend CSS entries on demand.
 *
 * @return void
 */
function motto_styler_handle_rebuild_frontend_caches() {
	motto_styler_verify_admin_request( 'motto_styler_rebuild_frontend_caches' );

	$summary = function_exists('motto_styler_rebuild_frontend_cache_for_breakpoint_change')
		? motto_styler_rebuild_frontend_cache_for_breakpoint_change()
		: array(
			'scanned' => 0,
			'rebuilt' => 0,
			'invalidated' => 0,
			'skipped' => 0,
		);

	$redirect = motto_styler_get_settings_page_url(
		'styler',
		array(
			'styler_tab' => 'cache',
			'notice' => 'cache-rebuilt',
			'rebuild_scanned' => (string) ((int) $summary['scanned']),
			'rebuild_rebuilt' => (string) ((int) $summary['rebuilt']),
			'rebuild_invalidated' => (string) ((int) $summary['invalidated']),
			'rebuild_skipped' => (string) ((int) $summary['skipped']),
		)
	);

	wp_safe_redirect($redirect);
	exit;
}
add_action('admin_post_motto_styler_rebuild_frontend_caches', 'motto_styler_handle_rebuild_frontend_caches');

/**
 * AJAX: start an async frontend cache rebuild job.
 *
 * @return void
 */
function motto_styler_handle_ajax_start_frontend_cache_rebuild() {
	if (! current_user_can('manage_options')) {
		wp_send_json_error(array('message' => __('You do not have permission to rebuild frontend caches.', 'motto-blocks')), 403);
	}

	check_ajax_referer('motto_styler_frontend_cache_rebuild');
	if (! function_exists('motto_styler_create_frontend_cache_rebuild_job')) {
		wp_send_json_error(array('message' => __('Rebuild job handler is not available.', 'motto-blocks')), 500);
	}
	wp_send_json_success(motto_styler_create_frontend_cache_rebuild_job());
}
add_action('wp_ajax_motto_styler_start_frontend_cache_rebuild', 'motto_styler_handle_ajax_start_frontend_cache_rebuild');

/**
 * AJAX: process the next async frontend cache rebuild batch.
 *
 * @return void
 */
function motto_styler_handle_ajax_process_frontend_cache_rebuild() {
	if (! current_user_can('manage_options')) {
		wp_send_json_error(array('message' => __('You do not have permission to rebuild frontend caches.', 'motto-blocks')), 403);
	}

	check_ajax_referer('motto_styler_frontend_cache_rebuild');
	$job_id = isset($_POST['job_id']) ? sanitize_text_field(wp_unslash($_POST['job_id'])) : '';
	if ($job_id === '') {
		wp_send_json_error(array('message' => __('Missing rebuild job id.', 'motto-blocks')), 400);
	}

	if (! function_exists('motto_styler_process_frontend_cache_rebuild_job')) {
		wp_send_json_error(array('message' => __('Rebuild job handler is not available.', 'motto-blocks')), 500);
	}
	$result = motto_styler_process_frontend_cache_rebuild_job($job_id);
	if (is_wp_error($result)) {
		wp_send_json_error(array('message' => $result->get_error_message()), 404);
	}

	wp_send_json_success($result);
}
add_action('wp_ajax_motto_styler_process_frontend_cache_rebuild', 'motto_styler_handle_ajax_process_frontend_cache_rebuild');

/**
 * Format a frontend cache rebuild summary for admin notices and async responses.
 *
 * @param array<string,int> $summary Summary counters.
 * @return string
 */
function motto_styler_format_frontend_cache_rebuild_summary(array $summary) {
	$scanned = isset($summary['scanned']) ? max(0, (int) $summary['scanned']) : 0;
	$rebuilt = isset($summary['rebuilt']) ? max(0, (int) $summary['rebuilt']) : 0;
	$invalidated = isset($summary['invalidated']) ? max(0, (int) $summary['invalidated']) : 0;
	$skipped = isset($summary['skipped']) ? max(0, (int) $summary['skipped']) : 0;

	return sprintf(
		/* translators: 1: scanned cache entries, 2: rebuilt entries, 3: invalidated entries, 4: skipped entries */
		__('Frontend cache rebuild finished. Scanned: %1$d. Rebuilt now: %2$d. Left invalidated for lazy rebuild: %3$d. Skipped: %4$d.', 'motto-blocks'),
		$scanned,
		$rebuilt,
		$invalidated,
		$skipped
	);
}

/**
 * Return the async batch size for frontend cache rebuild jobs.
 *
 * @return int
 */
function motto_styler_get_frontend_cache_rebuild_batch_size() {
	$batch_size = (int) apply_filters('motto_styler_frontend_cache_rebuild_batch_size', 10);
	return $batch_size > 0 ? $batch_size : 10;
}

/**
 * Build the transient key used for one frontend cache rebuild job.
 *
 * @param string $job_id Job token.
 * @return string
 */
function motto_styler_get_frontend_cache_rebuild_job_key($job_id) {
	$job_id = sanitize_key((string) $job_id);
	return 'motto_cache_job_' . $job_id;
}

/**
 * Build the lock key used while one frontend cache rebuild batch is processing.
 *
 * @param string $job_id Job token.
 * @return string
 */
function motto_styler_get_frontend_cache_rebuild_job_lock_key($job_id) {
	$job_id = sanitize_key((string) $job_id);
	return 'motto_cache_lock_' . $job_id;
}

/**
 * Acquire a short-lived lock for a frontend cache rebuild job.
 *
 * Uses add_option() as an atomic guard so concurrent AJAX requests do not process
 * the same offset twice. Stale locks are recycled after a short timeout.
 *
 * @param string $job_id Job token.
 * @param int    $ttl    Lock TTL in seconds.
 * @return bool
 */
function motto_styler_acquire_frontend_cache_rebuild_job_lock($job_id, $ttl = 30) {
	$ttl = max(1, (int) $ttl);
	$key = motto_styler_get_frontend_cache_rebuild_job_lock_key($job_id);
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
 * Release the short-lived lock for a frontend cache rebuild job.
 *
 * @param string $job_id Job token.
 * @return void
 */
function motto_styler_release_frontend_cache_rebuild_job_lock($job_id) {
	delete_option(motto_styler_get_frontend_cache_rebuild_job_lock_key($job_id));
}

/**
 * Create a new async frontend cache rebuild job.
 *
 * @return array{id:string,total:int,offset:int,summary:array<string,int>,batchSize:int}
 */
function motto_styler_create_frontend_cache_rebuild_job() {
	$post_ids = function_exists('motto_styler_get_frontend_cache_candidate_post_ids')
		? motto_styler_get_frontend_cache_candidate_post_ids()
		: array();
	$post_ids = is_array($post_ids) ? array_values(array_unique(array_map('intval', $post_ids))) : array();
	$job_id = function_exists('wp_generate_uuid4') ? wp_generate_uuid4() : uniqid('motto-cache-', true);
	$job = array(
		'postIds' => $post_ids,
		'offset' => 0,
		'summary' => array(
			'scanned' => 0,
			'rebuilt' => 0,
			'invalidated' => 0,
			'skipped' => 0,
		),
		'batchSize' => motto_styler_get_frontend_cache_rebuild_batch_size(),
		'createdAt' => time(),
	);

	set_transient(motto_styler_get_frontend_cache_rebuild_job_key($job_id), $job, HOUR_IN_SECONDS);

	return array(
		'id' => (string) $job_id,
		'total' => count($post_ids),
		'offset' => 0,
		'summary' => $job['summary'],
		'batchSize' => (int) $job['batchSize'],
	);
}

/**
 * Process the next batch for an async frontend cache rebuild job.
 *
 * @param string $job_id Job token.
 * @return array<string,mixed>|WP_Error
 */
function motto_styler_process_frontend_cache_rebuild_job($job_id) {
	$job_key = motto_styler_get_frontend_cache_rebuild_job_key($job_id);
	$job = get_transient($job_key);
	if (! is_array($job)) {
		return new WP_Error('missing_job', __('The rebuild job could not be found or has expired.', 'motto-blocks'));
	}

	if (! motto_styler_acquire_frontend_cache_rebuild_job_lock($job_id)) {
		return new WP_Error('job_locked', __('Another rebuild batch is already processing for this job. Please try again.', 'motto-blocks'));
	}

	try {
		$post_ids = isset($job['postIds']) && is_array($job['postIds']) ? array_values(array_map('intval', $job['postIds'])) : array();
		$total = count($post_ids);
		$offset = isset($job['offset']) ? max(0, (int) $job['offset']) : 0;
		$batch_size = isset($job['batchSize']) ? max(1, (int) $job['batchSize']) : motto_styler_get_frontend_cache_rebuild_batch_size();
		$summary = isset($job['summary']) && is_array($job['summary']) ? $job['summary'] : array();
		$summary = array_merge(
			array(
				'scanned' => 0,
				'rebuilt' => 0,
				'invalidated' => 0,
				'skipped' => 0,
			),
			array_map('intval', $summary)
		);

		$batch_post_ids = array_slice($post_ids, $offset, $batch_size);
		if (! empty($batch_post_ids) && function_exists('motto_styler_rebuild_frontend_cache_for_posts')) {
			$batch_summary = motto_styler_rebuild_frontend_cache_for_posts($batch_post_ids);
			foreach (array('scanned', 'rebuilt', 'invalidated', 'skipped') as $key) {
				$summary[$key] += isset($batch_summary[$key]) ? (int) $batch_summary[$key] : 0;
			}
		}

		$offset += count($batch_post_ids);
		$done = $offset >= $total;

		if ($done) {
			delete_transient($job_key);
		} else {
			$job['offset'] = $offset;
			$job['summary'] = $summary;
			set_transient($job_key, $job, HOUR_IN_SECONDS);
		}

		return array(
			'id' => (string) $job_id,
			'total' => $total,
			'offset' => $offset,
			'done' => $done,
			'summary' => $summary,
			'message' => $done ? motto_styler_format_frontend_cache_rebuild_summary($summary) : '',
		);
	} finally {
		motto_styler_release_frontend_cache_rebuild_job_lock($job_id);
	}
}
