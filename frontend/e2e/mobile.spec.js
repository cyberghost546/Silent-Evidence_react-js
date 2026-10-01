import { test, expect, logIn } from './helpers'


// ---------------------------------------------------------------
// PHONES: every page at phone width.
//
// Two checks per page:
//   1. Nothing sticks out sideways. If anything is wider than the
//      screen, the whole page can be dragged left and right - the
//      most common "broken on mobile" bug.
//      (document.documentElement.scrollWidth = how wide the page
//      REALLY is; window.innerWidth = how wide the screen is.)
//   2. In the header, the logo and the icons don't overlap.
//
// expect.soft = note the failure but KEEP GOING, so one run lists
// every broken page instead of stopping at the first one.
//
// A screenshot of every page lands in test-results/mobile/ - handy
// to flick through.
// ---------------------------------------------------------------

// 360 = a small Android phone, 390 = an iPhone 12-16.
const PHONES = [
    { name: 'small', width: 360, height: 780 },
    { name: 'iphone', width: 390, height: 844 },
]

// The pages anyone (or any member) can open.
const MEMBER_PAGES = [
    '/', '/explore/latest', '/explore/timeline', '/search?q=house', '/category/amnesia-horror',
    '/premium', '/leaderboard', '/challenges', '/bundles', '/chains', '/videos', '/villains',
    '/sprints', '/read-alongs', '/map', '/offline-library', '/true-stories', '/forums',
    '/guide', '/about', '/privacy', '/contact',
    '/write', '/author', '/settings', '/feed', '/lists', '/history', '/my-stories',
    '/invites', '/support', '/messages', '/notifications', '/profile',
    '/profile/e2e_writer',
]

// A few admin pages (the dashboard has its own sidebar layout).
const ADMIN_PAGES = [
    '/dashboard', '/dashboard/users', '/dashboard/stories', '/dashboard/reports',
    '/dashboard/revenue', '/dashboard/premium', '/dashboard/site-settings',
    '/dashboard/blocklist', '/dashboard/login-map',
]


// Is anything wider than the screen? Answers the page width, and
// up to 3 elements that stick out (to know WHAT to fix).
async function sideways(page) {
    return page.evaluate(() => {
        const screenWidth = window.innerWidth
        const tooWide = []
        for (const element of document.querySelectorAll('body *')) {
            const box = element.getBoundingClientRect()
            if (box.right > screenWidth + 1 && box.width > 0 && tooWide.length < 3) {
                tooWide.push(`${element.tagName.toLowerCase()}.${String(element.className).slice(0, 60)}`)
            }
        }
        return { pageWidth: document.documentElement.scrollWidth, screenWidth, tooWide }
    })
}

// Do the logo and the first header icon overlap?
// (Log In / Sign Up have no site header - nothing to check there.)
async function headerOverlap(page) {
    if (await page.locator('header').count() === 0) return 0
    const logo = await page.locator('header a', { hasText: 'Silent Evidence' }).first().boundingBox()
    // The icons/buttons on the right: the first one is the leftmost.
    const rightSide = await page.locator('header > div').last().boundingBox()
    if (!logo || !rightSide) return 0
    // How many pixels the logo runs into the icons (0 = fine).
    return Math.max(0, Math.round(logo.x + logo.width - rightSide.x))
}


async function checkPages(page, phone, pages) {
    await page.setViewportSize({ width: phone.width, height: phone.height })
    for (const path of pages) {
        await page.goto(path)
        // Give the page time to load its data from Django.
        await page.waitForLoadState('networkidle')
        const name = path.replace(/[/?=]+/g, '_') || 'home'
        await page.screenshot({ path: `test-results/mobile/${phone.name}${name}.png` })

        const result = await sideways(page)
        expect.soft(result.pageWidth, `${path} at ${phone.width}px sticks out sideways: ${result.tooWide.join(' | ')}`)
            .toBeLessThanOrEqual(result.screenWidth)

        if (!path.startsWith('/dashboard')) {
            expect.soft(await headerOverlap(page), `${path} at ${phone.width}px: the logo runs into the header icons`).toBe(0)
        }
    }
}


for (const phone of PHONES) {
    test(`member pages fit a ${phone.width}px phone`, async ({ page }) => {
        // Lots of pages - give it more than the usual 30 seconds.
        test.setTimeout(240_000)
        await logIn(page, 'e2e_writer')
        await checkPages(page, phone, MEMBER_PAGES)

        // A story page (found through search, like a reader would).
        await page.goto('/search?q=mercer')
        await page.getByRole('link', { name: /The Mercer Lane House/ }).first().click()
        await checkPages(page, phone, [new URL(page.url()).pathname])
    })

    test(`visitor pages fit a ${phone.width}px phone`, async ({ page }) => {
        test.setTimeout(120_000)
        await checkPages(page, phone, ['/', '/login', '/signup', '/premium', '/forgot-password'])
    })

    test(`admin pages fit a ${phone.width}px phone`, async ({ page }) => {
        test.setTimeout(120_000)
        await logIn(page, 'e2e_admin')
        await checkPages(page, phone, ADMIN_PAGES)
    })
}
