import { useEffect, useState } from 'react'
import { MoonStar } from 'lucide-react'


// ---------------------------------------------------------------
// AMBIENT MODE - an opt-in effect while reading:
//
//   1. The edges of the screen slowly go dark the further you read
//      (a black "vignette" on top of the page, getting stronger).
//   2. When a jump-scare mark (!!scare) scrolls into view, the story
//      text flickers once, like a failing light bulb.
//
// SAFETY: the flicker is 2 soft dips in about a second - under the
// WCAG limit of 3 flashes a second (flashing can cause seizures).
// And if the reader's computer is set to "reduce motion", there's no
// flicker at all - only the slow darkening.
//
// Usage (StoryPage):
//   <AmbientMode bodyRef={bodyRef} />   bodyRef = the story text box
// ---------------------------------------------------------------
const STORAGE_KEY = 'ambientMode'
const FLICKER_CLASS = 'ambient-flicker'   // the animation, in index.css

function loadChoice() {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'on'
    } catch {
        return false
    }
}

function AmbientMode({ bodyRef }) {
    const [on, setOn] = useState(loadChoice)
    // 0 = top of the story, 1 = the end.
    const [progress, setProgress] = useState(0)

    function toggle() {
        const next = !on
        setOn(next)
        try {
            localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off')
        } catch {
            // Can't remember it - it still works until you leave.
        }
    }

    // ---------- 1. how far through the story are we? ----------
    useEffect(() => {
        if (!on) return
        function measure() {
            const box = bodyRef.current?.getBoundingClientRect()
            if (!box) return
            // How much of the story has scrolled past the bottom of the screen.
            const read = (window.innerHeight - box.top) / box.height
            setProgress(Math.min(1, Math.max(0, read)))
        }
        measure()
        // passive: true = "I won't stop the scrolling" - lets the browser scroll smoothly.
        window.addEventListener('scroll', measure, { passive: true })
        return () => window.removeEventListener('scroll', measure)
    }, [on, bodyRef])

    // ---------- 2. flicker at jump-scare marks ----------
    useEffect(() => {
        const body = bodyRef.current
        if (!on || !body) return
        // matchMedia asks the browser about the reader's settings.
        if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
        if (!('IntersectionObserver' in window)) return

        // IntersectionObserver = "tell me when these elements come into
        // view" - cheaper than checking positions on every scroll.
        const seen = new Set()
        const observer = new IntersectionObserver(entries => {
            for (const entry of entries) {
                // Each mark flickers only once.
                if (entry.isIntersecting && !seen.has(entry.target)) {
                    seen.add(entry.target)
                    body.classList.remove(FLICKER_CLASS)
                    void body.offsetWidth   // restart the animation (a known browser trick)
                    body.classList.add(FLICKER_CLASS)
                }
            }
        }, { rootMargin: '0px 0px -40% 0px' })   // when the mark reaches 60% down the screen

        body.querySelectorAll('[data-scare-mark]').forEach(mark => observer.observe(mark))
        return () => {
            observer.disconnect()
            body.classList.remove(FLICKER_CLASS)
        }
    }, [on, bodyRef])

    return (
        <>
            <button
                type='button'
                onClick={toggle}
                aria-pressed={on}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${on ? 'border-indigo-500 bg-indigo-950/50 text-indigo-100' : 'border-slate-700 text-gray-300 hover:border-slate-500'}`}
            >
                <MoonStar className='h-4 w-4' />
                Ambient mode
            </button>

            {/* The darkening. pointer-events-none: clicks go straight
                through it to the page. From 10% to 55% darkness. */}
            {on && (
                <div
                    aria-hidden='true'
                    className='pointer-events-none fixed inset-0 z-30 transition-opacity duration-700'
                    style={{
                        opacity: 0.1 + progress * 0.45,
                        background: 'radial-gradient(ellipse at center, transparent 45%, black 100%)',
                    }}
                />
            )}
        </>
    )
}

export default AmbientMode
