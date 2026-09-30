import { test, expect } from '@playwright/test';

const NEW_POST = '/wp-admin/post-new.php';

// Gutenberg 6.4+ renders the canvas inside an iframe (blob URL, name="editor-canvas")
const canvasFrame = (page) => page.frameLocator('iframe[name="editor-canvas"]');

async function waitForEditor(page) {
	await page.goto(NEW_POST);

	const welcomeDialog = page.getByRole('dialog', { name: /welcome to the editor/i });
	if (await welcomeDialog.isVisible({ timeout: 5_000 }).catch(() => false)) {
		await page.getByRole('button', { name: 'Close' }).click();
	}

	await expect(canvasFrame(page).locator('.block-editor-iframe__body')).toBeVisible({
		timeout: 20_000,
	});
}

async function insertBlock(page, blockName) {
	const search = page.getByRole('searchbox');
	if (!(await search.isVisible({ timeout: 500 }).catch(() => false))) {
		await page.getByRole('button', { name: 'Block Inserter', exact: true }).click();
	}
	await expect(search).toBeVisible({ timeout: 5_000 });
	await search.fill(blockName);
	const option = page.getByRole('option', { name: new RegExp(blockName, 'i') }).first();
	await expect(option).toBeVisible({ timeout: 5_000 });
	await option.click();
}

test.describe('Motto Tabs block', () => {
	test('fresh insert shows 2 working tabs by default', async ({ page }) => {
		await waitForEditor(page);
		await insertBlock(page, 'Motto Tabs');

		const frame = canvasFrame(page);
		await expect(frame.locator('[data-type="motto/tabs"]')).toBeVisible({ timeout: 8_000 });

		const buttons = frame.locator('[data-type="motto/tab-button"]');
		const panels = frame.locator('[data-type="motto/tab"]');

		// This is the reported bug: today a fresh insert renders 0 buttons/panels.
		await expect(buttons).toHaveCount(2, { timeout: 8_000 });
		await expect(panels).toHaveCount(2, { timeout: 8_000 });

		// Exactly one panel should be active (visible) by default.
		await expect(frame.locator('[data-type="motto/tab"].is-active')).toHaveCount(1);
	});

	test('clicking the second tab button activates its matching panel', async ({ page }) => {
		await waitForEditor(page);
		await insertBlock(page, 'Motto Tabs');

		const frame = canvasFrame(page);
		const buttons = frame.locator('[data-type="motto/tab-button"]');
		await expect(buttons).toHaveCount(2, { timeout: 8_000 });

		const secondButton = buttons.nth(1);
		const secondButtonTabId = await secondButton.getAttribute('data-tab-id');
		await secondButton.click();

		await expect(secondButton).toHaveClass(/is-active/);
		await expect(
			frame.locator(`[data-type="motto/tab"][data-tab-id="${secondButtonTabId}"]`)
		).toHaveClass(/is-active/);
		await expect(frame.locator('[data-type="motto/tab"].is-active')).toHaveCount(1);
	});

	test('a tab button accepts an optional Motto SVG icon child', async ({ page }) => {
		await waitForEditor(page);
		await insertBlock(page, 'Motto Tabs');

		const frame = canvasFrame(page);
		const firstButton = frame.locator('[data-type="motto/tab-button"]').first();
		await expect(firstButton).toBeVisible({ timeout: 8_000 });

		await firstButton.locator('p').click();
		await insertBlock(page, 'Motto SVG');

		await expect(firstButton.locator('[data-type="motto/svg"]')).toHaveCount(1, { timeout: 5_000 });
		// text child is still present alongside the icon
		await expect(firstButton.locator('[data-type="core/paragraph"]')).toHaveCount(1);
	});

	test('adding a 3rd tab button auto-creates its matching panel', async ({ page }) => {
		await waitForEditor(page);
		await insertBlock(page, 'Motto Tabs');

		const frame = canvasFrame(page);
		await expect(frame.locator('[data-type="motto/tab-button"]')).toHaveCount(2, {
			timeout: 8_000,
		});

		await frame.getByRole('button', { name: /add motto tab button/i }).click();

		await expect(frame.locator('[data-type="motto/tab-button"]')).toHaveCount(3, {
			timeout: 8_000,
		});
		await expect(frame.locator('[data-type="motto/tab"]')).toHaveCount(3, { timeout: 8_000 });
	});

	test('a new tab button starts with real "Tab" text, not an empty placeholder', async ({
		page,
	}) => {
		await waitForEditor(page);
		await insertBlock(page, 'Motto Tabs');

		const frame = canvasFrame(page);
		await expect(frame.locator('[data-type="motto/tab-button"]')).toHaveCount(2, {
			timeout: 8_000,
		});
		await frame.getByRole('button', { name: /add motto tab button/i }).click();

		const buttons = frame.locator('[data-type="motto/tab-button"]');
		await expect(buttons).toHaveCount(3, { timeout: 8_000 });
		await expect(buttons.nth(2).locator('[data-type="core/paragraph"]')).toHaveText('Tab');
	});

	test('duplicating a tab button keeps the copy and syncs a matching panel', async ({ page }) => {
		await waitForEditor(page);
		await insertBlock(page, 'Motto Tabs');

		const frame = canvasFrame(page);
		const firstButton = frame.locator('[data-type="motto/tab-button"]').first();
		await expect(firstButton).toBeVisible({ timeout: 8_000 });
		// Clicking the button hits its paragraph child (selects that, not the button itself);
		// the block breadcrumb's "Motto Tab Button" item selects the containing block instead.
		await firstButton.locator('[data-type="core/paragraph"]').click();
		await page.getByRole('button', { name: 'Motto Tab Button', exact: true }).click();

		await page
			.getByRole('toolbar', { name: /block tools/i })
			.getByRole('button', { name: 'Options', exact: true })
			.click();
		await page.getByRole('menuitem', { name: /^Duplicate/i }).click();

		await expect(frame.locator('[data-type="motto/tab-button"]')).toHaveCount(3, {
			timeout: 8_000,
		});
		await expect(frame.locator('[data-type="motto/tab"]')).toHaveCount(3, { timeout: 8_000 });

		// the duplicate must get its own unique tabId, not share the original's
		const tabIds = await frame
			.locator('[data-type="motto/tab-button"]')
			.evaluateAll((els) => els.map((el) => el.getAttribute('data-tab-id')));
		expect(new Set(tabIds).size).toBe(3);
	});

	test('a 3rd tab survives publishing and reopening the editor', async ({ page }) => {
		await waitForEditor(page);
		await insertBlock(page, 'Motto Tabs');

		const frame = canvasFrame(page);
		await expect(frame.locator('[data-type="motto/tab-button"]')).toHaveCount(2, {
			timeout: 8_000,
		});
		await frame.getByRole('button', { name: /add motto tab button/i }).click();
		await expect(frame.locator('[data-type="motto/tab-button"]')).toHaveCount(3, {
			timeout: 8_000,
		});
		await expect(frame.locator('[data-type="motto/tab"]')).toHaveCount(3, { timeout: 8_000 });

		// Dismiss any open panel before publishing (title field isn't required to publish).
		await page.keyboard.press('Escape');
		await page.getByRole('button', { name: 'Publish', exact: true }).click();
		const publishPanel = page.locator('.editor-post-publish-panel');
		await expect(publishPanel).toBeVisible({ timeout: 8_000 });
		await publishPanel.getByRole('button', { name: 'Publish', exact: true }).click();
		await expect(page.getByText(/is now live|published/i).first()).toBeVisible({
			timeout: 15_000,
		});

		const postIdMatch = page.url().match(/[?&]post=(\d+)/);
		expect(postIdMatch, 'expected a post id in the URL after publishing').toBeTruthy();

		// Reopen the editor for this same post — this is the reported bug: the 3rd tab used to
		// vanish here (WordPress re-applying motto/tabs' templateLock:"all" TEMPLATE on remount
		// silently truncated tab-container/tab-panels back to the template's literal 2 items).
		await page.goto(`/wp-admin/post.php?post=${postIdMatch[1]}&action=edit`);
		await expect(canvasFrame(page).locator('.block-editor-iframe__body')).toBeVisible({
			timeout: 20_000,
		});

		const reopenedFrame = canvasFrame(page);
		await expect(reopenedFrame.locator('[data-type="motto/tab-button"]')).toHaveCount(3, {
			timeout: 8_000,
		});
		await expect(reopenedFrame.locator('[data-type="motto/tab"]')).toHaveCount(3, {
			timeout: 8_000,
		});
	});
});
