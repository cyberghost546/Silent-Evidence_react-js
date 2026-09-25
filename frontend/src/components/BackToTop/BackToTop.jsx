import { useState, useEffect } from 'react'
import { ArrowUp } from 'lucide-react'


// Show the button once you've scrolled this far down (in pixels).
const SHOW_AFTER = 400


// ---------------------------------------------------------------
// The round red "back to top" button in the bottom-right corner.
//
// It's in SiteLayout, so EVERY public page gets it - no need to add
// it page by page. It hides itself near the top of the page.
//
// Usage:
//   <BackToTop />
// ---------------------------------------------------------------
function BackToTop() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        // window.scrollY = how far down the page we are right now.
        function handleScroll() {
            setVisible(window.scrollY > SHOW_AFTER)
        }

        // { passive: true } tells the browser we'll never cancel the
        // scroll, so it can keep scrolling smooth.
        window.addEventListener('scroll', handleScroll, { passive: true })

        // Cleanup - same reason as in useDropdown: without it, every
        // page visit would add one more listener.
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    function scrollToTop() {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // Not scrolled far enough - draw nothing at all.
    if (!visible) return null

    return (
        // fixed = stays in the same spot on the SCREEN while the page
        // scrolls under it. z-40 keeps it above the page content.
        <button
            type='button'
            onClick={scrollToTop}
            aria-label='Back to top'
            className='fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-900/50 transition hover:-translate-y-0.5 hover:bg-red-700'
        >
            <ArrowUp className='h-6 w-6' />
        </button>
    )
}

export default BackToTop
