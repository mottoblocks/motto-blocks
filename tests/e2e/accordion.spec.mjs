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

test.describe('Motto Accordion block', () => {
	test('fresh insert shows 2 working items by default', async ({ page }) => {
		await waitForEditor(page);
		await insertBlock(page, 'Motto Accordion');

		const frame = canvasFrame(page);
		await expect(frame.locator('[data-type="motto/accordion"]')).toBeVisible({ timeout: 8_000 });

		const items = frame.locator('[data-type="motto/accordion-item"]');
		const triggers = frame.locator('[data-type="motto/accordion-trigger"]');
		const panels = frame.locator('[data-type="motto/accordion-panel"]');

		await expect(items).toHaveCount(2, { timeout: 8_000 });
		await expect(triggers).toHaveCount(2, { timeout: 8_000 });
		await expect(panels).toHaveCount(2, { timeout: 8_000 });

		await expect(triggers.first().locator('[data-type="core/paragraph"]')).toHaveText(
			'Accordion item'
		);
	});

	test('clicking a trigger opens its panel; closeOtherItems off allows multiple open', async ({
		page,
	}) => {
		await waitForEditor(page);
		await insertBlock(page, 'Motto Accordion');

		const frame = canvasFrame(page);
		const triggers = frame.locator('[data-type="motto/accordion-trigger"]');
		await expect(triggers).toHaveCount(2, { timeout: 8_000 });

		await triggers.first().click();
		await expect(frame.locator('[data-type="motto/accordion-item"]').first()).toHaveClass(
			/is-open/
		);

		await triggers.nth(1).click();
		// closeOtherItems is off by default — both items should be open at once
		await expect(frame.locator('[data-type="motto/accordion-item"].is-open')).toHaveCount(2);
	});

	test('a trigger accepts an optional Motto SVG icon child', async ({ page }) => {
		await waitForEditor(page);
		await insertBlock(page, 'Motto Accordion');

		const frame = canvasFrame(page);
		const firstTrigger = frame.locator('[data-type="motto/accordion-trigger"]').first();
		await expect(firstTrigger).toBeVisible({ timeout: 8_000 });

		await firstTrigger.locator('p').click();
		await insertBlock(page, 'Motto SVG');

		await expect(firstTrigger.locator('[data-type="motto/svg"]')).toHaveCount(1, {
			timeout: 5_000,
		});
		await expect(firstTrigger.locator('[data-type="core/paragraph"]')).toHaveCount(1);
	});

	test('adding a 3rd accordion item via the appender works', async ({ page }) => {
		await waitForEditor(page);
		await insertBlock(page, 'Motto Accordion');

		const frame = canvasFrame(page);
		await expect(frame.locator('[data-type="motto/accordion-item"]')).toHaveCount(2, {
			timeout: 8_000,
		});

		await frame.getByRole('button', { name: /add motto accordion item/i }).click();

		await expect(frame.locator('[data-type="motto/accordion-item"]')).toHaveCount(3, {
			timeout: 8_000,
		});
		await expect(frame.locator('[data-type="motto/accordion-trigger"]')).toHaveCount(3, {
			timeout: 8_000,
		});
		await expect(frame.locator('[data-type="motto/accordion-panel"]')).toHaveCount(3, {
			timeout: 8_000,
		});
	});

	test('duplicating an accordion item keeps the copy with a unique itemId', async ({ page }) => {
		await waitForEditor(page);
		await insertBlock(page, 'Motto Accordion');

		const frame = canvasFrame(page);
		const firstItem = frame.locator('[data-type="motto/accordion-item"]').first();
		await expect(firstItem).toBeVisible({ timeout: 8_000 });
		await firstItem.locator('[data-type="motto/accordion-trigger"] p').click();
		await page.getByRole('button', { name: 'Motto Accordion Item', exact: true }).click();

		await page
			.getByRole('toolbar', { name: /block tools/i })
			.getByRole('button', { name: 'Options', exact: true })
			.click();
		await page.getByRole('menuitem', { name: /^Duplicate/i }).click();

		await expect(frame.locator('[data-type="motto/accordion-item"]')).toHaveCount(3, {
			timeout: 8_000,
		});
		await expect(frame.locator('[data-type="motto/accordion-trigger"]')).toHaveCount(3, {
			timeout: 8_000,
		});
		await expect(frame.locator('[data-type="motto/accordion-panel"]')).toHaveCount(3, {
			timeout: 8_000,
		});

		const itemIds = await frame
			.locator('[data-type="motto/accordion-item"]')
			.evaluateAll((els) => els.map((el) => el.getAttribute('data-item-id')));
		expect(new Set(itemIds).size).toBe(3);
	});

	test('a 3rd item survives publishing and reopening the editor', async ({ page }) => {
		await waitForEditor(page);
		await insertBlock(page, 'Motto Accordion');

		const frame = canvasFrame(page);
		await expect(frame.locator('[data-type="motto/accordion-item"]')).toHaveCount(2, {
			timeout: 8_000,
		});
		await frame.getByRole('button', { name: /add motto accordion item/i }).click();
		await expect(frame.locator('[data-type="motto/accordion-item"]')).toHaveCount(3, {
			timeout: 8_000,
		});

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

		await page.goto(`/wp-admin/post.php?post=${postIdMatch[1]}&action=edit`);
		await expect(canvasFrame(page).locator('.block-editor-iframe__body')).toBeVisible({
			timeout: 20_000,
		});

		const reopenedFrame = canvasFrame(page);
		await expect(reopenedFrame.locator('[data-type="motto/accordion-item"]')).toHaveCount(3, {
			timeout: 8_000,
		});
		await expect(reopenedFrame.locator('[data-type="motto/accordion-trigger"]')).toHaveCount(3, {
			timeout: 8_000,
		});
		await expect(reopenedFrame.locator('[data-type="motto/accordion-panel"]')).toHaveCount(3, {
			timeout: 8_000,
		});
	});
});
