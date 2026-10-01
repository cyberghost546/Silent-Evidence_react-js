import { useState, useEffect } from 'react'
import { Clock, Send, CalendarClock, X } from 'lucide-react'
import { getScheduledStories, changeScheduledStory } from '../../api/client'
import { PageMessages } from '../Dashboard/AdminParts'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> SCHEDULED STORIES (/dashboard/scheduled).
//
// Stories whose writer picked "publish later" on the Write page.
// They go live by themselves at that moment; here an admin can:
//   Publish now   - live right away
//   Move          - pick another date and time
//   Cancel        - back to a draft (the writer can publish it again)
// ---------------------------------------------------------------

// "in 3 days" / "in 5 hours" / "in 20 minutes"
function timeUntil(isoString) {
    const minutes = Math.round((new Date(isoString) - new Date()) / 60000)
    if (minutes < 60) return `in ${minutes} min`
    const hours = Math.round(minutes / 60)
    if (hours < 48) return `in ${hours} hours`
    return `in ${Math.round(hours / 24)} days`
}

// A Date -> the "2026-10-31T21:00" text a datetime-local input wants,
// in the visitor's OWN time zone. (toISOString() would give UTC.)
function toInputValue(isoString) {
    const date = new Date(isoString)
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    return local.toISOString().slice(0, 16)
}


function ScheduledRow({ story, onAction }) {
    const [moving, setMoving] = useState(false)
    const [when, setWhen] = useState(toInputValue(story.publish_at))

    return (
        <li className='rounded-xl border border-slate-800 bg-slate-900/60 p-4'>
            <div className='flex flex-wrap items-center gap-3'>
                <div className='min-w-0 flex-1'>
                    <p className='truncate font-semibold text-white'>{story.title}</p>
                    <p className='text-xs text-gray-500'>by {story.author}{story.category && ` · ${story.category}`}</p>
                </div>
                <p className='text-right text-sm'>
                    <span className='block text-white'>{new Date(story.publish_at).toLocaleString()}</span>
                    <span className='text-xs text-blue-300'>{timeUntil(story.publish_at)}</span>
                </p>
            </div>

            <div className='mt-3 flex flex-wrap gap-2'>
                <button type='button' onClick={() => onAction(story, 'now')} className='flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-700'>
                    <Send className='h-3.5 w-3.5' /> Publish now
                </button>
                <button type='button' onClick={() => setMoving(!moving)} className='flex items-center gap-1.5 rounded-md border border-slate-600 px-3 py-1 text-xs text-gray-200 hover:border-slate-400'>
                    <CalendarClock className='h-3.5 w-3.5' /> Move
                </button>
                <button type='button' onClick={() => onAction(story, 'cancel')} className='flex items-center gap-1.5 rounded-md border border-slate-700 px-3 py-1 text-xs text-gray-400 hover:text-white'>
                    <X className='h-3.5 w-3.5' /> Cancel (back to draft)
                </button>
            </div>

            {moving && (
                <div className='mt-3 flex gap-2'>
                    <input
                        type='datetime-local'
                        value={when}
                        onChange={event => setWhen(event.target.value)}
                        aria-label='New publish time'
                        className='rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white [color-scheme:dark]'
                    />
                    {/* new Date(when) reads it as local time;
                        toISOString() sends the exact moment in UTC. */}
                    <button
                        type='button'
                        onClick={() => onAction(story, 'move', new Date(when).toISOString())}
                        className='rounded-lg border border-slate-600 px-3 text-sm text-gray-200 hover:border-slate-400'
                    >
                        Save
                    </button>
                </div>
            )}
        </li>
    )
}


function ScheduledDashboard() {
    const [stories, setStories] = useState(null)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        getScheduledStories()
            .then(data => setStories(data))
            .catch(() => setError('Could not load the scheduled stories.'))
    }, [reloadKey])

    async function handleAction(story, action, publishAt) {
        if (action === 'cancel' && !window.confirm(`Turn "${story.title}" back into a draft?`)) return
        setError('')
        try {
            await changeScheduledStory(story.id, action, publishAt)
            setNotice({ now: `"${story.title}" is live.`, cancel: `"${story.title}" is a draft again.`, move: 'New time saved.' }[action])
            setReloadKey(current => current + 1)
        } catch (err) {
            setError(err.data?.detail || 'Could not change it.')
        }
    }

    return (
        <div className='max-w-3xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Clock className='h-7 w-7 text-blue-300' />
                Scheduled Stories
            </h1>
            <p className='mt-1 text-gray-400'>Stories waiting for their publish time. They go live by themselves.</p>

            <PageMessages error={error} notice={notice} />

            {stories === null && !error && <p className='mt-6 text-gray-400'>Loading...</p>}
            {stories?.length === 0 && <p className='mt-8 rounded-xl border border-slate-800 py-12 text-center text-gray-500'>Nothing scheduled.</p>}

            <ul className='mt-6 space-y-3'>
                {stories?.map(story => <ScheduledRow key={story.id} story={story} onAction={handleAction} />)}
            </ul>
        </div>
    )
}

export default ScheduledDashboard
