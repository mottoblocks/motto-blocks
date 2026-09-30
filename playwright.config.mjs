import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './tests/e2e',
	fullyParallel: false,
	retries: 1,
	reporter: 'list',
	use: {
		baseURL: 'http://greenwood.local/',
		trace: 'on-first-retry',
		video: 'on-first-retry',
	},
	projects: [
		{
			name: 'setup',
			testMatch: /auth\.setup\.mjs/,
		},
		{
			name: 'chromium',
			use: {
				...devices['Desktop Chrome'],
				storageState: 'tests/e2e/.auth/admin.json',
				viewport: { width: 1440, height: 900 },
			},
			dependencies: ['setup'],
		},
	],
});
