import { test, expect } from '@playwright/test';

const NEW_POST = '/wp-admin/post-new.php';

// Gutenberg 6.4+ renders the canvas inside an iframe (blob URL, name="editor-canvas")
const canvasFrame = (page) => page.frameLocator('iframe[name="editor-canvas"]');

async function waitForEditor(page) {
	await page.goto(NEW_POST);

	// Dismiss the "Welcome to the editor" guide dialog if present
	const welcomeDialog = page.getByRole('dialog', { name: /welcome to the editor/i });
	if (await welcomeDialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
		await page.getByRole('button', { name: 'Close' }).click();
	}

	// Wait for the canvas body to be ready (the iframe uses .block-editor-iframe__body, not .block-editor-writing-flow)
	await expect(canvasFrame(page).locator('.block-editor-iframe__body')).toBeVisible({
		timeout: 20_000,
	});
}

async function openBlockInserter(page) {
	await page.getByRole('button', { name: /block inserter/i }).click();
}

async function insertBlock(page, blockName) {
	await openBlockInserter(page);
	const search = page.getByRole('searchbox');
	await expect(search).toBeVisible({ timeout: 5_000 });
	await search.fill(blockName);
	const option = page.getByRole('option', { name: new RegExp(blockName, 'i') }).first();
	await expect(option).toBeVisible({ timeout: 5_000 });
	await option.click();
}

test.describe('Motto Styler panel', () => {
	test('admin can access the block editor', async ({ page }) => {
		await waitForEditor(page);
	});

	test('Styler panel is visible when a Motto Container block is selected', async ({ page }) => {
		await waitForEditor(page);

		await insertBlock(page, 'Motto Container');

		// Block is selected immediately after insertion — no need to re-click
		await expect(canvasFrame(page).locator('[data-type="motto/container"]')).toBeVisible({
			timeout: 8_000,
		});

		// Open "Styles" tab if present (WP 6.5+)
		const stylesTab = page.getByRole('tab', { name: /styles/i });
		if (await stylesTab.isVisible({ timeout: 2_000 }).catch(() => false)) {
			await stylesTab.click();
		}

		await expect(page.locator('.motto-styler-panel')).toBeVisible({ timeout: 8_000 });
	});

	test('Styler panel renders class rule list', async ({ page }) => {
		await waitForEditor(page);

		await insertBlock(page, 'Motto Container');
		await expect(canvasFrame(page).locator('[data-type="motto/container"]')).toBeVisible({
			timeout: 8_000,
		});

		const stylesTab = page.getByRole('tab', { name: /styles/i });
		if (await stylesTab.isVisible().catch(() => false)) {
			await stylesTab.click();
		}

		const panel = page.locator('.motto-styler-panel');
		await expect(panel).toBeVisible({ timeout: 5_000 });

		// The panel body should contain at least one rule row or the add-class section
		const panelContent = panel.locator('.motto-panel-section');
		await expect(panelContent.first()).toBeVisible();
	});
});
