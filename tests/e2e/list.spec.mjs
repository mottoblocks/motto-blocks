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
	const option = page.getByRole('option', { name: blockName, exact: true }).first();
	await expect(option).toBeVisible({ timeout: 5_000 });
	await option.click();
}

// Moves selection from text-editing mode up to the enclosing block (e.g. list-item -> selected
// list-item block), then further up to its parent via the toolbar's "Select parent block" button.
async function selectParentBlock(page, parentTitle) {
	await page.keyboard.press('Escape');
	await page
		.getByRole('button', { name: new RegExp(`^Select parent block: ${parentTitle}$`) })
		.click();
}

async function switchBlockType(page, currentTitle, targetTitle) {
	const toolbar = page.locator('.block-editor-block-toolbar').first();
	await toolbar.getByRole('button', { name: currentTitle, exact: true }).click();
	const menu = page.getByRole('menu', { name: currentTitle });
	await menu.getByRole('menuitem', { name: targetTitle, exact: true }).click();
}

// Playwright's synthetic "Home" key doesn't reliably move the caret to offset 0 inside a
// RichText span in this environment; repeated ArrowLeft does.
async function moveCaretToStart(page, text) {
	for (let i = 0; i < text.length; i++) {
		await page.keyboard.press('ArrowLeft');
	}
}

test.describe('Motto List block', () => {
	test('fresh insert shows 3 items with default bullet', async ({ page }) => {
		await waitForEditor(page);
		await insertBlock(page, 'Motto List');

		const frame = canvasFrame(page);
		await expect(frame.locator('[data-type="motto/list"]')).toBeVisible({ timeout: 8_000 });
		await expect(frame.locator('[data-type="motto/list-item"]')).toHaveCount(3, {
			timeout: 8_000,
		});
	});

	test('Enter creates a new sibling item, Backspace merges into previous', async ({ page }) => {
		await waitForEditor(page);
		await insertBlock(page, 'Motto List');

		const frame = canvasFrame(page);
		const items = frame.locator('[data-type="motto/list-item"]');
		await expect(items).toHaveCount(3, { timeout: 8_000 });

		await items.nth(2).locator('.motto-list-item__text').click();
		await page.keyboard.press('End');
		await page.keyboard.type(' more');
		await page.keyboard.press('Enter');
		await page.keyboard.type('Item 4');

		await expect(items).toHaveCount(4, { timeout: 8_000 });
		await expect(items.nth(3).locator('.motto-list-item__text')).toHaveText('Item 4');

		// Backspace at the very start of the new item merges it back into item 3.
		await moveCaretToStart(page, 'Item 4');
		await page.keyboard.press('Backspace');

		await expect(items).toHaveCount(3, { timeout: 8_000 });
		await expect(items.nth(2).locator('.motto-list-item__text')).toHaveText(
			'Item 3 moreItem 4'
		);
	});

	test('a nested Motto List can be inserted inside an item', async ({ page }) => {
		await waitForEditor(page);
		await insertBlock(page, 'Motto List');

		const frame = canvasFrame(page);
		const items = frame.locator('[data-type="motto/list-item"]');
		await expect(items).toHaveCount(3, { timeout: 8_000 });

		const firstItem = items.first();
		await firstItem.locator('.motto-list-item__text').click();
		await page.keyboard.press('Escape');

		// This block only allows one child type (motto/list), so the appender inserts it
		// directly on click without opening a search/picker popup.
		await firstItem.getByRole('button', { name: 'Add motto list' }).click();

		await expect(firstItem.locator('[data-type="motto/list"]')).toHaveCount(1, {
			timeout: 8_000,
		});
		await expect(
			firstItem.locator('[data-type="motto/list"] > [data-type="motto/list-item"]')
		).toHaveCount(3, { timeout: 8_000 });
	});

	test('a core List can be converted to Motto List (unordered)', async ({ page }) => {
		await waitForEditor(page);
		await insertBlock(page, 'List');

		const frame = canvasFrame(page);
		const coreList = frame.locator('[data-type="core/list"]');
		await expect(coreList).toBeVisible({ timeout: 8_000 });

		await coreList.locator('li').first().click();
		await page.keyboard.type('First item');
		await page.keyboard.press('Enter');
		await page.keyboard.type('Second item');

		await selectParentBlock(page, 'List');
		await switchBlockType(page, 'List', 'Motto List');

		const mottoList = frame.locator('[data-type="motto/list"]');
		await expect(mottoList).toBeVisible({ timeout: 8_000 });
		await expect(mottoList).toHaveAttribute('data-bullet-type', 'default');

		const items = mottoList.locator('[data-type="motto/list-item"]');
		await expect(items).toHaveCount(2, { timeout: 8_000 });
		await expect(items.nth(0).locator('.motto-list-item__text')).toHaveText('First item');
		await expect(items.nth(1).locator('.motto-list-item__text')).toHaveText('Second item');
	});

	test('an ordered core List converts to Motto List with a counter bullet', async ({ page }) => {
		await waitForEditor(page);
		await insertBlock(page, 'List');

		const frame = canvasFrame(page);
		const coreList = frame.locator('[data-type="core/list"]');
		await expect(coreList).toBeVisible({ timeout: 8_000 });
		await coreList.locator('li').first().click();
		await page.keyboard.type('Only item');

		await selectParentBlock(page, 'List');
		await page
			.locator('.block-editor-block-toolbar')
			.first()
			.getByRole('button', { name: 'Ordered', exact: true })
			.click();

		await switchBlockType(page, 'List', 'Motto List');

		const mottoList = frame.locator('[data-type="motto/list"]');
		await expect(mottoList).toBeVisible({ timeout: 8_000 });
		await expect(mottoList).toHaveAttribute('data-bullet-type', 'counter');
		await expect(mottoList).toHaveAttribute('data-counter-style', 'decimal');
	});

	test('a Motto List can be converted back to core List', async ({ page }) => {
		await waitForEditor(page);
		await insertBlock(page, 'Motto List');

		const frame = canvasFrame(page);
		const items = frame.locator('[data-type="motto/list-item"]');
		await expect(items).toHaveCount(3, { timeout: 8_000 });

		await items.first().locator('.motto-list-item__text').click();
		await selectParentBlock(page, 'Motto List');
		await switchBlockType(page, 'Motto List', 'List');

		const coreList = frame.locator('[data-type="core/list"]');
		await expect(coreList).toBeVisible({ timeout: 8_000 });
		await expect(coreList.locator('[data-type="core/list-item"]')).toHaveCount(3, {
			timeout: 8_000,
		});
	});
});
