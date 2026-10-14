// Runs before every test file, before config/env.ts loads .env.dev. dotenv never
// overrides a variable that's already set, so these win over the developer's
// local settings and keep tests independent of them.
//
// The pre-launch site gate is usually ON in .env.dev; tests that exercise it
// (siteAccess.integration.test.ts) switch it on themselves.
process.env.SITE_ACCESS_REQUIRED = 'false';
