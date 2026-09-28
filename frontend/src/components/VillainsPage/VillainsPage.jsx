import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Crown, Trash2 } from 'lucide-react'
import { getVillains, nominateVillain, voteVillain, removeVillain, getStories } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { useRequireLogin } from '../../hooks/useRequireLogin'
import { usePageTitle } from '../../hooks/usePageTitle'
import { formatLongDate } from '../../utils/format'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'
import { INPUT_STYLE, LABEL_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// VILLAIN OF THE WEEK (/villains, and /villains/nominate opens the form)
//
// This week's nominations, most votes first, with a Vote button.
// One nomination and one vote per member per week (voting again
// moves your vote). Below: last weeks' winners.
// ---------------------------------------------------------------
function VillainsPage() {
    usePageTitle('Villain of the Week')
    const { pathname } = useLocation()
    const { user } = useAuth()
    const requireLogin = useRequireLogin()
    const { data, error, reload } = useApi(() => getVillains())
    // Stories to pick "which story is this villain from" (optional).
    const { data: stories } = useApi(() => getStories({ sort: 'popular', limit: 60 }))

    // /villains/nominate = start with the form open.
    const [nominating, setNominating] = useState(pathname.endsWith('/nominate'))
    const [name, setName] = useState('')
    const [reason, setReason] = useState('')
    const [storyId, setStoryId] = useState('')
    const [formError, setFormError] = useState('')

    async function handleNominate(event) {
        event.preventDefault()
        setFormError('')
        try {
            await nominateVillain(name.trim(), reason.trim(), storyId)
            setNominating(false)
            reload()
        } catch (err) {
            setFormError(err.data?.detail || 'Could not nominate.')
        }
    }

    async function handleVote(villain) {
        if (!requireLogin()) return
        try {
            await voteVillain(villain.id)
        } catch {
            // e.g. a new week started while the page was open.
            alert('Could not vote - try reloading the page.')
        }
        reload()
    }

    async function handleRemove(villain) {
        if (!window.confirm(`Remove "${villain.name}"?`)) return
        await removeVillain(villain.id)
        reload()
    }

    const canNominate = data && !data.has_nominated

    return (
        <PageLayout
            title='Villain of the Week'
            subtitle={data ? `Who is the scariest villain on the site? Voting for the week of ${formatLongDate(data.week)}.` : 'Who is the scariest villain on the site?'}
            width='narrow'
            action={canNominate && !nominating && (
                <button type='button' onClick={() => requireLogin() && setNominating(true)} className={BUTTON_STYLE}>Nominate a villain</button>
            )}
        >
            {/* ---------- NOMINATE ---------- */}
            {nominating && (user ? canNominate : true) && (
                user ? (
                    <form onSubmit={handleNominate} className='mb-8 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5'>
                        <div>
                            <label htmlFor='villain-name' className={LABEL_STYLE}>The villain</label>
                            <input id='villain-name' value={name} onChange={event => setName(event.target.value)} maxLength={80} placeholder='The Keeper' className={INPUT_STYLE} />
                        </div>
                        <div>
                            <label htmlFor='villain-story' className={LABEL_STYLE}>From which story? <span className='font-normal text-gray-500'>(optional)</span></label>
                            <select id='villain-story' value={storyId} onChange={event => setStoryId(event.target.value)} className={`${INPUT_STYLE} [color-scheme:dark]`}>
                                <option value=''>- not from a story here -</option>
                                {stories?.map(story => <option key={story.id} value={story.id}>{story.title}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor='villain-reason' className={LABEL_STYLE}>Why so scary? <span className='font-normal text-gray-500'>(optional)</span></label>
                            <input id='villain-reason' value={reason} onChange={event => setReason(event.target.value)} maxLength={300} placeholder='He never blinks. Ever.' className={INPUT_STYLE} />
                        </div>
                        {formError && <p className='text-sm text-red-400'>{formError}</p>}
                        <div className='flex justify-end gap-3'>
                            <button type='button' onClick={() => setNominating(false)} className='text-sm text-gray-400 hover:text-white'>Cancel</button>
                            <button type='submit' disabled={!name.trim()} className={BUTTON_STYLE}>Nominate</button>
                        </div>
                    </form>
                ) : (
                    <PageMessage title='Log in to nominate' text='Every member can nominate one villain a week.' />
                )
            )}
            {data?.has_nominated && (
                <p className='mb-6 text-sm text-gray-400'>You nominated a villain this week - vote for your favourite below. Back on Monday for a new round!</p>
            )}

            {error && <PageMessage title='Could not load the villains' text={error} />}
            {data?.nominations.length === 0 && <PageMessage title='No nominations yet' text='Be the first to name a villain this week.' />}

            {/* ---------- THIS WEEK'S RACE ---------- */}
            <ol className='space-y-3'>
                {data?.nominations.map((villain, index) => (
                    <li key={villain.id} className={`rounded-2xl border p-5 ${index === 0 ? 'border-amber-700/70 bg-amber-950/10' : 'border-slate-800 bg-slate-900/60'}`}>
                        <div className='flex items-start gap-4'>
                            <span className='w-6 shrink-0 pt-0.5 text-center'>
                                {index === 0 ? <Crown className='mx-auto h-5 w-5 text-amber-400' aria-label='Leading' /> : <span className='text-gray-500'>{index + 1}</span>}
                            </span>
                            <div className='min-w-0 flex-1'>
                                <p className='text-lg font-bold text-white'>{villain.name}</p>
                                {villain.story && (
                                    <p className='text-sm text-gray-400'>from <Link to={`/stories/${villain.story.id}`} className='text-red-400 hover:text-red-300'>{villain.story.title}</Link></p>
                                )}
                                {villain.reason && <p className='mt-1 text-sm italic text-gray-300'>"{villain.reason}"</p>}
                                <p className='mt-1 text-xs text-gray-500'>nominated by {villain.nominated_by}</p>
                            </div>
                            <div className='flex shrink-0 flex-col items-end gap-2'>
                                <span className='text-sm tabular-nums text-gray-300'>{villain.votes} {villain.votes === 1 ? 'vote' : 'votes'}</span>
                                <button
                                    type='button'
                                    onClick={() => handleVote(villain)}
                                    disabled={villain.is_my_vote}
                                    aria-pressed={villain.is_my_vote}
                                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${villain.is_my_vote ? 'bg-red-900/60 text-red-100' : 'border border-red-700 text-red-300 hover:bg-red-950/60'}`}
                                >
                                    {villain.is_my_vote ? '✓ Your vote' : 'Vote'}
                                </button>
                                {user?.is_staff && (
                                    <button type='button' onClick={() => handleRemove(villain)} aria-label={`Remove ${villain.name}`} className='text-gray-600 hover:text-red-400'>
                                        <Trash2 className='h-4 w-4' />
                                    </button>
                                )}
                            </div>
                        </div>
                    </li>
                ))}
            </ol>

            {/* ---------- HALL OF FAME ---------- */}
            {data?.past_winners.length > 0 && (
                <section className='mt-12'>
                    <h2 className='text-lg font-bold text-white'>Past villains of the week</h2>
                    <ul className='mt-3 divide-y divide-slate-800 rounded-2xl border border-slate-800'>
                        {data.past_winners.map(winner => (
                            <li key={winner.week} className='flex items-center justify-between gap-3 px-4 py-3 text-sm'>
                                <span className='min-w-0'>
                                    <span className='font-semibold text-white'>{winner.name}</span>
                                    {winner.story && <span className='text-gray-500'> · {winner.story.title}</span>}
                                </span>
                                <span className='shrink-0 text-xs text-gray-500'>week of {formatLongDate(winner.week)} · {winner.votes} votes</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </PageLayout>
    )
}

export default VillainsPage
