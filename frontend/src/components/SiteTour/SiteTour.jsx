import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { X, Skull, ArrowRight, ArrowLeft } from 'lucide-react'
import { TOUR_STEPS } from './tourSteps'
import styles from './SiteTour.module.css'


// ---------------------------------------------------------------
// THE SITE GUIDE TOUR - a small pop-up card that walks you through
// the site, one step at a time:
//
//   ╭──────────────────────────────────╮
//   │ Site Guide                     × │
//   │ Step 1 of 9                      │
//   │▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  <- red progress bar
//   │ (💀)  ╭─────────────────────────╮ │
//   │       │ Welcome to ...          │ │  <- the skull "talks"
//   │       │ You've entered the ...  │ │
//   │       ╰─────────────────────────╯ │
//   │        ● • • • • • • • •  [Next →]│
//   │           Skip tutorial           │
//   ╰──────────────────────────────────╯
//
// Usage (the parent decides WHEN it's open):
//   {tourOpen && <SiteTour onClose={() => setTourOpen(false)} />}
//
// Keys: → next, ← back, Esc close.
// The steps themselves are in tourSteps.js.
//
// It sits in the bottom-right corner WITHOUT covering the page, so
// you can still see (and click) what a step is talking about.
// ---------------------------------------------------------------

// The key in localStorage that remembers "this visitor has seen
// the tour" - so it only opens by itself ONCE (see Header.jsx).
export const TOUR_SEEN_KEY = 'siteTourSeen'


// Remember that the tour was seen. try/catch: localStorage can
// throw in some private-browsing modes.
function markTourSeen() {
    try {
        localStorage.setItem(TOUR_SEEN_KEY, 'yes')
    } catch {
        // Not saved - the tour may show once more next visit. Fine.
    }
}


function SiteTour({ onClose }) {
    // Which step we're on: 0 = the first one.
    const [step, setStep] = useState(0)

    const total = TOUR_STEPS.length
    const current = TOUR_STEPS[step]
    const isFirst = step === 0
    const isLast = step === total - 1

    // Closing (X, Skip, Finish, Esc) always counts as "seen".
    function close() {
        markTourSeen()
        onClose()
    }

    function next() {
        if (isLast) {
            close()
        } else {
            setStep(step + 1)
        }
    }

    function back() {
        if (!isFirst) setStep(step - 1)
    }

    // Keyboard: → next, ← back, Esc close.
    //
    // Notice: NO [ ] list at the end of this useEffect. That means
    // "run after EVERY render". next() and back() use `step`, and a
    // listener made once would remember the step from back THEN
    // forever. Replacing it after every render keeps it up to date.
    // (Cheap: it's one listener.)
    useEffect(() => {
        function handleKey(event) {
            // Typing in a box somewhere on the page? Then the arrow
            // keys move the text cursor - leave them alone.
            const tag = event.target.tagName
            if (tag === 'INPUT' || tag === 'TEXTAREA') return

            if (event.key === 'Escape') close()
            if (event.key === 'ArrowRight') next()
            if (event.key === 'ArrowLeft') back()
        }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    })

    // How far along we are, for the red bar: step 1 of 9 = 11%.
    const progress = ((step + 1) / total) * 100

    return (
        // ---------- THE CARD ----------
        // fixed bottom-4 right-4 = stuck to the bottom-right corner of
        // the window. On phones: left-4 too, so it's full width.
        // z-50 = above the page. styles.card = slides up when it opens.
        // role='dialog' tells screen readers it's a pop-up.
        <div
            role='dialog'
            aria-label='Site Guide tour'
            className={`${styles.card} fixed bottom-[calc(var(--tabbar-space)+1rem)] left-4 right-4 z-50 overflow-hidden rounded-2xl border border-red-900/70 bg-slate-900 shadow-2xl shadow-black/60 sm:left-auto sm:w-[26rem]`}
        >
            {/* ---------- TOP: title, step count, close ---------- */}
            <div className='flex items-start justify-between bg-slate-800/60 px-5 pb-3 pt-4'>
                <div>
                    <p className='font-bold text-red-400'>Site Guide</p>
                    {/* aria-live: screen readers read the new step
                        number out loud when it changes. */}
                    <p className='text-sm text-gray-400' aria-live='polite'>
                        Step {step + 1} of {total}
                    </p>
                </div>
                <button type='button' onClick={close} aria-label='Close the tour' className='p-1 text-gray-500 hover:text-white'>
                    <X className='h-5 w-5' />
                </button>
            </div>

            {/* ---------- PROGRESS BAR ---------- */}
            {/* The grey track, with a red bar inside it. The red bar's
                width is set with style={{ }} because the number
                changes - Tailwind classes can't be made up while the
                page runs. transition-all animates the width change. */}
            <div className='h-1 bg-red-950'>
                <div className='h-full bg-red-600 transition-all duration-300' style={{ width: `${progress}%` }} />
            </div>

            {/* ---------- THE SKULL + SPEECH BUBBLE ---------- */}
            <div className='flex gap-4 px-5 py-5'>
                <span className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-red-900 bg-red-800'>
                    <Skull className='h-6 w-6 text-slate-950' />
                </span>

                {/* key={step}: a NEW bubble for every step, so the
                    fade-in animation (styles.bubble) plays again each
                    time you press Next. */}
                <div key={step} className={`${styles.bubble} flex-1 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3`}>
                    <p className='text-sm font-bold text-red-400'>{current.title}</p>
                    <p className='mt-1 leading-7 text-gray-200'>{current.text}</p>

                    {/* "Try it" link, when the step has one.
                        onClick={close}: going to that page ends the tour. */}
                    {current.link && (
                        <Link
                            to={current.link.to}
                            onClick={close}
                            className='mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-red-400 hover:text-red-300'
                        >
                            {current.link.label}
                            <ArrowRight className='h-4 w-4' />
                        </Link>
                    )}
                </div>
            </div>

            {/* ---------- BOTTOM: back, dots, next ---------- */}
            <div className='flex items-center justify-between gap-3 border-t border-slate-800 px-5 py-4'>
                {/* Back - invisible (but still taking up its space) on
                    the first step, so the dots don't jump sideways. */}
                <button
                    type='button'
                    onClick={back}
                    disabled={isFirst}
                    aria-label='Previous step'
                    className='rounded-lg p-2 text-gray-400 hover:text-white disabled:invisible'
                >
                    <ArrowLeft className='h-4 w-4' />
                </button>

                {/* One dot per step. The current one is a red pill.
                    Clicking a dot jumps to that step. */}
                <div className='flex items-center gap-1.5'>
                    {TOUR_STEPS.map((item, index) => (
                        <button
                            key={item.title}
                            type='button'
                            onClick={() => setStep(index)}
                            aria-label={`Go to step ${index + 1}`}
                            // aria-current: tells screen readers which dot is "now".
                            aria-current={index === step ? 'step' : undefined}
                            className={`h-2 rounded-full transition-all ${
                                index === step ? 'w-5 bg-red-500' : 'w-2 bg-slate-600 hover:bg-slate-400'
                            }`}
                        />
                    ))}
                </div>

                <button
                    type='button'
                    onClick={next}
                    className='flex items-center gap-1.5 rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-600'
                >
                    {isLast ? 'Finish' : 'Next'}
                    <ArrowRight className='h-4 w-4' />
                </button>
            </div>

            {/* ---------- SKIP ---------- */}
            {!isLast && (
                <button type='button' onClick={close} className='mb-4 block w-full text-center text-sm text-gray-500 hover:text-gray-300'>
                    Skip tutorial
                </button>
            )}
        </div>
    )
}

export default SiteTour
