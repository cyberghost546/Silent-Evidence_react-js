import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Swords, Trash2, Crown } from 'lucide-react'
import { getAdminList, getAdminItem, createAdminItem, updateAdminItem, deleteAdminItem } from '../../api/client'
import JudgingPanel from './JudgingPanel'
import { PageMessages } from '../Dashboard/AdminParts'
import { INPUT_STYLE, LABEL_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> CHALLENGES (/dashboard/challenges).
//
// Writing contests: a title, a theme ("write about fog") and a
// deadline. Writers enter one of their published stories on the
// public /challenges page. After the deadline, open the challenge
// here and pick the winner from its entries.
// ---------------------------------------------------------------

const EMPTY_FORM = { title: '', theme: '', deadline: '' }


// ---------------------------------------------------------------
// One challenge. "Show entries" loads its entries so a winner can
// be picked (they're only loaded when you open it).
// ---------------------------------------------------------------
function ChallengeCard({ challenge, onChanged, onDelete }) {
    const [entries, setEntries] = useState(null)   // null = not opened

    async function openEntries() {
        if (entries) {
            setEntries(null)       // clicking again closes it
            return
        }
        const detail = await getAdminItem('challenges', challenge.id)
        setEntries(detail.entries)
    }

    async function pickWinner(storyId) {
        // winner_id: null removes the winner again.
        await updateAdminItem('challenges', challenge.id, { winner_id: storyId })
        onChanged()
    }

    return (
        <li className='rounded-xl border border-slate-800 bg-slate-900/60 p-5'>
            <div className='flex flex-wrap items-center gap-2'>
                <h3 className='text-lg font-bold text-white'>{challenge.title}</h3>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    challenge.is_open ? 'border-green-800 text-green-400' : 'border-slate-600 text-gray-400'
                }`}>
                    {challenge.is_open ? 'Open' : 'Closed'}
                </span>
                <button type='button' onClick={() => onDelete(challenge)} aria-label='Delete challenge' className='ml-auto text-gray-500 hover:text-red-400'>
                    <Trash2 className='h-4 w-4' />
                </button>
            </div>
            <p className='mt-2 text-sm text-gray-300'>{challenge.theme}</p>
            <p className='mt-2 text-xs text-gray-500'>
                Deadline {new Date(challenge.deadline).toLocaleString()} · {challenge.entry_count} {challenge.entry_count === 1 ? 'entry' : 'entries'}
            </p>

            {challenge.winner_title && (
                <p className='mt-3 flex items-center gap-2 text-sm font-semibold text-yellow-400'>
                    <Crown className='h-4 w-4' /> Winner: {challenge.winner_title}
                </p>
            )}

            {/* Judges + their scores + Announce (JudgingPanel.jsx). */}
            <JudgingPanel challenge={challenge} onChanged={onChanged} />

            <button type='button' onClick={openEntries} className='mt-3 text-xs font-semibold text-red-400 hover:text-red-300'>
                {entries ? 'Hide entries' : 'Show entries / pick a winner'}
            </button>

            {entries && (
                <ul className='mt-3 space-y-1.5 border-t border-slate-800 pt-3'>
                    {entries.length === 0 && <li className='text-sm text-gray-500'>No entries yet.</li>}
                    {entries.map(entry => {
                        const isWinner = challenge.winner_id === entry.story_id
                        return (
                            <li key={entry.story_id} className='flex items-center justify-between gap-3 text-sm'>
                                <span className='text-gray-200'>
                                    <Link to={`/stories/${entry.story_id}`} className='hover:text-red-400'>{entry.title}</Link>
                                    <span className='text-gray-500'> by {entry.author}</span>
                                </span>
                                <button
                                    type='button'
                                    onClick={() => pickWinner(isWinner ? null : entry.story_id)}
                                    className={`rounded-md border px-2.5 py-0.5 text-xs ${
                                        isWinner ? 'border-yellow-600 text-yellow-400' : 'border-slate-600 text-gray-300 hover:border-slate-400'
                                    }`}
                                >
                                    {isWinner ? 'Winner ✓' : 'Pick as winner'}
                                </button>
                            </li>
                        )
                    })}
                </ul>
            )}
        </li>
    )
}


function ChallengesDashboard() {
    const [challenges, setChallenges] = useState(null)
    const [form, setForm] = useState(EMPTY_FORM)
    const [error, setError] = useState('')
    const [reloadKey, setReloadKey] = useState(0)
    const reload = () => setReloadKey(current => current + 1)

    useEffect(() => {
        getAdminList('challenges')
            .then(data => setChallenges(data))
            .catch(() => setError('Could not load the challenges.'))
    }, [reloadKey])

    function updateForm(name, value) {
        setForm(current => ({ ...current, [name]: value }))
    }

    async function handleCreate(event) {
        event.preventDefault()
        setError('')
        try {
            // <input type='datetime-local'> gives "2026-10-31T23:59"
            // in YOUR time zone. new Date(...).toISOString() turns it
            // into the exact moment in UTC, which is what Django wants.
            await createAdminItem('challenges', { ...form, deadline: new Date(form.deadline).toISOString() })
            setForm(EMPTY_FORM)
            reload()
        } catch (err) {
            setError(err.data ? Object.values(err.data).flat().join(' ') : 'Could not create the challenge.')
        }
    }

    async function handleDelete(challenge) {
        if (!window.confirm(`Delete "${challenge.title}"? The stories stay, only the challenge goes.`)) return
        await deleteAdminItem('challenges', challenge.id)
        reload()
    }

    return (
        <div className='max-w-3xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Swords className='h-7 w-7 text-red-500' />
                Challenges
            </h1>
            <p className='mt-1 text-gray-400'>
                Writing contests. Members enter on the public <Link to='/challenges' className='text-red-400 hover:text-red-300'>Challenges page</Link>.
            </p>

            <PageMessages error={error} notice='' />

            <form onSubmit={handleCreate} className='mt-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6'>
                <h2 className='font-semibold text-white'>New challenge</h2>
                <div>
                    <label htmlFor='title' className={LABEL_STYLE}>Title</label>
                    <input id='title' value={form.title} onChange={event => updateForm('title', event.target.value)} maxLength={150} placeholder='The Fog Challenge' className={INPUT_STYLE} />
                </div>
                <div>
                    <label htmlFor='theme' className={LABEL_STYLE}>Theme / rules</label>
                    <textarea id='theme' value={form.theme} onChange={event => updateForm('theme', event.target.value)} rows={3} maxLength={1000} placeholder='Something is hiding in the fog. Max 2000 words.' className={`${INPUT_STYLE} resize-y`} />
                </div>
                <div>
                    <label htmlFor='deadline' className={LABEL_STYLE}>Deadline</label>
                    <input id='deadline' type='datetime-local' value={form.deadline} onChange={event => updateForm('deadline', event.target.value)} className={`${INPUT_STYLE} [color-scheme:dark]`} />
                </div>
                <button type='submit' disabled={!form.title.trim() || !form.theme.trim() || !form.deadline} className={BUTTON_STYLE}>
                    Create challenge
                </button>
            </form>

            <ul className='mt-8 space-y-4'>
                {challenges?.map(challenge => (
                    <ChallengeCard key={challenge.id} challenge={challenge} onChanged={reload} onDelete={handleDelete} />
                ))}
                {challenges?.length === 0 && <p className='text-sm text-gray-500'>No challenges yet.</p>}
            </ul>
        </div>
    )
}

export default ChallengesDashboard
