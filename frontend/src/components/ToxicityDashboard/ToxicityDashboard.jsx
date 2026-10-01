import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BotMessageSquare, Sparkles, EyeOff, Check } from 'lucide-react'
import { getToxicityQueue, scanForToxicity, reviewToxicity } from '../../api/client'
import { AdminFilters, PageMessages } from '../Dashboard/AdminParts'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> AI TOXICITY QUEUE (/dashboard/toxicity).
//
// 1. "Scan comments": Django sends the next batch of never-checked
//    comments to Claude (dashboard/toxicity_views.py).
// 2. Claude scores each one 0-100. High scores land here as "Flagged".
// 3. YOU decide: Hide (gone from the site) or Approve (it stays).
//    Claude never hides anything by itself - people make the call.
//
// Needs an Anthropic API key on the server, like the AI Generator.
// ---------------------------------------------------------------

// Shown as the filter buttons. The numbers come from Django.
const FILTERS = [
    { value: 'flagged', label: 'Flagged' },
    { value: 'hidden', label: 'Hidden' },
    { value: 'approved', label: 'Approved' },
    { value: 'clean', label: 'Looks fine' },
    { value: 'all', label: 'All' },
]

// harassment -> "Harassment", self_harm -> "Self harm"
function niceCategory(category) {
    const words = category.replace('_', ' ')
    return words.charAt(0).toUpperCase() + words.slice(1)
}


// The score as a small bar + number. The number is always there,
// so the colour isn't the only clue.
function ScoreBar({ score, flagScore }) {
    const high = score >= flagScore
    return (
        <div className='flex items-center gap-2'>
            <span className='h-1.5 w-20 rounded-full bg-slate-800'>
                <span className={`block h-full rounded-full ${high ? 'bg-red-500' : 'bg-slate-500'}`} style={{ width: `${score}%` }} />
            </span>
            <span className={`text-xs font-semibold tabular-nums ${high ? 'text-red-300' : 'text-gray-400'}`}>{score}/100</span>
        </div>
    )
}


function ToxicityDashboard() {
    const [status, setStatus] = useState('flagged')
    const [data, setData] = useState(null)
    const [scanning, setScanning] = useState(false)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [reloadKey, setReloadKey] = useState(0)
    const reload = () => setReloadKey(current => current + 1)

    useEffect(() => {
        let ignore = false
        getToxicityQueue(status)
            .then(result => {
                if (!ignore) setData(result)
            })
            .catch(() => setError('Could not load the queue.'))
        return () => {
            ignore = true
        }
    }, [status, reloadKey])

    async function handleScan() {
        setScanning(true)
        setError('')
        setNotice('')
        try {
            const result = await scanForToxicity()
            setNotice(result.detail || `Checked ${result.scanned} comments - ${result.flagged} flagged.`)
            reload()
        } catch (err) {
            setError(err.data?.detail || 'The scan failed.')
        } finally {
            // finally = runs after try OR catch - the button always comes back.
            setScanning(false)
        }
    }

    async function handleReview(item, action) {
        await reviewToxicity(item.id, action)
        setNotice(action === 'hide' ? 'Comment hidden.' : 'Comment approved.')
        reload()
    }

    // "Flagged (3)" - the counts from Django in the filter labels.
    const filters = FILTERS.map(filter => ({
        ...filter,
        label: data && filter.value !== 'all' ? `${filter.label} (${data.counts[filter.value]})` : filter.label,
    }))

    return (
        <div className='max-w-5xl'>
            <div className='flex flex-wrap items-start justify-between gap-4'>
                <div>
                    <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                        <BotMessageSquare className='h-7 w-7 text-red-500' />
                        AI Toxicity Queue
                    </h1>
                    <p className='mt-1 text-gray-400'>Claude flags comments that may be abusive. You decide what happens.</p>
                </div>
                <button
                    type='button'
                    onClick={handleScan}
                    disabled={scanning || !data?.configured || data?.unscanned === 0}
                    className='flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 font-bold text-white hover:bg-red-700 disabled:opacity-50'
                >
                    <Sparkles className='h-4 w-4' />
                    {scanning ? 'Scanning...' : `Scan comments${data ? ` (${Math.min(data.unscanned, data.batch_size)} of ${data.unscanned})` : ''}`}
                </button>
            </div>

            {/* No API key on the server: explain instead of a broken button. */}
            {data && !data.configured && (
                <div className='mt-4 rounded-xl border border-amber-800 bg-amber-950/30 p-4 text-sm text-amber-100'>
                    <p className='font-semibold'>No Anthropic API key on the server.</p>
                    <p className='mt-1 text-amber-200/80'>
                        Start Django with <code className='rounded bg-slate-900 px-1.5 py-0.5 font-mono text-xs'>$env:ANTHROPIC_API_KEY = "sk-ant-..."</code> (PowerShell),
                        then reload this page. Same key as the AI Generator.
                    </p>
                </div>
            )}

            <PageMessages error={error} notice={notice} />

            <div className='mt-6'>
                <AdminFilters filters={filters} value={status} onChange={setStatus} />
            </div>

            <ul className='mt-4 space-y-3'>
                {data?.items.length === 0 && (
                    <li className='rounded-xl border border-slate-800 py-10 text-center text-gray-500'>
                        {status === 'flagged' ? 'Nothing waiting for review. 🎉' : 'Nothing here.'}
                    </li>
                )}
                {data?.items.map(item => (
                    <li key={item.id} className='rounded-xl border border-slate-800 bg-slate-900/60 p-5'>
                        <div className='flex flex-wrap items-center gap-x-4 gap-y-2'>
                            <ScoreBar score={item.score} flagScore={data.flag_score} />
                            {item.category !== 'none' && (
                                <span className='rounded-full border border-red-900 px-2.5 py-0.5 text-xs text-red-300'>{niceCategory(item.category)}</span>
                            )}
                            <span className='text-xs text-gray-500'>
                                <span className='text-gray-300'>{item.author}</span> on{' '}
                                <Link to={`/stories/${item.story_id}`} className='text-gray-300 hover:text-white'>{item.story_title}</Link>
                                {' · '}{new Date(item.commented_at).toLocaleDateString()}
                            </span>
                        </div>

                        {/* The comment itself, like a quote. */}
                        <blockquote className='mt-3 border-l-2 border-slate-700 pl-3 text-sm text-gray-100'>{item.body}</blockquote>
                        <p className='mt-2 text-xs italic text-gray-400'>Claude: {item.reason}</p>

                        <div className='mt-4 flex flex-wrap items-center gap-2'>
                            {item.status !== 'hidden' && (
                                <button type='button' onClick={() => handleReview(item, 'hide')} className='flex items-center gap-1.5 rounded-lg border border-red-800 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-950/50'>
                                    <EyeOff className='h-3.5 w-3.5' /> Hide comment
                                </button>
                            )}
                            {item.status !== 'approved' && (
                                <button type='button' onClick={() => handleReview(item, 'approve')} className='flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-semibold text-gray-200 hover:border-slate-400'>
                                    <Check className='h-3.5 w-3.5' /> {item.status === 'hidden' ? 'Show again' : 'Approve'}
                                </button>
                            )}
                            {item.reviewed_by && <span className='ml-auto text-xs text-gray-500'>Reviewed by {item.reviewed_by}</span>}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default ToxicityDashboard
