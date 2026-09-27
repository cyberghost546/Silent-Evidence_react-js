import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Swords, Crown, Clock } from 'lucide-react'
import { getChallenges, getChallenge, enterChallenge } from '../../api/client'
import { useAuth } from '../../hooks/useAuth'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'
import StoryGridCard from '../StorySections/StoryGridCard'
import { BUTTON_STYLE, INPUT_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// WRITING CHALLENGES - anyone can look, members can enter.
//
//   /challenges       -> every challenge (open ones first)
//   /challenges/3     -> one challenge: the theme, the entries, and
//                        "Enter one of your stories"
//
// ONE file, TWO pages: ChallengesPage looks at the URL - with an id
// it shows ChallengeDetail, without one ChallengeList.
// Admins create challenges on Admin Dashboard -> Challenges.
// ---------------------------------------------------------------


// "3 days left" / "5 hours left" / "Closed".
function timeLeft(deadline) {
    const ms = new Date(deadline) - new Date()
    if (ms <= 0) return 'Closed'
    const hours = Math.floor(ms / (1000 * 60 * 60))
    if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} left`
    const days = Math.floor(hours / 24)
    return `${days} ${days === 1 ? 'day' : 'days'} left`
}


function ChallengeList() {
    const [challenges, setChallenges] = useState(null)

    useEffect(() => {
        getChallenges()
            .then(data => setChallenges(data))
            .catch(() => setChallenges([]))
    }, [])

    if (challenges === null) {
        return <p className='py-20 text-center text-gray-400'>Loading challenges...</p>
    }
    if (challenges.length === 0) {
        return <PageMessage title='No challenges yet.' text='Check back soon - the first one is coming.' />
    }

    // Open ones first. .filter twice = two lists, then glue them.
    const open = challenges.filter(challenge => challenge.is_open)
    const closed = challenges.filter(challenge => !challenge.is_open)

    return (
        <div className='grid grid-cols-1 gap-5 md:grid-cols-2'>
            {[...open, ...closed].map(challenge => (
                <Link
                    key={challenge.id}
                    to={`/challenges/${challenge.id}`}
                    className={`block rounded-2xl border p-6 transition-colors ${
                        challenge.is_open ? 'border-red-900/70 bg-red-950/10 hover:border-red-600' : 'border-slate-800 bg-slate-900/40 hover:border-slate-600'
                    }`}
                >
                    <p className={`flex items-center gap-1.5 text-xs font-semibold ${challenge.is_open ? 'text-green-400' : 'text-gray-500'}`}>
                        <Clock className='h-3.5 w-3.5' />
                        {timeLeft(challenge.deadline)}
                    </p>
                    <h2 className='mt-2 text-xl font-bold text-white'>{challenge.title}</h2>
                    {/* line-clamp-3 = at most 3 lines, then "..." */}
                    <p className='mt-2 line-clamp-3 text-sm text-gray-400'>{challenge.theme}</p>
                    <p className='mt-4 text-xs text-gray-500'>
                        {challenge.entry_count} {challenge.entry_count === 1 ? 'entry' : 'entries'}
                        {challenge.winner_title && <span className='ml-2 text-yellow-400'>· 👑 {challenge.winner_title}</span>}
                    </p>
                </Link>
            ))}
        </div>
    )
}


function ChallengeDetail({ id }) {
    const { user } = useAuth()
    const [challenge, setChallenge] = useState(null)
    const [chosenStory, setChosenStory] = useState('')
    const [message, setMessage] = useState('')
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        getChallenge(id)
            .then(data => setChallenge(data))
            .catch(() => setChallenge('not-found'))
    }, [id, reloadKey])

    async function handleEnter(event) {
        event.preventDefault()
        try {
            const answer = await enterChallenge(id, chosenStory)
            setMessage(answer.detail)
            setChosenStory('')
            setReloadKey(current => current + 1)
        } catch (err) {
            setMessage(err.data?.detail || 'Could not enter the story.')
        }
    }

    if (challenge === null) return <p className='py-20 text-center text-gray-400'>Loading...</p>
    if (challenge === 'not-found') return <PageMessage title='This challenge does not exist.' />

    return (
        <div>
            <Link to='/challenges' className='text-sm text-gray-400 hover:text-white'>← All challenges</Link>

            <div className='mt-4 rounded-2xl border border-red-900/60 bg-slate-900/60 p-6'>
                <p className={`flex items-center gap-1.5 text-sm font-semibold ${challenge.is_open ? 'text-green-400' : 'text-gray-500'}`}>
                    <Clock className='h-4 w-4' />
                    {timeLeft(challenge.deadline)} · deadline {new Date(challenge.deadline).toLocaleString()}
                </p>
                <h2 className='mt-2 text-3xl font-bold text-white'>{challenge.title}</h2>
                <p className='mt-3 whitespace-pre-line text-gray-300'>{challenge.theme}</p>

                {challenge.winner_title && (
                    <p className='mt-4 flex items-center gap-2 font-semibold text-yellow-400'>
                        <Crown className='h-5 w-5' /> Winner: {challenge.winner_title}
                    </p>
                )}

                {/* ---------- ENTER ---------- */}
                {challenge.is_open && (
                    <div className='mt-6 border-t border-slate-800 pt-5'>
                        {!user ? (
                            <p className='text-sm text-gray-400'>
                                <Link to='/login' className='text-red-400 hover:text-red-300'>Log in</Link> to enter one of your stories.
                            </p>
                        ) : challenge.my_eligible_stories.length === 0 ? (
                            <p className='text-sm text-gray-400'>
                                Write and publish a story for this theme, then come back to enter it.{' '}
                                <Link to='/write' className='text-red-400 hover:text-red-300'>Write a story →</Link>
                            </p>
                        ) : (
                            <form onSubmit={handleEnter} className='flex flex-col gap-2 sm:flex-row'>
                                <select value={chosenStory} onChange={event => setChosenStory(event.target.value)} aria-label='Your story' className={`${INPUT_STYLE} [color-scheme:dark]`}>
                                    <option value=''>Choose one of your stories...</option>
                                    {challenge.my_eligible_stories.map(story => (
                                        <option key={story.id} value={story.id}>{story.title}</option>
                                    ))}
                                </select>
                                <button type='submit' disabled={!chosenStory} className={`${BUTTON_STYLE} shrink-0`}>Enter it</button>
                            </form>
                        )}
                        {message && <p className='mt-2 text-sm text-gray-300'>{message}</p>}
                    </div>
                )}
            </div>

            <h3 className='mt-10 text-xl font-bold text-white'>Entries ({challenge.entries.length})</h3>
            {challenge.entries.length === 0 ? (
                <p className='mt-3 text-gray-500'>No entries yet - be the first!</p>
            ) : (
                <div className='mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3'>
                    {challenge.entries.map(story => (
                        <StoryGridCard key={story.id} story={story} />
                    ))}
                </div>
            )}
        </div>
    )
}


function ChallengesPage() {
    // /challenges/:id -> id is set. /challenges -> undefined.
    const { id } = useParams()

    return (
        <PageLayout
            title='Writing Challenges'
            subtitle='A theme, a deadline, and a crown for the best story.'
            action={<Swords className='h-8 w-8 text-red-500' />}
        >
            {/* key={id}: a fresh detail page for every challenge. */}
            {id ? <ChallengeDetail key={id} id={id} /> : <ChallengeList />}
        </PageLayout>
    )
}

export default ChallengesPage
