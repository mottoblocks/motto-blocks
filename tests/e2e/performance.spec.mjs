/**
 * Performance budgets for the Motto Blocks editor experience.
 * All times are in milliseconds, sizes in KB.
 *
 * Baseline established 2026-05-13 on local WP:
 *   motto-blocks.js:     1374KB
 *   motto-blocks-pro.js:  834KB
 *   motto-dynamics.js:   1806KB  ← biggest, worth watching
 *   Total JS:            4136KB
 *
 * "Free plugin budget" only covers motto-blocks.js (no pro/dynamics).
 * "Total" covers the combined editor footprint across all motto plugins.
 *
 * Tighten these as bundle size improves.
 * On staging/prod, multiply time budgets by ~3 as a rough guide.
 */
const BUDGET = {
	editorReady: 10_000,       // nav start → canvas body visible
	blockInsert: 3_000,        // inserter option click → block in canvas
	stylerPanel: 1_500,        // block inserted → .motto-styler-panel visible
	mottoJsBundleKb: 1_500,    // motto-blocks.js (free) decoded KB  — current: ~1374KB
	mottoJsTotalKb: 4_500,     // all motto JS combined decoded KB   — current: ~4136KB
};

import { test, expect } from '@playwright/test';

const NEW_POST = '/wp-admin/post-new.php';
const canvasFrame = (page) => page.frameLocator('iframe[name="editor-canvas"]');

async function disableCache(page) {
	const cdp = await page.context().newCDPSession(page);
	await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
}

async function waitForEditorReady(page) {
	await disableCache(page);
	await page.goto(NEW_POST);
	const dialog = page.getByRole('dialog', { name: /welcome to the editor/i });
	if (await dialog.isVisible({ timeout: 4_000 }).catch(() => false)) {
		await page.getByRole('button', { name: 'Close' }).click();
	}
	await expect(canvasFrame(page).locator('.block-editor-iframe__body')).toBeVisible({
		timeout: BUDGET.editorReady,
	});
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getMottoResourceMetrics(page) {
	return page.evaluate(() => {
		const entries = performance.getEntriesByType('resource');
		const motto = entries.filter((e) => e.name.includes('motto') || e.name.includes('swiper') || e.name.includes('gsap'));
		return motto.map((e) => ({
			name: e.name.replace(/.*\//, '').split('?')[0],
			transferKb: Math.round(e.transferSize / 1024),
			// decodedBodySize is 0 for cached; fall back to encodedBodySize
			decodedKb: Math.round((e.decodedBodySize || e.encodedBodySize || e.transferSize) / 1024),
			durationMs: Math.round(e.duration),
			initiatorType: e.initiatorType,
			cached: e.transferSize === 0 && e.decodedBodySize > 0,
		}));
	});
}

async function getNavigationMetrics(page) {
	return page.evaluate(() => {
		const [nav] = performance.getEntriesByType('navigation');
		if (!nav) return null;
		return {
			ttfbMs: Math.round(nav.responseStart - nav.requestStart),
			domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
			loadEventMs: Math.round(nav.loadEventEnd - nav.startTime),
			domInteractiveMs: Math.round(nav.domInteractive - nav.startTime),
		};
	});
}

// ─── Tests ───────────────────────────────────────────────────────────────────

test.describe('Editor performance', () => {
	test('editor boots within budget', async ({ page }) => {
		const t0 = Date.now();
		await waitForEditorReady(page);
		const editorReadyMs = Date.now() - t0;

		console.log(`\n  Editor ready: ${editorReadyMs}ms (budget: ${BUDGET.editorReady}ms)`);
		expect(editorReadyMs, `Editor took ${editorReadyMs}ms — budget is ${BUDGET.editorReady}ms`).toBeLessThan(
			BUDGET.editorReady
		);
	});

	test('motto JS bundle size is within budget', async ({ page }) => {
		await waitForEditorReady(page);

		const resources = await getMottoResourceMetrics(page);
		const jsResources = resources.filter((r) => r.name.endsWith('.js'));

		const mainBundle = jsResources.find((r) => r.name === 'motto-blocks.js');
		const totalKb = jsResources.reduce((sum, r) => sum + r.decodedKb, 0);

		const PLUGIN_PREFIXES = {
			'motto-blocks.js': 'free',
			'motto-blocks-pro.js': 'pro',
			'motto-dynamics.js': 'dynamics',
		};
		console.log('\n  Motto JS resources:');
		jsResources.forEach((r) => {
			const tag = PLUGIN_PREFIXES[r.name] ? ` [${PLUGIN_PREFIXES[r.name]}]` : '';
			console.log(`    ${r.name}${tag}: ${r.decodedKb}KB decoded, ${r.transferKb}KB transfer, ${r.durationMs}ms`);
		});
		console.log(`  Total JS decoded: ${totalKb}KB (budget: ${BUDGET.mottoJsTotalKb}KB)`);

		if (mainBundle) {
			console.log(
				`  Main bundle: ${mainBundle.decodedKb}KB decoded (budget: ${BUDGET.mottoJsBundleKb}KB)`
			);
			expect(
				mainBundle.decodedKb,
				`motto-blocks.js is ${mainBundle.decodedKb}KB — budget is ${BUDGET.mottoJsBundleKb}KB`
			).toBeLessThan(BUDGET.mottoJsBundleKb);
		}

		expect(
			totalKb,
			`Total motto JS is ${totalKb}KB — budget is ${BUDGET.mottoJsTotalKb}KB`
		).toBeLessThan(BUDGET.mottoJsTotalKb);
	});

	test('inserting a Motto Container block is within budget', async ({ page }) => {
		await waitForEditorReady(page);

		await page.getByRole('button', { name: /block inserter/i }).click();
		const search = page.getByRole('searchbox');
		await expect(search).toBeVisible({ timeout: 3_000 });
		await search.fill('Motto Container');

		const option = page.getByRole('option', { name: /Motto Container/i }).first();
		await expect(option).toBeVisible({ timeout: 5_000 });

		const t0 = Date.now();
		await option.click();
		await expect(canvasFrame(page).locator('[data-type="motto/container"]')).toBeVisible({
			timeout: BUDGET.blockInsert,
		});
		const insertMs = Date.now() - t0;

		console.log(`\n  Block insert: ${insertMs}ms (budget: ${BUDGET.blockInsert}ms)`);
		expect(insertMs, `Block insertion took ${insertMs}ms — budget is ${BUDGET.blockInsert}ms`).toBeLessThan(
			BUDGET.blockInsert
		);
	});

	test('Styler panel renders within budget after block insertion', async ({ page }) => {
		await waitForEditorReady(page);

		await page.getByRole('button', { name: /block inserter/i }).click();
		const search = page.getByRole('searchbox');
		await expect(search).toBeVisible({ timeout: 3_000 });
		await search.fill('Motto Container');
		const option = page.getByRole('option', { name: /Motto Container/i }).first();
		await expect(option).toBeVisible({ timeout: 5_000 });
		await option.click();
		await expect(canvasFrame(page).locator('[data-type="motto/container"]')).toBeVisible({
			timeout: BUDGET.blockInsert,
		});

		const t0 = Date.now();
		await expect(page.locator('.motto-styler-panel')).toBeVisible({
			timeout: BUDGET.stylerPanel,
		});
		const panelMs = Date.now() - t0;

		console.log(`\n  Styler panel visible: ${panelMs}ms (budget: ${BUDGET.stylerPanel}ms)`);
		expect(panelMs, `Styler panel took ${panelMs}ms — budget is ${BUDGET.stylerPanel}ms`).toBeLessThan(
			BUDGET.stylerPanel
		);
	});

	test('full report — navigation timing + all resources', async ({ page }) => {
		await waitForEditorReady(page);

		const cdp = await page.context().newCDPSession(page);
		await cdp.send('Performance.enable');
		const [navMetrics, resources, cdpMetrics] = await Promise.all([
			getNavigationMetrics(page),
			getMottoResourceMetrics(page),
			cdp.send('Performance.getMetrics'),
		]);
		const pageMetrics = Object.fromEntries(
			(cdpMetrics.metrics || []).map(({ name, value }) => [name, value])
		);

		console.log('\n  ── Navigation timing ──────────────────────');
		if (navMetrics) {
			console.log(`  TTFB:               ${navMetrics.ttfbMs}ms`);
			console.log(`  DOM Interactive:    ${navMetrics.domInteractiveMs}ms`);
			console.log(`  DOMContentLoaded:   ${navMetrics.domContentLoadedMs}ms`);
			console.log(`  Load event:         ${navMetrics.loadEventMs}ms`);
		}

		console.log('\n  ── Motto resources ────────────────────────');
		const jsTotal = resources.filter((r) => r.name.endsWith('.js')).reduce((s, r) => s + r.decodedKb, 0);
		const cssTotal = resources.filter((r) => r.name.endsWith('.css')).reduce((s, r) => s + r.decodedKb, 0);
		resources
			.sort((a, b) => b.decodedKb - a.decodedKb)
			.forEach((r) =>
				console.log(`  [${r.initiatorType.padEnd(6)}] ${r.name.padEnd(45)} ${String(r.decodedKb).padStart(6)}KB  ${r.durationMs}ms`)
			);
		console.log(`\n  JS total:   ${jsTotal}KB`);
		console.log(`  CSS total:  ${cssTotal}KB`);

		console.log('\n  ── Page metrics ───────────────────────────');
		const heapUsed = pageMetrics.JSHeapUsedSize ?? 0;
		const heapTotal = pageMetrics.JSHeapTotalSize ?? 0;
		console.log(`  JS Heap Used:       ${Math.round(heapUsed / 1024 / 1024)}MB`);
		console.log(`  JS Heap Total:      ${Math.round(heapTotal / 1024 / 1024)}MB`);
		console.log(`  Layout count:       ${pageMetrics.LayoutCount ?? 'n/a'}`);
		console.log(`  Style recalcs:      ${pageMetrics.RecalcStyleCount ?? 'n/a'}`);
		console.log(`  Script duration:    ${Math.round((pageMetrics.ScriptDuration ?? 0) * 1000)}ms`);
		console.log(`  Layout duration:    ${Math.round((pageMetrics.LayoutDuration ?? 0) * 1000)}ms`);

		// No hard assertions — this test is purely informational
		expect(true).toBe(true);
	});
});
