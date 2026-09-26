import { useState } from 'react'
import { Search } from 'lucide-react'


// ---------------------------------------------------------------
// The big search box:
//
//   ╭──────────────────────────────────────────────────────────╮
//   │ ╭──────────────────────────────────────────────────────╮ │
//   │ │ 🔍 Search stories, authors, tags...       [ Search ] │ │
//   │ ╰──────────────────────────────────────────────────────╯ │
//   │ TRY  (Paranormal) (Creepy) (Based on true events) ...    │
//   ╰──────────────────────────────────────────────────────────╯
//
// Usage:
//   <SearchBox onSearch={words => ...} />
//
//   Start with some text already in the box:
//   <SearchBox startText='house' onSearch={...} />
//
//   Other "try" buttons (or none: suggestions={[]}):
//   <SearchBox suggestions={['Ghosts', 'Cursed']} onSearch={...} />
//
// The box keeps what you're typing itself. It only tells the parent
// when you press Search (or Enter, or click a "try" word):
//   onSearch('the words') - the parent decides what happens then
//   (the Search page puts them in the URL; a homepage could jump
//   to /search?q=...).
// ---------------------------------------------------------------

const DEFAULT_SUGGESTIONS = ['Paranormal', 'Creepy', 'Based on true events', 'Supernatural']

function SearchBox({ onSearch, startText = '', suggestions = DEFAULT_SUGGESTIONS, autoFocus = false }) {
    const [text, setText] = useState(startText)

    // At least 2 letters (the same rule as Django's SearchView).
    const canSearch = text.trim().length >= 2

    function handleSubmit(event) {
        // Stop the browser reloading the page (a form's default).
        event.preventDefault()
        if (canSearch) onSearch(text.trim())
    }

    // Clicking a "try" word: put it in the box AND search right away.
    function trySuggestion(word) {
        setText(word)
        onSearch(word)
    }

    return (
        // ---------- THE OUTER CARD ----------
        // rounded-3xl = very round corners. The red border is thin
        // and a bit see-through (/70), so it glows instead of shouting.
        // p-4 on phones, p-6 from the "sm" size up.
        <div className='rounded-3xl border border-red-700/70 bg-[#020617] p-4 sm:p-6'>

            {/* ---------- THE PILL: icon + input + button ---------- */}
            {/* role='search' tells screen readers this is a search form.
                focus-within: = "when anything INSIDE me has focus" -
                the whole pill lights up while you type in the input. */}
            <form
                role='search'
                onSubmit={handleSubmit}
                className='flex items-center gap-3 rounded-full border border-red-800/80 bg-slate-900 py-2 pl-4 pr-2 transition-colors focus-within:border-red-500 sm:pl-6'
            >
                <Search className='h-5 w-5 shrink-0 text-red-400' aria-hidden='true' />

                {/* flex-1 = the input takes all the space between the
                    icon and the button. bg-transparent + no border:
                    the PILL is the box you see, not the input.
                    focus:outline-none removes the browser's own ring
                    (the pill's border shows focus instead). */}
                <input
                    type='search'
                    value={text}
                    onChange={event => setText(event.target.value)}
                    placeholder='Search stories, authors, tags...'
                    aria-label='Search'
                    autoFocus={autoFocus}
                    className='min-w-0 flex-1 bg-transparent py-2 text-white placeholder:text-slate-500 focus:outline-none'
                />

                {/* Always bright red (like the design). With fewer than
                    2 letters, handleSubmit simply does nothing. */}
                <button
                    type='submit'
                    className='shrink-0 rounded-full bg-red-600 px-5 py-2.5 font-bold text-white transition-colors hover:bg-red-700 sm:px-6'
                >
                    Search
                </button>
            </form>

            {/* ---------- "TRY" WORDS ---------- */}
            {suggestions.length > 0 && (
                // flex-wrap: on a phone the chips go onto a second line.
                <div className='mt-4 flex flex-wrap items-center gap-2'>
                    {/* tracking-[0.3em] = wide gaps between the letters: T R Y */}
                    <span className='mr-2 text-xs uppercase tracking-[0.3em] text-gray-500'>Try</span>

                    {suggestions.map(word => (
                        <button
                            key={word}
                            type='button'
                            onClick={() => trySuggestion(word)}
                            className='rounded-full border border-slate-700 px-4 py-1.5 text-sm text-gray-400 transition-colors hover:border-red-700 hover:text-white'
                        >
                            {word}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

export default SearchBox
