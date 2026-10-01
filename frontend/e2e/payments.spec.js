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
