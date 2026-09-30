import { defineConfig } from '@playwright/test'


// ---------------------------------------------------------------
// BROWSER TESTS (Playwright) - a real browser clicks through the site.
//
//   npm run test:e2e
//
// It starts its OWN servers, with its OWN database, so your data is
// never touched:
//   Django on port 8010, using backend/e2e.sqlite3 (made fresh every
//   run by `manage.py e2e_seed` - it refuses to touch any other DB)
//   Vite on port 5180, pointed at that Django
// Your normal dev servers (8000 / 5173) can keep running meanwhile.
//
// The tests are in e2e/. A failed test leaves a screenshot and a
// trace in test-results/ - open one with: npx playwright show-trace <file>
// ---------------------------------------------------------------
const DJANGO_PORT = 8010
const VITE_PORT = 5180

// The Python inside the project's venv (Windows keeps it somewhere else).
// On a CI server the venv isn't used - E2E_PYTHON=python there.
const PYTHON = process.env.E2E_PYTHON || (process.platform === 'win32' ? 'venv\\Scripts\\python' : 'venv/bin/python')

export default defineConfig({
    testDir: './e2e',
    // One test at a time: they share one database.
    workers: 1,
    fullyParallel: false,
    timeout: 30_000,
    // On a CI server, try a failing test once more (a slow machine can
    // make a good test fail once); on your computer, fail straight away.
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? 'github' : 'list',

    use: {
        baseURL: `http://localhost:${VITE_PORT}`,
        // Your installed Chrome on your computer; on CI the Chromium
        // that `npx playwright install chromium` downloads.
        channel: process.env.CI ? undefined : 'chrome',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },

    webServer: [
        {
            // Fresh database -> test data -> Django.
            command: `${PYTHON} manage.py migrate --verbosity 0 && ${PYTHON} manage.py e2e_seed && ${PYTHON} manage.py runserver ${DJANGO_PORT} --noreload`,
            cwd: '../backend',
            url: `http://localhost:${DJANGO_PORT}/api/categories/`,
            env: {
                DJANGO_SQLITE_NAME: 'e2e.sqlite3',
                FRONTEND_ORIGINS: `http://localhost:${VITE_PORT}`,
                SITE_URL: `http://localhost:${VITE_PORT}`,
            },
            reuseExistingServer: false,
            timeout: 120_000,
        },
        {
            command: `npx vite --port ${VITE_PORT} --strictPort`,
            url: `http://localhost:${VITE_PORT}`,
            env: { VITE_API_URL: `http://localhost:${DJANGO_PORT}` },
            reuseExistingServer: false,
            timeout: 120_000,
        },
    ],
})
