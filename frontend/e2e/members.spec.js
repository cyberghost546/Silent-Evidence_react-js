import { test, expect, logIn } from './helpers'


// Things members do - each test logs in through the real Log In page.

test('write and publish a story, then edit it (with version history)', async ({ page }) => {
    await logIn(page, 'e2e_writer')
    await page.goto('/write')
    await page.locator('#title').fill('A Knock at 3am')
    await page.locator('#category').selectOption({ index: 1 })
    await page.locator('#body').fill('Three knocks. Then nothing. Then three more, closer. '.repeat(10))
    await page.getByRole('button', { name: 'Publish Story' }).click()

    await expect(page.getByRole('heading', { level: 1, name: 'A Knock at 3am' })).toBeVisible()

    // Edit it: the old text goes into the history.
    await page.getByRole('link', { name: 'Edit', exact: true }).click()
    await page.locator('#edit-title').fill('A Knock at 4am')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByText('Saved. The previous version is in the history.')).toBeVisible()
    await expect(page.locator('aside').getByText('"A Knock at 3am"')).toBeVisible()
})

test('make a reading list from a story and share it', async ({ page }) => {
    await logIn(page, 'e2e_reader')
    await page.goto('/search?q=mercer')
    await page.getByRole('link', { name: /The Mercer Lane House/ }).first().click()

    await page.getByRole('button', { name: 'Actions' }).click()
    await page.getByRole('menuitem', { name: 'Add to reading list' }).click()
    await page.getByLabel('New list name').fill('Houses to avoid')
    await page.getByRole('button', { name: 'Make list' }).click()
    await expect(page.getByRole('button', { name: /Houses to avoid/ })).toHaveAttribute('aria-pressed', 'true')

    // The list's own page - what a friend would see.
    await page.goto('/lists')
    await page.getByRole('link', { name: /Houses to avoid/ }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'Houses to avoid' })).toBeVisible()
    await expect(page.getByText('The Mercer Lane House')).toBeVisible()
})

test('nominate and vote for the Villain of the Week', async ({ page }) => {
    await logIn(page, 'e2e_reader')
    await page.goto('/villains/nominate')
    await page.getByLabel('The villain').fill('The Scratcher')
    await page.getByRole('button', { name: 'Nominate' }).click()
    await expect(page.getByText('The Scratcher')).toBeVisible()
    // Nominating gives it your vote.
    await expect(page.getByRole('button', { name: '✓ Your vote' })).toBeVisible()
})

test('members cannot open the admin dashboard', async ({ page }) => {
    await logIn(page, 'e2e_reader')
    await page.goto('/dashboard')
    await expect(page.getByText('Only admins can see this page.')).toBeVisible()
})

test('admins can open the Reports page', async ({ page }) => {
    await logIn(page, 'e2e_admin')
    await page.goto('/dashboard/reports')
    await expect(page.getByRole('heading', { level: 1, name: /Reports/ })).toBeVisible()
})
