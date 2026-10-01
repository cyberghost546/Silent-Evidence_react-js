import { useState } from 'react'
import { ChevronDown } from 'lucide-react'


// ---------------------------------------------------------------
// ONE CARD OF THE WRITE PAGE, that folds open and shut:
//
//   ╭──────────────────────────────────────────╮
//   │ Details                               ⌄ │  <- tap to open/close
//   │ Series, place, mood, rating, tags       │
//   ├──────────────────────────────────────────┤
//   │ ...the inputs...                        │
//   ╰──────────────────────────────────────────╯
//
// Usage:
//   <FormSection title='Details' subtitle='Series, place, mood...'>
//       ...inputs...
//   </FormSection>
//
//   Always open at the start, on every screen (for required fields):
//   <FormSection title='The basics' startOpen>
//
//   Force it open, e.g. when Django says a field inside is wrong -
//   otherwise the error would be hidden in a closed card:
//   <FormSection title='Publishing' forceOpen={Boolean(errors.publish_at)}>
//
// Why fold at all? On a phone the Write page was one enormous form
// (around 30 inputs). Folding the OPTIONAL parts away keeps it short,
// and you open only what you need - like settings in a phone app.
// ---------------------------------------------------------------


// Is the screen at least "sm" (640px) wide? Then there's room, and
// optional cards start OPEN. matchMedia asks the browser the same
// question a CSS @media rule does.
//
// ?. ("optional chaining"): if matchMedia doesn't exist (the test
// runner's fake browser doesn't have it), don't crash - and ?? true
// then says "treat it as wide", so every card starts open.
function isWideScreen() {
    return window.matchMedia?.('(min-width: 640px)').matches ?? true
}


function FormSection({ title, subtitle, startOpen = false, forceOpen = false, children }) {
    // The function form of useState: only checked on the first render.
    const [open, setOpen] = useState(() => startOpen || isWideScreen())

    // forceOpen wins: the card can't be closed while it has an error.
    const isOpen = open || forceOpen

    return (
        <section className='rounded-3xl border border-white/10 bg-slate-900/60'>
            {/* The header is one big button.
                aria-expanded tells screen readers if it's open. */}
            <button
                type='button'
                onClick={() => setOpen(!isOpen)}
                aria-expanded={isOpen}
                className='flex w-full items-center gap-3 px-5 py-4 text-left'
            >
                <span className='min-w-0 flex-1'>
                    <span className='block text-base font-bold text-white'>{title}</span>
                    {subtitle && <span className='block truncate text-xs text-gray-500'>{subtitle}</span>}
                </span>

                {/* The arrow flips upside down when open. */}
                <ChevronDown className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* The inputs. Only on the page while open - so the map in
                "Details" doesn't even load until you open that card.
                space-y-6 = the same gap between every input. */}
            {isOpen && (
                <div className='space-y-6 border-t border-white/5 px-5 pt-5 pb-6'>
                    {children}
                </div>
            )}
        </section>
    )
}

export default FormSection
