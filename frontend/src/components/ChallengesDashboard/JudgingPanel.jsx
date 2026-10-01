import { useState } from 'react'
import { X, Crown } from 'lucide-react'
import { getChallengeJudging, addJudge, removeJudge, announceWinner } from '../../api/client'
import { useApi } from '../../hooks/useApi'


// ---------------------------------------------------------------
// JUDGES + RESULTS for one challenge (Dashboard -> Challenges).
//   - add / remove judges (by username)
//   - after the deadline: the entries ranked by average score, with
//     every judge's score and private note
//   - Announce: sets the winner and notifies all entrants
// Django: sitecontent/judging_views.py.
// ---------------------------------------------------------------
function JudgingPanel({ challenge, onChanged }) {
    const { data, reload } = useApi(() => getChallengeJudging(challenge.id), [challenge.id])
    const [username, setUsername] = useState('')
    const [problem, setProblem] = useState('')

    async function handleAdd(event) {
        event.preventDefault()
        setProblem('')
        try {
            await addJudge(challenge.id, username.trim())
            setUsername('')
            reload()
        } catch (err) {
            setProblem(err.data?.detail || 'Could not add that judge.')
        }
    }

    async function handleRemove(name) {
        await removeJudge(challenge.id, name)
        reload()
    }

    async function handleAnnounce(row) {
        if (!window.confirm(`Announce "${row.title}" by ${row.author} as the winner? Every entrant gets a notification.`)) return
        await announceWinner(challenge.id, row.story_id)
        reload()
        onChanged()
    }

    if (!data) return null

    return (
        <div className='mt-3 space-y-4 border-t border-slate-800 pt-3 text-sm'>
            <div>
                <p className='text-xs font-semibold uppercase tracking-wider text-gray-400'>Judges</p>
                <div className='mt-2 flex flex-wrap items-center gap-2'>
                    {data.judges.length === 0 && <span className='text-gray-500'>None yet - without judges you pick the winner yourself.</span>}
                    {data.judges.map(name => (
                        <span key={name} className='inline-flex items-center gap-1 rounded-full border border-slate-700 px-2.5 py-0.5 text-gray-200'>
                            {name}
                            <button type='button' onClick={() => handleRemove(name)} aria-label={`Remove judge ${name}`} className='text-gray-400 hover:text-red-400'>
                                <X className='h-3.5 w-3.5' />
                            </button>
                        </span>
                    ))}
                    <form onSubmit={handleAdd} className='flex gap-1'>
                        <input value={username} onChange={event => setUsername(event.target.value)} placeholder='username' aria-label='Judge username' className='w-32 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-gray-100' />
                        <button type='submit' disabled={!username.trim()} className='rounded-md border border-slate-600 px-2 py-1 text-gray-200 hover:border-slate-400 disabled:opacity-50'>Add</button>
                    </form>
                </div>
                {problem && <p className='mt-1 text-xs text-red-400'>{problem}</p>}
            </div>

            {data.judges.length > 0 && !challenge.is_open && (
                <div>
                    <p className='text-xs font-semibold uppercase tracking-wider text-gray-400'>Results (only admins see these)</p>
                    <ol className='mt-2 space-y-2'>
                        {data.results.map((row, index) => (
                            <li key={row.entry_id} className='rounded-lg border border-slate-800 p-3'>
                                <div className='flex flex-wrap items-center gap-2'>
                                    <span className='w-5 text-gray-500'>{index + 1}</span>
                                    <span className='font-semibold text-white'>{row.title}</span>
                                    <span className='text-gray-400'>by {row.author}</span>
                                    <span className='ml-auto tabular-nums text-amber-300'>
                                        {row.average === null ? 'not scored' : `${row.average} / 10 (${row.votes} ${row.votes === 1 ? 'judge' : 'judges'})`}
                                    </span>
                                    {data.winner_id === row.story_id ? (
                                        <span className='flex items-center gap-1 text-yellow-400'><Crown className='h-4 w-4' /> Winner</span>
                                    ) : (
                                        !data.winner_id && (
                                            <button type='button' onClick={() => handleAnnounce(row)} className='rounded-md bg-amber-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-600'>Announce</button>
                                        )
                                    )}
                                </div>
                                {row.scores.length > 0 && (
                                    <ul className='mt-1 pl-7 text-xs text-gray-400'>
                                        {row.scores.map(s => <li key={s.judge}>{s.judge}: {s.score}{s.note && ` - "${s.note}"`}</li>)}
                                    </ul>
                                )}
                            </li>
                        ))}
                    </ol>
                </div>
            )}
        </div>
    )
}

export default JudgingPanel
