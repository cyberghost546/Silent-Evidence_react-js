import { useState, useEffect } from 'react'
import { ChartColumn, Plus, Trash2, X } from 'lucide-react'
import { getPolls, createPoll, setPollActive, deletePoll } from '../../api/client'
import { PageMessages } from '../Dashboard/AdminParts'
import { INPUT_STYLE, LABEL_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> POLL MANAGER (/dashboard/polls).
//
// Make a poll: a question and 2-8 answers. It goes live in the
// homepage sidebar straight away (and closes the one before - only
// one poll runs at a time). Members vote once and then see results.
// Below: every poll with its results; re-open or close any of them.
// ---------------------------------------------------------------
function PollsDashboard() {
    const [polls, setPolls] = useState(null)
    const [question, setQuestion] = useState('')
    // The answers being typed - start with two empty boxes.
    const [options, setOptions] = useState(['', ''])
    const [error, setError] = useState('')
    const [reloadKey, setReloadKey] = useState(0)
    const reload = () => setReloadKey(current => current + 1)

    useEffect(() => {
        getPolls()
            .then(data => setPolls(data))
            .catch(() => setError('Could not load the polls.'))
    }, [reloadKey])

    // Change the text of answer number `index`. .map makes a new list
    // where only that one item is different.
    function changeOption(index, text) {
        setOptions(options.map((option, i) => (i === index ? text : option)))
    }

    async function handleCreate(event) {
        event.preventDefault()
        setError('')
        try {
            await createPoll(question.trim(), options)
            setQuestion('')
            setOptions(['', ''])
            reload()
        } catch (err) {
            setError(err.data?.detail || 'Could not create the poll.')
        }
    }

    async function toggle(poll) {
        await setPollActive(poll.id, !poll.is_active)
        reload()
    }

    async function remove(poll) {
        if (!window.confirm(`Delete "${poll.question}" and all its votes?`)) return
        await deletePoll(poll.id)
        reload()
    }

    const filledOptions = options.filter(option => option.trim()).length

    return (
        <div className='max-w-3xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <ChartColumn className='h-7 w-7 text-red-500' />
                Poll Manager
            </h1>
            <p className='mt-1 text-gray-400'>The poll in the homepage sidebar. One runs at a time.</p>

            <PageMessages error={error} notice='' />

            <form onSubmit={handleCreate} className='mt-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6'>
                <div>
                    <label htmlFor='question' className={LABEL_STYLE}>Question</label>
                    <input id='question' value={question} onChange={event => setQuestion(event.target.value)} maxLength={200} placeholder='Which monster scares you most?' className={INPUT_STYLE} />
                </div>
                <div className='space-y-2'>
                    <p className={LABEL_STYLE}>Answers</p>
                    {options.map((option, index) => (
                        <div key={index} className='flex gap-2'>
                            <input
                                value={option}
                                onChange={event => changeOption(index, event.target.value)}
                                maxLength={100}
                                placeholder={`Answer ${index + 1}`}
                                aria-label={`Answer ${index + 1}`}
                                className={INPUT_STYLE}
                            />
                            {/* Can't go below 2 answers. */}
                            {options.length > 2 && (
                                <button type='button' onClick={() => setOptions(options.filter((_, i) => i !== index))} aria-label='Remove answer' className='text-gray-500 hover:text-red-400'>
                                    <X className='h-4 w-4' />
                                </button>
                            )}
                        </div>
                    ))}
                    {options.length < 8 && (
                        <button type='button' onClick={() => setOptions([...options, ''])} className='flex items-center gap-1 text-sm text-gray-400 hover:text-white'>
                            <Plus className='h-4 w-4' /> Add an answer
                        </button>
                    )}
                </div>
                <button type='submit' disabled={!question.trim() || filledOptions < 2} className={BUTTON_STYLE}>Start this poll</button>
            </form>

            <ul className='mt-8 space-y-4'>
                {polls?.length === 0 && <li className='text-sm text-gray-500'>No polls yet.</li>}
                {polls?.map(poll => (
                    <li key={poll.id} className={`rounded-xl border p-5 ${poll.is_active ? 'border-red-800 bg-slate-900/70' : 'border-slate-800 bg-slate-900/30'}`}>
                        <div className='flex items-center gap-3'>
                            <p className='flex-1 font-semibold text-white'>{poll.question}</p>
                            <span className={`text-xs font-semibold ${poll.is_active ? 'text-green-400' : 'text-gray-500'}`}>{poll.is_active ? '● LIVE' : 'Closed'}</span>
                            <button type='button' onClick={() => toggle(poll)} className='rounded-md border border-slate-600 px-3 py-1 text-xs text-gray-200 hover:border-slate-400'>
                                {poll.is_active ? 'Close' : 'Re-open'}
                            </button>
                            <button type='button' onClick={() => remove(poll)} aria-label='Delete poll' className='text-gray-500 hover:text-red-400'>
                                <Trash2 className='h-4 w-4' />
                            </button>
                        </div>

                        {/* Results: a bar per answer, as wide as its %. */}
                        <ul className='mt-4 space-y-2'>
                            {poll.options.map(option => (
                                <li key={option.id} className='grid grid-cols-[8rem_1fr_5rem] items-center gap-3 text-sm'>
                                    <span className='truncate text-gray-300'>{option.text}</span>
                                    <span className='h-3 rounded bg-slate-800'>
                                        <span className='block h-full rounded bg-red-600' style={{ width: `${option.percent}%` }} />
                                    </span>
                                    <span className='text-right tabular-nums text-gray-400'>{option.votes} · {option.percent}%</span>
                                </li>
                            ))}
                        </ul>
                        <p className='mt-2 text-xs text-gray-500'>{poll.total_votes} {poll.total_votes === 1 ? 'vote' : 'votes'}</p>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default PollsDashboard
