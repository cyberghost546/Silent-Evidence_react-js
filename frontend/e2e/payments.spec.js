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
