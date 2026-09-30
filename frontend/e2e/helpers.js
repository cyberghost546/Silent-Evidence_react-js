import { test as base, expect } from '@playwright/test'


// ---------------------------------------------------------------
// Shared bits for the browser tests.
//
// The test users are made by `manage.py e2e_seed` (backend/dashboard/
// management/commands/e2e_seed.py) - same password for all three:
//   e2e_reader, e2e_writer (wrote the seeded stories), e2e_admin
// ---------------------------------------------------------------
export const PASSWORD = 'E2e-Pass-2026!'

// `test` with one extra: before every page, tell the site "the age
// question, cookie banner and site tour were already answered" - so
// those pop-ups don't cover what a test wants to click.
export const test = base.extend({
    page: async ({ page }, use) => {
        await page.addInitScript(() => {
            localStorage.setItem('ageGate', 'passed')
            localStorage.setItem('cookieChoice', 'all')
            localStorage.setItem('siteTourSeen', 'yes')
        })
        await use(page)
    },
})

export { expect }

// Log in through the real Log In page, like a person would.
export async function logIn(page, username) {
    await page.goto('/login')
    await page.getByLabel('Email or username').fill(username)
    // exact: 'Password' alone would also match the "Show password" button.
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD)
    await page.getByRole('button', { name: 'Sign in' }).click()
    // Wait until the Log In page sends us on (it only does that once
    // Django said "yes"). Checking for a missing "Log In" link isn't
    // enough - the Log In page has no site header, so it's missing
    // straight away, before the login has finished.
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 })
}
