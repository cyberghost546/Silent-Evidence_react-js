import { test, expect } from './helpers'


// Reading, as a visitor (not logged in).

test('a visitor can find a story and read it', async ({ page }) => {
    await page.goto('/search?q=mercer house')
    await page.getByRole('link', { name: /The Mercer Lane House/ }).first().click()
    await expect(page.getByRole('heading', { level: 1, name: 'The Mercer Lane House' })).toBeVisible()
    await expect(page.getByText('The house at the end of Mercer Lane').first()).toBeVisible()
})

test('jump-scare warnings and Easy read', async ({ page }) => {
    await page.goto('/search?q=mercer')
    await page.getByRole('link', { name: /The Mercer Lane House/ }).first().click()

    // The story has one marked jump scare - hidden until you ask.
    await expect(page.getByText('This story has 1 jump scare.')).toBeVisible()
    await expect(page.getByText('Jump scare ahead')).toHaveCount(0)
    await page.getByLabel('Warn me before each one').check()
    await expect(page.getByText('Jump scare ahead')).toBeVisible()

    // Easy read switches the text to the dyslexia-friendly style.
    await page.getByRole('button', { name: 'Easy read' }).click()
    await expect(page.locator('.easy-read')).toBeVisible()
})

test('a choose-your-path story follows your choices', async ({ page }) => {
    await page.goto('/search?q=cellar door')
    await page.getByRole('link', { name: /The Cellar Door/ }).first().click()
    await expect(page.getByText('Something scratches below.')).toBeVisible()

    await page.getByRole('button', { name: 'Open the door' }).click()
    await expect(page.getByText('The stairs go down too far.')).toBeVisible()
    await expect(page.getByText('~ The End ~')).toBeVisible()

    // exact: /Back/ would also match the "Back to top" button.
    await page.getByRole('button', { name: 'Back', exact: true }).click()
    await page.getByRole('button', { name: 'Run upstairs' }).click()
    await expect(page.getByText('You lock the bathroom door.')).toBeVisible()
})

test('pages that need a login send visitors to Log In', async ({ page }) => {
    await page.goto('/write')
    await expect(page).toHaveURL(/\/login$/)
})
