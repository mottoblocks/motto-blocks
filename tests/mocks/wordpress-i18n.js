// Test-only stand-in for @wordpress/i18n, which isn't installed as a real
// package — WordPress provides it as the wp.i18n global at runtime, and Vite
// externalizes it for the build. Vitest has no such global, so aliasing it
// here (see vite.config.mjs) lets modules that call __()/sprintf() etc. be
// unit-tested without a WordPress environment.
export const __ = (text) => text;
export const _x = (text) => text;
export const _n = (single, plural, number) => (Number(number) === 1 ? single : plural);
export const _nx = (single, plural, number) => (Number(number) === 1 ? single : plural);
export const sprintf = (format, ...args) => {
	let i = 0;
	return String(format).replace(/%(\d+\$)?[sd]/g, () => args[i++]);
};
