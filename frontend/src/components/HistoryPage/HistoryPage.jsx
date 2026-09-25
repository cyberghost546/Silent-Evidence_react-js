import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { getReadingHistory, clearReadingHistory } from '../../api/client'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'
import StoryCard from '../StorySections/StoryCard'
import { BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// READING HISTORY (/history) - logged-in users only (App.jsx).
//
// Every story you opened, the last one on top, grouped by day:
//
//   TODAY
//     [story] [story]
//   YESTERDAY
//     [story]
//   12 SEPTEMBER 2026
//     ...
//
// Django records a story here each time you open it (record_reading
// in backend/stories/views.py).
// ---------------------------------------------------------------


// "2026-09-26T21:05:00Z" -> "Today" / "Yesterday" / "12 September 2026"
function dayLabel(isoString) {
    const date = new Date(isoString)
    const today = new Date()

    // A copy of today, moved back one day.
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)

    // toDateString() = "Sat Sep 26 2026" - only the day, no time,
    // so two moments on the same day give the same text.
    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })
}


// Turns the flat list from Django into groups, one per day:
//   [ { label: 'Today', items: [...] }, { label: 'Yesterday', items: [...] } ]
// The list is already newest first, so the groups come out in order.
function groupByDay(history) {
    const groups = []

    for (const item of history) {
        const label = dayLabel(item.last_read_at)

        // .at(-1) = the LAST group so far. Same day -> add to it,
        // a new day -> start a new group.
        const lastGroup = groups.at(-1)
        if (lastGroup && lastGroup.label === label) {
            lastGroup.items.push(item)
        } else {
            groups.push({ label, items: [item] })
        }
    }

    return groups
}


function HistoryPage() {
    const [history, setHistory] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        getReadingHistory()
            .then(data => setHistory(data))
            .catch(() => setError('Could not load your reading history.'))
    }, [])

    async function handleClear() {
        // confirm() = the browser's own OK / Cancel box. Good enough
        // for a "are you sure?" on a small action like this.
        if (!window.confirm('Clear your whole reading history?')) return

        try {
            await clearReadingHistory()
            setHistory([])
        } catch {
            setError('Could not clear your history. Try again.')
        }
    }

    // The "Clear history" button, only when there IS some history.
    const clearButton = history?.length > 0 && (
        <button
            type='button'
            onClick={handleClear}
            className='flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-red-700 hover:text-red-300'
        >
            <Trash2 className='h-4 w-4' />
            Clear history
        </button>
    )

    return (
        <PageLayout title='Reading History' subtitle='The stories you opened, the latest first.' action={clearButton}>
            {error && <p className='mb-6 rounded-lg border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-300'>{error}</p>}

            {history === null && !error && <p className='py-20 text-center text-gray-400'>Loading your history...</p>}

            {history?.length === 0 && (
                <PageMessage title='Nothing here yet.' text='Stories you read show up here, so you can find them again.'>
                    <Link to='/' className={BUTTON_STYLE}>Start reading</Link>
                </PageMessage>
            )}

            {history?.length > 0 && (
                <div className='space-y-10'>
                    {groupByDay(history).map(group => (
                        <section key={group.label}>
                            <h2 className='mb-4 text-xs font-semibold uppercase tracking-wider text-gray-500'>{group.label}</h2>

                            {/* StoryCard = the wide card with the image on
                                the left (same as the homepage lists). */}
                            <div className='grid gap-4 lg:grid-cols-2'>
                                {group.items.map(item => (
                                    <StoryCard key={item.story.id} story={item.story} />
                                ))}
                            </div>
                        </section>
                    ))}
                </div>
            )}
        </PageLayout>
    )
}

export default HistoryPage
