import { useState } from 'react'
import { Search, ArrowRight, X, Clock, TrendingUp } from 'lucide-react'


// ---------------------------------------------------------------
// The search box, in the style of social apps (Instagram, X):
//
//   ╭─────────────────────────────────────╮
//   │ 🔍 Search stories, authors...  ✕ → │   Cancel   <- phones, in
//   ╰─────────────────────────────────────╯               the pop-up
//
//   RECENT                              Clear all
//   🕒 haunted house                         ✕
//   🕒 raven                                 ✕
//
//   TRENDING
//   (Paranormal) (Creepy) (Based on true events) ...
//
// Usage:
//   <SearchBox onSearch={words => ...} />
//
//   Start with some text already in the box:
//   <SearchBox startText='house' onSearch={...} />
//
//   Other "trending" buttons (or none: suggestions={[]}):
//   <SearchBox suggestions={['Ghosts', 'Cursed']} onSearch={...} />
//
//   With a Cancel button (phones only) - the pop-up search uses it:
//   <SearchBox onSearch={...} onCancel={() => setOpen(false)} />
//
// The box keeps what you're typing itself. It only tells the parent
// when you search (Enter, the → button, a recent search or a chip):
//   onSearch('the words') - the parent decides what happens then.
// ---------------------------------------------------------------

const DEFAULT_SUGGESTIONS = ['Paranormal', 'Creepy', 'Based on true events', 'Supernatural']


// ---------------------------------------------------------------
// RECENT SEARCHES - kept in the browser (localStorage), so they're
// still there next time. Only on this device, never sent anywhere.
//
// localStorage can only store TEXT, so the list is turned into JSON
// text to save it (JSON.stringify) and back into a list to read it
// (JSON.parse). try/catch: in private browsing localStorage can be
// blocked - then there are simply no recent searches.
// ---------------------------------------------------------------
const RECENT_KEY = 'recentSearches'
const MAX_RECENT = 5

function loadRecent() {
    try {
        return JSON.parse(localStorage.getItem(RECENT_KEY)) || []
    } catch {
        return []
    }
}

function saveRecent(list) {
    try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(list))
    } catch {
        // Blocked - not important, the search itself still works.
    }
}


// The small grey headings: RECENT, TRENDING.
const HEADING = 'text-xs font-bold uppercase tracking-wider text-gray-500'


function SearchBox({ onSearch, onCancel, startText = '', suggestions = DEFAULT_SUGGESTIONS, autoFocus = false }) {
    const [text, setText] = useState(startText)

    // The function form of useState: loadRecent() only runs on the
    // FIRST render, not every time you type a letter.
    const [recent, setRecent] = useState(() => loadRecent())

    // At least 2 letters (the same rule as Django's SearchView).
    const canSearch = text.trim().length >= 2

    // Every way of searching ends up here.
    function search(words) {
        // Put these words at the top of "recent": remove them first if
        // they're already in the list (no duplicates), then keep only
        // the newest MAX_RECENT.
        const updated = [words, ...recent.filter(item => item !== words)].slice(0, MAX_RECENT)
        setRecent(updated)
        saveRecent(updated)

        onSearch(words)
    }

    function handleSubmit(event) {
        // Stop the browser reloading the page (a form's default).
        event.preventDefault()
        if (canSearch) search(text.trim())
    }

    // Clicking a recent search or a chip: put it in the box AND search.
    function pick(words) {
        setText(words)
        search(words)
    }

    function removeRecent(words) {
        const updated = recent.filter(item => item !== words)
        setRecent(updated)
        saveRecent(updated)
    }

    function clearRecent() {
        setRecent([])
        saveRecent([])
    }

    // Recent searches only show while the box is EMPTY - once you
    // type, you're looking for something new.
    const showRecent = recent.length > 0 && text === ''

    return (
        // ---------- THE CARD ----------
        // Phones: no card at all - the search fills the screen like a
        // phone app's search page.
        // From "sm" up: a dark rounded card with a faint edge.
        <div className='sm:rounded-3xl sm:border sm:border-white/10 sm:bg-slate-900 sm:p-5 sm:shadow-2xl sm:shadow-black/50'>

            {/* ---------- THE FIELD (+ Cancel) ---------- */}
            <div className='flex items-center gap-3'>

                {/* role='search' tells screen readers this is a search form.
                    focus-within: = "when anything INSIDE me has focus" -
                    the field gets a red ring while you type. */}
                <form
                    role='search'
                    onSubmit={handleSubmit}
                    className='flex min-w-0 flex-1 items-center gap-2 rounded-full bg-slate-800 py-1.5 pl-4 pr-1.5 ring-1 ring-white/5 transition focus-within:bg-slate-800/80 focus-within:ring-2 focus-within:ring-red-600/70'
                >
                    <Search className='h-5 w-5 shrink-0 text-gray-400' aria-hidden='true' />

                    {/* flex-1 = the input takes all the space it can.
                        bg-transparent + no border: the rounded field
                        around it is the box you see.
                        enterKeyHint='search' = the phone keyboard's
                        Enter key says "Search".
                        [&::-webkit-search-cancel-button]:hidden = hide
                        Chrome's own little ✕ (we draw our own). [&...]
                        is Tailwind's way to style a part of the element
                        that has no class of its own. */}
                    <input
                        type='search'
                        value={text}
                        onChange={event => setText(event.target.value)}
                        placeholder='Search stories, authors, tags...'
                        aria-label='Search'
                        autoFocus={autoFocus}
                        enterKeyHint='search'
                        className='min-w-0 flex-1 [&::-webkit-search-cancel-button]:hidden bg-transparent py-1.5 text-white placeholder:text-gray-500 focus:outline-none'
                    />

                    {/* ✕ - empties the box. Only when there's text. */}
                    {text && (
                        <button
                            type='button'
                            onClick={() => setText('')}
                            aria-label='Clear search'
                            className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-600 text-slate-200 transition-colors hover:bg-slate-500'
                        >
                            <X className='h-3.5 w-3.5' />
                        </button>
                    )}

                    {/* → - search. Only when there are 2+ letters, so
                        the field looks clean and simple until then.
                        (Enter works too, on any keyboard.) */}
                    {canSearch ? (
                        <button
                            type='submit'
                            aria-label='Search'
                            className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-700 active:scale-95'
                        >
                            <ArrowRight className='h-5 w-5' />
                        </button>
                    ) : (
                        // An empty space the same size as the button,
                        // so the field doesn't change height when the
                        // button appears.
                        <span className='h-9 w-0' aria-hidden='true' />
                    )}
                </form>

                {/* Cancel - phones only (sm:hidden), and only when the
                    parent gave us onCancel (the pop-up search does).
                    Big screens close the pop-up with Esc instead. */}
                {onCancel && (
                    <button
                        type='button'
                        onClick={onCancel}
                        className='shrink-0 text-sm font-semibold text-gray-200 hover:text-white sm:hidden'
                    >
                        Cancel
                    </button>
                )}
            </div>

            {/* ---------- RECENT SEARCHES ---------- */}
            {showRecent && (
                <div className='mt-6'>
                    <div className='mb-2 flex items-center justify-between'>
                        <h3 className={HEADING}>Recent</h3>
                        <button type='button' onClick={clearRecent} className='text-xs font-semibold text-red-400 hover:text-red-300'>
                            Clear all
                        </button>
                    </div>

                    <ul>
                        {recent.map(words => (
                            <li key={words} className='flex items-center gap-1'>
                                {/* The whole row searches again. */}
                                <button
                                    type='button'
                                    onClick={() => pick(words)}
                                    className='flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2.5 text-left text-sm text-gray-200 transition-colors hover:bg-white/5'
                                >
                                    <Clock className='h-4 w-4 shrink-0 text-gray-500' />
                                    <span className='truncate'>{words}</span>
                                </button>

                                {/* ✕ - forget just this one. */}
                                <button
                                    type='button'
                                    onClick={() => removeRecent(words)}
                                    aria-label={`Remove "${words}" from recent searches`}
                                    className='flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white/5 hover:text-white'
                                >
                                    <X className='h-4 w-4' />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ---------- TRENDING CHIPS ---------- */}
            {suggestions.length > 0 && (
                <div className='mt-6'>
                    <h3 className={`${HEADING} mb-3 flex items-center gap-1.5`}>
                        <TrendingUp className='h-3.5 w-3.5 text-red-500' aria-hidden='true' />
                        Trending
                    </h3>

                    {/* flex-wrap: the chips go onto a new line when the
                        row is full. */}
                    <div className='flex flex-wrap gap-2'>
                        {suggestions.map(word => (
                            <button
                                key={word}
                                type='button'
                                onClick={() => pick(word)}
                                className='rounded-full bg-slate-800 px-4 py-2 text-sm text-gray-300 ring-1 ring-white/5 transition-colors hover:bg-red-600/20 hover:text-white hover:ring-red-600/50'
                            >
                                {word}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default SearchBox
