import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Flashlight, Trash2 } from 'lucide-react'
import { getAdminList, createAdminItem, deleteAdminItem, getStoryPicker } from '../../api/client'
import { PageMessages } from '../Dashboard/AdminParts'
import { INPUT_STYLE, LABEL_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> STORY SPOTLIGHT (/dashboard/spotlight).
//
// A big banner for one story at the top of the homepage, with your
// own headline and blurb, from a start date to an end date.
// If two spotlights overlap, the newest start date wins.
// (Different from Story of the Day: that one is a small card; the
// spotlight is the big "look at THIS" banner, for a few days.)
// ---------------------------------------------------------------

function todayText() {
    const now = new Date()
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

// A function, not a fixed object: "today" is worked out each time the
// form is emptied (a tab left open overnight would otherwise keep
// yesterday's date).
function emptyForm() {
    return { story_id: '', headline: '', blurb: '', starts_on: todayText(), ends_on: todayText() }
}


function SpotlightDashboard() {
    const [spotlights, setSpotlights] = useState(null)
    const [stories, setStories] = useState([])
    const [form, setForm] = useState(emptyForm)
    const [error, setError] = useState('')
    const [reloadKey, setReloadKey] = useState(0)
    const reload = () => setReloadKey(current => current + 1)

    useEffect(() => {
        getAdminList('spotlights')
            .then(data => setSpotlights(data))
            .catch(() => setError('Could not load the spotlights.'))
    }, [reloadKey])

    useEffect(() => {
        getStoryPicker().then(data => setStories(data)).catch(() => {})
    }, [])

    function updateForm(name, value) {
        setForm(current => ({ ...current, [name]: value }))
    }

    async function handleCreate(event) {
        event.preventDefault()
        setError('')
        try {
            await createAdminItem('spotlights', form)
            setForm(emptyForm())
            reload()
        } catch (err) {
            setError(err.data ? Object.values(err.data).flat().join(' ') : 'Could not save.')
        }
    }

    async function remove(spotlight) {
        await deleteAdminItem('spotlights', spotlight.id)
        reload()
    }

    const today = todayText()
    // "2026-09-27" style dates compare correctly as text.
    function statusOf(spotlight) {
        if (spotlight.ends_on < today) return { label: 'Ended', style: 'text-gray-500' }
        if (spotlight.starts_on > today) return { label: 'Planned', style: 'text-blue-300' }
        return { label: 'Live now', style: 'text-green-400' }
    }

    return (
        <div className='max-w-3xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Flashlight className='h-7 w-7 text-red-500' />
                Story Spotlight
            </h1>
            <p className='mt-1 text-gray-400'>A big banner for one story on the homepage, between two dates.</p>

            <PageMessages error={error} notice='' />

            <form onSubmit={handleCreate} className='mt-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6'>
                <div>
                    <label htmlFor='story' className={LABEL_STYLE}>Story</label>
                    <select id='story' value={form.story_id} onChange={event => updateForm('story_id', event.target.value)} className={`${INPUT_STYLE} [color-scheme:dark]`}>
                        <option value=''>Pick a published story...</option>
                        {stories.map(story => <option key={story.id} value={story.id}>{story.title} - {story.author}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor='headline' className={LABEL_STYLE}>Headline</label>
                    <input id='headline' value={form.headline} onChange={event => updateForm('headline', event.target.value)} maxLength={120} placeholder='The story everyone is talking about' className={INPUT_STYLE} />
                </div>
                <div>
                    <label htmlFor='blurb' className={LABEL_STYLE}>Blurb <span className='font-normal text-gray-500'>(optional)</span></label>
                    <input id='blurb' value={form.blurb} onChange={event => updateForm('blurb', event.target.value)} maxLength={300} className={INPUT_STYLE} />
                </div>
                <div className='grid gap-4 sm:grid-cols-2'>
                    <div>
                        <label htmlFor='starts_on' className={LABEL_STYLE}>From</label>
                        <input id='starts_on' type='date' value={form.starts_on} onChange={event => updateForm('starts_on', event.target.value)} className={`${INPUT_STYLE} [color-scheme:dark]`} />
                    </div>
                    <div>
                        <label htmlFor='ends_on' className={LABEL_STYLE}>Until (and including)</label>
                        <input id='ends_on' type='date' value={form.ends_on} min={form.starts_on} onChange={event => updateForm('ends_on', event.target.value)} className={`${INPUT_STYLE} [color-scheme:dark]`} />
                    </div>
                </div>
                <button type='submit' disabled={!form.story_id || !form.headline.trim()} className={BUTTON_STYLE}>Save spotlight</button>
            </form>

            <ul className='mt-8 space-y-2'>
                {spotlights?.length === 0 && <li className='text-sm text-gray-500'>No spotlights yet.</li>}
                {spotlights?.map(spotlight => {
                    const status = statusOf(spotlight)
                    return (
                        <li key={spotlight.id} className='flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3'>
                            <div className='min-w-0 flex-1'>
                                <p className='font-semibold text-white'>{spotlight.headline}</p>
                                <p className='text-xs text-gray-500'>
                                    <Link to={`/stories/${spotlight.story_id}`} className='text-gray-300 hover:text-white'>{spotlight.story_title}</Link>
                                    {' · '}{spotlight.starts_on} → {spotlight.ends_on}
                                </p>
                            </div>
                            <span className={`text-xs font-semibold ${status.style}`}>{status.label}</span>
                            <button type='button' onClick={() => remove(spotlight)} aria-label='Delete spotlight' className='text-gray-500 hover:text-red-400'>
                                <Trash2 className='h-4 w-4' />
                            </button>
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

export default SpotlightDashboard
