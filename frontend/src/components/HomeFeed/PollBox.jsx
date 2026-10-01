import { useState, useEffect } from 'react'
import { getCurrentPoll, votePoll } from '../../api/client'
import { useRequireLogin } from '../../hooks/useRequireLogin'
import { useAuth } from '../../hooks/useAuth'
import SidebarBox from './SidebarBox'


// ---------------------------------------------------------------
// The poll in the homepage sidebar.
//
// Before you vote: one button per answer (logged out, clicking one
// sends you to Log In first).
// After you vote: a bar per answer with its percentage, yours marked.
//
// Admins create polls on Admin Dashboard -> Poll Manager. No active
// poll = the box isn't shown.
// ---------------------------------------------------------------
function PollBox() {
    const { user } = useAuth()
    const [poll, setPoll] = useState(null)
    const [error, setError] = useState('')
    const [voting, setVoting] = useState(false)
    const requireLogin = useRequireLogin()

    // Load again when the logged-in person changes (log in / log out):
    // "have I voted?" is different for every person.
    const userId = user?.id
    useEffect(() => {
        let ignore = false
        getCurrentPoll()
            .then(data => {
                if (!ignore) setPoll(data)
            })
            .catch(() => {})
        return () => {
            ignore = true
        }
    }, [userId])

    async function vote(optionId) {
        if (!requireLogin()) return   // logged out -> Log In first
        setVoting(true)   // greys out the buttons: no double votes
        setError('')
        try {
            // Django answers with the poll's new results.
            setPoll(await votePoll(poll.id, optionId))
        } catch (err) {
            setError(err.data?.detail || 'Could not vote.')
        } finally {
            setVoting(false)
        }
    }

    if (!poll) return null

    const hasVoted = poll.my_vote !== null

    return (
        <SidebarBox title='Poll' badge={hasVoted ? 'Results' : 'Vote'}>
            <p className='font-semibold text-white'>{poll.question}</p>

            <ul className='mt-3 space-y-2'>
                {poll.options.map(option => (
                    <li key={option.id}>
                        {hasVoted ? (
                            // RESULTS: a bar behind the text, as wide as the %.
                            <div className='relative overflow-hidden rounded-lg border border-slate-700 px-3 py-2 text-sm'>
                                <div
                                    className={`absolute inset-y-0 left-0 ${option.id === poll.my_vote ? 'bg-red-900/60' : 'bg-slate-800'}`}
                                    style={{ width: `${option.percent}%` }}
                                />
                                {/* relative = drawn ON TOP of the bar. */}
                                <span className='relative flex justify-between text-gray-100'>
                                    <span>{option.text}{option.id === poll.my_vote && ' ✓'}</span>
                                    <span className='tabular-nums text-gray-300'>{option.percent}%</span>
                                </span>
                            </div>
                        ) : (
                            <button
                                type='button'
                                onClick={() => vote(option.id)}
                                disabled={voting}
                                className='w-full rounded-lg border border-slate-700 px-3 py-2 text-left text-sm text-gray-200 transition-colors hover:border-red-600 hover:text-white disabled:opacity-50'
                            >
                                {option.text}
                            </button>
                        )}
                    </li>
                ))}
            </ul>

            <p className='mt-3 text-xs text-gray-500'>
                {poll.total_votes} {poll.total_votes === 1 ? 'vote' : 'votes'}
                {!hasVoted && ' · pick one to see the results'}
            </p>
            {error && <p className='mt-1 text-xs text-red-400'>{error}</p>}
        </SidebarBox>
    )
}

export default PollBox
