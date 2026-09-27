import { useState, useEffect } from 'react'
import { Moon, Trash2 } from 'lucide-react'
import { getAdminList, createAdminItem, deleteAdminItem } from '../../api/client'
import { PageMessages } from '../Dashboard/AdminParts'
import { MOODS } from '../WriteStory/storyOptions'
import { INPUT_STYLE, LABEL_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> MOOD OF DAY (/dashboard/moods).
//
// Plan a mood for each day. On that day the homepage shows a
// "Mood of the day" section with the most-read stories in it.
// The moods are the ones writers pick on Write a Story.
// A day without a mood simply has no section.
// ---------------------------------------------------------------

// Today as "2026-09-27" in YOUR time zone (what <input type='date'> uses).
function todayText() {
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}


function MoodDashboard() {
    const [moods, setMoods] = useState(null)
    const [form, setForm] = useState({ date: todayText(), mood: MOODS[0].value, note: '' })
    const [error, setError] = useState('')
    const [reloadKey, setReloadKey] = useState(0)
    const reload = () => setReloadKey(current => current + 1)

    useEffect(() => {
        getAdminList('moods')
            .then(data => setMoods(data))
            .catch(() => setError('Could not load the moods.'))
    }, [reloadKey])

    async function handleAdd(event) {
        event.preventDefault()
        setError('')
        try {
            await createAdminItem('moods', form)
            setForm({ ...form, note: '' })
            reload()
        } catch (err) {
            // e.g. { date: ['mood of day with this date already exists.'] }
            setError(err.data?.date ? 'That day already has a mood - delete it first.' : 'Could not save.')
        }
    }

    async function remove(item) {
        await deleteAdminItem('moods', item.id)
        reload()
    }

    // { creepy: 'Creepy', ... } to show labels.
    const labels = Object.fromEntries(MOODS.map(mood => [mood.value, mood.label]))
    const today = todayText()

    return (
        <div className='max-w-3xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Moon className='h-7 w-7 text-purple-300' />
                Mood of Day
            </h1>
            <p className='mt-1 text-gray-400'>Plan the homepage's mood, day by day.</p>

            <PageMessages error={error} notice='' />

            <form onSubmit={handleAdd} className='mt-6 grid gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:grid-cols-[10rem_12rem_1fr_auto] sm:items-end'>
                <div>
                    <label htmlFor='date' className={LABEL_STYLE}>Day</label>
                    <input id='date' type='date' value={form.date} min={today} onChange={event => setForm({ ...form, date: event.target.value })} className={`${INPUT_STYLE} [color-scheme:dark]`} />
                </div>
                <div>
                    <label htmlFor='mood' className={LABEL_STYLE}>Mood</label>
                    <select id='mood' value={form.mood} onChange={event => setForm({ ...form, mood: event.target.value })} className={`${INPUT_STYLE} [color-scheme:dark]`}>
                        {MOODS.map(mood => <option key={mood.value} value={mood.value}>{mood.label}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor='note' className={LABEL_STYLE}>Line under it <span className='font-normal text-gray-500'>(optional)</span></label>
                    <input id='note' value={form.note} onChange={event => setForm({ ...form, note: event.target.value })} maxLength={200} placeholder='For the first night of frost...' className={INPUT_STYLE} />
                </div>
                <button type='submit' disabled={!form.date} className={BUTTON_STYLE}>Plan it</button>
            </form>

            <ul className='mt-8 space-y-2'>
                {moods?.length === 0 && <li className='text-sm text-gray-500'>Nothing planned.</li>}
                {moods?.map(item => {
                    const isToday = item.date === today
                    const isPast = item.date < today   // "2026-09-20" < "2026-09-27" works for this date format
                    return (
                        <li key={item.id} className={`flex items-center gap-4 rounded-xl border px-4 py-3 ${
                            isToday ? 'border-purple-700 bg-purple-950/30' : 'border-slate-800 bg-slate-900/40'
                        } ${isPast ? 'opacity-50' : ''}`}>
                            <span className='w-28 text-sm text-gray-300'>
                                {new Date(`${item.date}T12:00`).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}
                            </span>
                            <span className='font-semibold text-white'>{labels[item.mood] ?? item.mood}</span>
                            {isToday && <span className='rounded bg-purple-800 px-1.5 text-[10px] font-semibold text-purple-100'>TODAY</span>}
                            <span className='flex-1 truncate text-sm text-gray-500'>{item.note}</span>
                            <button type='button' onClick={() => remove(item)} aria-label='Delete' className='text-gray-500 hover:text-red-400'>
                                <Trash2 className='h-4 w-4' />
                            </button>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

export default MoodDashboard
