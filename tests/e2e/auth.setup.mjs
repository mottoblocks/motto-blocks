import { test as setup } from '@playwright/test';
import { mkdirSync } from 'fs';

const authFile = 'tests/e2e/.auth/admin.json';

setup('authenticate as e2e admin', async ({ page }) => {
	mkdirSync('tests/e2e/.auth', { recursive: true });

	await page.goto('/wp-login.php');
	await page.fill('#user_login', 'e2e_admin');
	await page.fill('#user_pass', 'e2e_pass_local');
	await page.click('#wp-submit');
	await page.waitForURL('**/wp-admin/**');

	await page.context().storageState({ path: authFile });
});
