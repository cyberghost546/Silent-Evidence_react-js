import { useState, useEffect } from 'react'
import { getLastWords, postLastWord } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import { useRequireLogin } from '../../hooks/useRequireLogin'
import { formatShortDate } from '../../utils/format'


// Must match LAST_WORDS_MAX in backend/stories/models.py.
const MAX_LENGTH = 280


// ---------------------------------------------------------------
// "LAST WORDS" - a wall of short horror quotes, like tweets.
//
// Anyone can read the wall. Posting needs an account: logged-out
// visitors who click Post are sent to Log In (useRequireLogin).
//
// Usage:
//   <LastWords />
// ---------------------------------------------------------------
function LastWords() {
    const { user } = useAuth()
    const requireLogin = useRequireLogin()

    const [quotes, setQuotes] = useState([])
    const [text, setText] = useState('')
    const [error, setError] = useState('')
    const [posting, setPosting] = useState(false)

    // Load the wall once.
    useEffect(() => {
        getLastWords()
            .then(setQuotes)
            .catch(() => setQuotes([]))
    }, [])

    // How many characters are LEFT - counts down as you type.
    const charactersLeft = MAX_LENGTH - text.length

    // Nothing but spaces? Then there's nothing to post.
    const isEmpty = text.trim() === ''

    async function handleSubmit(event) {
        event.preventDefault()
        if (!requireLogin()) return
        if (isEmpty) return

        setPosting(true)
        setError('')

        try {
            const newQuote = await postLastWord(text)

            // Put the new quote at the FRONT of the list, so it shows
            // up first without loading the whole wall again.
            setQuotes([newQuote, ...quotes])
            setText('')
        } catch (err) {
            // Django's message for the body field, or a general one.
            setError(err.data?.body?.join(' ') || 'Could not post your quote. Please try again.')
        } finally {
            setPosting(false)
        }
    }

    return (
        <section className='bg-slate-950 px-4 py-20'>
            <div className='mx-auto max-w-3xl'>

                {/* ---------- HEADING ---------- */}
                <div className='text-center'>
                    {/* font-serif = a "book" font, which suits the title. */}
                    <h2 className='font-serif text-4xl font-bold uppercase tracking-[0.12em] text-red-500'>Last Words</h2>
                    <p className='mt-2 italic text-gray-400'>{MAX_LENGTH} characters. Drop your best quote.</p>

                    {/* The little decoration: — ✦ — ✦ — ✦ —
                        aria-hidden: screen readers skip it, it means nothing. */}
                    <p aria-hidden='true' className='mt-3 text-sm tracking-[0.3em] text-red-500'>—✦—✦—✦—</p>
                </div>

                {/* ---------- THE FORM ---------- */}
                <form onSubmit={handleSubmit} className='mt-8 rounded-xl border border-slate-700 bg-slate-800 p-5 shadow-2xl shadow-black/40'>
                    <label htmlFor='last-words' className='sr-only'>Your quote</label>
                    <textarea
                        id='last-words'
                        value={text}
                        onChange={e => setText(e.target.value)}
                        // maxLength stops the typing at 280, so the counter
                        // never goes below 0. Django checks again anyway.
                        maxLength={MAX_LENGTH}
                        rows={4}
                        placeholder={user ? 'Drop your favorite horror quote...' : 'Log in to drop your favorite horror quote...'}
                        className='w-full resize-none rounded-lg border border-red-900 bg-slate-900 px-4 py-3 text-white placeholder:text-slate-500 focus:border-red-600 focus:outline-none'
                    />

                    <div className='mt-3 flex items-center justify-between'>
                        {/* The counter goes red for the last 20 characters. */}
                        <span className={`font-mono text-sm ${charactersLeft <= 20 ? 'text-red-400' : 'text-gray-500'}`}>
                            {charactersLeft} / {MAX_LENGTH}
                        </span>

                        {/* Greyed out while empty or while posting.
                            disabled:opacity-40 does the "faded" look. */}
                        <button
                            type='submit'
                            disabled={isEmpty || posting}
                            className='rounded-lg bg-red-700 px-5 py-2 font-bold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-red-700'
                        >
                            {posting ? 'Posting...' : 'Post Quote'}
                        </button>
                    </div>

                    {error && <p className='mt-2 text-sm text-red-400'>{error}</p>}
                </form>

                {/* ---------- THE WALL ---------- */}
                {quotes.length === 0 ? (
                    <p className='mt-16 text-center italic text-gray-500'>No quotes yet. Be the first to post.</p>
                ) : (
                    // Two columns on bigger screens.
                    <ul className='mt-10 grid gap-4 sm:grid-cols-2'>
                        {quotes.map(quote => (
                            <li key={quote.id} className='rounded-xl border border-slate-800 bg-slate-900 p-5'>
                                {/* break-words: a very long word (or link)
                                    wraps instead of sticking out of the card. */}
                                <p className='break-words font-serif text-lg italic leading-7 text-gray-200'>“{quote.body}”</p>
                                <p className='mt-3 text-xs text-gray-500'>
                                    <span className='text-red-400'>— {quote.author}</span> · {formatShortDate(quote.created_at)}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    )
}

export default LastWords
