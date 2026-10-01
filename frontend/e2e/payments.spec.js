import { test, expect, logIn } from './helpers'


// Pro and tips. The test servers have no Stripe key, so the site uses
// its pretend payment page (FakePaymentPage.jsx) - no real money, no
// internet needed.

test('buy Pro with the test payment page', async ({ page }) => {
    await logIn(page, 'e2e_reader')
    await page.goto('/premium')
    await expect(page.getByText('Test mode')).toBeVisible()

    // The 1 month card's button (the first "Get Pro").
    await page.getByRole('button', { name: 'Get Pro' }).first().click()
    await expect(page.getByText('Pretend payment page - no real money')).toBeVisible()
    await page.getByRole('button', { name: 'Pay (fake)' }).click()

    await expect(page.getByText("You're Pro now. Welcome!")).toBeVisible()

    // Back on the Pro page it says until when.
    await page.goto('/premium')
    await expect(page.getByText(/You're Pro\s+until/)).toBeVisible()
})

test('light a candle for a writer, who sees it on their dashboard', async ({ page }) => {
    await logIn(page, 'e2e_reader')
    await page.goto('/search?q=mercer')
    await page.getByRole('link', { name: /The Mercer Lane House/ }).first().click()

    await page.getByRole('button', { name: 'Light a candle for e2e_writer' }).click()
    await page.getByRole('button', { name: '€5.00' }).click()
    await page.getByLabel('A note for e2e_writer (optional)').fill('Could not sleep!')
    await page.getByRole('button', { name: 'Light it - €5.00' }).click()

    await page.getByRole('button', { name: 'Pay (fake)' }).click()
    await expect(page.getByText('Your candle is lit for e2e_writer.')).toBeVisible()

    // The writer's side: 90% of €5 = €4.50, with the note.
    await page.context().clearCookies()
    await logIn(page, 'e2e_writer')
    await page.goto('/author')
    await expect(page.getByText('"Could not sleep!"')).toBeVisible()
    await expect(page.getByText('€4.50').first()).toBeVisible()
})

test('Pro early access: Pro readers first, everyone else later', async ({ page }) => {
    await logIn(page, 'e2e_writer')
    await page.goto('/write')
    await page.locator('#title').fill('First Come, First Scared')
    await page.locator('#category').selectOption({ index: 1 })
    await page.locator('#body').fill('Nobody else has read this yet. '.repeat(15))
    await page.getByLabel(/Pro early access/).check()
    await page.getByRole('button', { name: 'Publish Story' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'First Come, First Scared' })).toBeVisible()
    const storyUrl = page.url()

    // A visitor: the lock screen, no text.
    await page.context().clearCookies()
    await page.goto(storyUrl)
    await expect(page.getByText('Pro readers are reading this one first')).toBeVisible()
    await expect(page.getByText('Nobody else has read this yet.')).toHaveCount(0)

    // A Pro reader: the story.
    await logIn(page, 'e2e_pro')
    await page.goto(storyUrl)
    await expect(page.getByText('Nobody else has read this yet.').first()).toBeVisible()
})

test('Pro looks: a gold border and a coloured name on your profile', async ({ page }) => {
    await logIn(page, 'e2e_pro')
    await page.goto('/settings')
    await page.getByRole('button', { name: /Gold Crown/ }).click()
    await page.getByRole('button', { name: 'Ember' }).click()
    await page.getByRole('button', { name: 'Save Appearance' }).click()
    await expect(page.getByText('Appearance saved.')).toBeVisible()

    await page.goto('/profile/e2e_pro')
    const title = page.getByRole('heading', { level: 1 })
    await expect(title).toContainText('e2e_pro')
    await expect(title).toContainText('PRO')
    // Ember = Tailwind's amber-300.
    await expect(title.getByText('e2e_pro', { exact: true })).toHaveClass(/text-amber-300/)
    await page.screenshot({ path: 'test-results/pro-profile.png' })
})

test('free members see the Pro looks locked', async ({ page }) => {
    await logIn(page, 'e2e_writer')
    await page.goto('/settings')
    await expect(page.getByRole('button', { name: /Gold Crown/ })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Ember' })).toBeDisabled()
})

test('Writer Pro: the cover maker and "Where readers stop"', async ({ page }) => {
    await logIn(page, 'e2e_pro')
    await page.goto('/write')
    await page.locator('#title').fill('The Lighthouse Keeper Never Left')
    await page.locator('#category').selectOption({ index: 1 })
    await page.locator('#body').fill('The light still turns every night. '.repeat(15))

    await page.getByRole('button', { name: 'Blood moon' }).click()
    await page.getByRole('button', { name: 'Make my cover' }).click()
    // The made cover shows as the upload preview.
    await expect(page.getByAltText('Cover preview')).toBeVisible()
    await expect(page.getByText('cover.jpg')).toBeVisible()
    await page.getByAltText('Cover preview').screenshot({ path: 'test-results/made-cover.png' })

    await page.getByRole('button', { name: 'Publish Story' }).click()
    await expect(page.getByRole('heading', { level: 1, name: 'The Lighthouse Keeper Never Left' })).toBeVisible()

    // The Pro chart is on the Author Dashboard (no readers yet).
    await page.goto('/author')
    await expect(page.getByRole('heading', { name: 'Where readers stop' })).toBeVisible()
    await expect(page.getByText('Nobody has read this one yet.')).toBeVisible()
})

test('free writers see the Writer Pro tools as Pro features', async ({ page }) => {
    await logIn(page, 'e2e_writer')
    await page.goto('/write')
    await expect(page.getByText(/writers can make a cover in one click/)).toBeVisible()
    await page.goto('/author')
    await expect(page.getByText(/See the exact part of each story where readers give up/)).toBeVisible()
})
