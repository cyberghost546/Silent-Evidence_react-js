import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Timer, RefreshCw } from 'lucide-react'
import { getSprints, saveSprint, getRandomPrompt } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../hooks/useAuth'
import { usePageTitle } from '../../hooks/usePageTitle'
import { countWords } from '../../utils/storyFormat'
import PageLayout from '../PageLayout/PageLayout'
import { BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// WRITING SPRINTS (/sprints)
//
// 1. PICK   - choose 10, 20 or 30 minutes (a random prompt is shown)
// 2. WRITE  - a countdown and a live word count. No editing tricks,
//             just write!
// 3. DONE   - your result is saved (members) for the weekly
//             leaderboard + Sprinter badge, and you can carry the
//             text on to the Write page.
//
// The text itself never goes to Django - only the word count.
// ---------------------------------------------------------------

// "125" seconds -> "2:05"
function formatClock(seconds) {
    const minutes = Math.floor(seconds / 60)
    const rest = String(seconds % 60).padStart(2, '0')
    return `${minutes}:${rest}`
}

function SprintsPage() {
    usePageTitle('Writing Sprints')
    const { user } = useAuth()
    const navigate = useNavigate()
    const { data: board, reload: reloadBoard } = useApi(() => getSprints())
    const { data: prompt, reload: newPrompt } = useApi(() => getRandomPrompt())

    const [stage, setStage] = useState('pick')      // 'pick' | 'writing' | 'done'
    const [minutes, setMinutes] = useState(20)
    const [text, setText] = useState('')
    const [secondsLeft, setSecondsLeft] = useState(0)
    const [saved, setSaved] = useState(null)        // what Django kept, e.g. { words: 412 }

    // The interval below needs the LATEST text when time runs out.
    // A ref always holds the current value (state inside the interval
    // would be stuck at what it was when the interval started).
    // It's updated in handleType, next to the state.
    const textRef = useRef('')

    function handleType(value) {
        setText(value)
        textRef.current = value
    }

    const words = countWords(text)

    function start() {
        handleType('')
        setSaved(null)
        setSecondsLeft(minutes * 60)
        setStage('writing')
    }

    async function finish() {
        setStage('done')
        const finalWords = countWords(textRef.current)
        if (user && finalWords > 0) {
            try {
                setSaved(await saveSprint(finalWords, minutes))
                reloadBoard()
            } catch {
                // Not saved (e.g. too many sprints this hour) - the text is still here.
                setSaved({ error: true })
            }
        }
    }

    // THE COUNTDOWN. We remember WHEN the sprint ends and check the
    // clock every second - counting ticks would drift if the browser
    // slows the tab down.
    useEffect(() => {
        if (stage !== 'writing') return
        const endsAt = Date.now() + minutes * 60 * 1000
        const timer = setInterval(() => {
            const left = Math.max(0, Math.round((endsAt - Date.now()) / 1000))
            setSecondsLeft(left)
            if (left === 0) {
                clearInterval(timer)
                finish()
            }
        }, 1000)
        // Clean-up: stop the timer if the page closes mid-sprint.
        return () => clearInterval(timer)
        // finish/minutes only matter when a sprint STARTS.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage])

    // Put the sprint text at the end of the Write page's saved draft
    // (the same localStorage key WriteStory.jsx uses), then go there.
    function continueOnWritePage() {
        const key = `writeStoryDraft:${user.username}`
        try {
            const draft = JSON.parse(localStorage.getItem(key)) || {}
            const body = draft.body ? `${draft.body}\n\n${text}` : text
            localStorage.setItem(key, JSON.stringify({ ...draft, body }))
        } catch {
            // No localStorage - nothing we can carry over.
        }
        navigate('/write')
    }

    return (
        <PageLayout
            title='Writing Sprints'
            subtitle='Set a timer, silence your inner editor and write as much as you can.'
            width='narrow'
        >
            {/* ---------- 1. PICK ---------- */}
            {stage === 'pick' && (
                <div className='rounded-2xl border border-slate-800 bg-slate-900/60 p-6'>
                    <p className='text-sm font-semibold text-gray-200'>How long?</p>
                    <div className='mt-3 flex gap-3'>
                        {(board?.lengths ?? [10, 20, 30]).map(length => (
                            <button
                                key={length}
                                type='button'
                                onClick={() => setMinutes(length)}
                                aria-pressed={minutes === length}
                                className={`flex-1 rounded-lg border px-4 py-3 font-bold ${minutes === length ? 'border-red-600 bg-red-950/50 text-white' : 'border-slate-700 text-gray-300 hover:border-slate-500'}`}
                            >
                                {length} min
                            </button>
                        ))}
                    </div>

                    {prompt && (
                        <div className='mt-6'>
                            <div className='flex items-center justify-between'>
                                <p className='text-sm font-semibold text-gray-200'>Need an idea?</p>
                                <button type='button' onClick={newPrompt} className='inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white'>
                                    <RefreshCw className='h-3.5 w-3.5' /> Another prompt
                                </button>
                            </div>
                            <p className='mt-2 italic text-gray-300'>"{prompt.text}"</p>
                        </div>
                    )}

                    <button type='button' onClick={start} className={`${BUTTON_STYLE} mt-6 w-full`}>
                        Start the {minutes}-minute sprint
                    </button>
                    {!user && (
                        <p className='mt-3 text-center text-xs text-gray-500'>
                            <Link to='/login' className='text-red-400 hover:text-red-300'>Log in</Link> to save your results and join the leaderboard.
                        </p>
                    )}
                </div>
            )}

            {/* ---------- 2. WRITE ---------- */}
            {stage === 'writing' && (
                <div>
                    <div className='mb-3 flex items-center justify-between'>
                        <span className='inline-flex items-center gap-2 text-2xl font-bold tabular-nums text-white' aria-label='Time left'>
                            <Timer className='h-6 w-6 text-red-500' />
                            {formatClock(secondsLeft)}
                        </span>
                        <span className='text-sm tabular-nums text-gray-300'>{words} {words === 1 ? 'word' : 'words'}</span>
                    </div>
                    {prompt && <p className='mb-3 text-sm italic text-gray-400'>"{prompt.text}"</p>}
                    <textarea
                        value={text}
                        onChange={event => handleType(event.target.value)}
                        autoFocus
                        rows={16}
                        aria-label='Your sprint'
                        placeholder='Go! Don&apos;t stop to fix anything...'
                        className='w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 leading-relaxed text-white placeholder:text-slate-500 focus:border-red-600 focus:outline-none'
                    />
                    <div className='mt-3 text-right'>
                        <button type='button' onClick={finish} className='text-sm text-gray-400 hover:text-white'>Finish early</button>
                    </div>
                </div>
            )}

            {/* ---------- 3. DONE ---------- */}
            {stage === 'done' && (
                <div className='rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-center'>
                    <p className='text-sm uppercase tracking-wide text-gray-400'>Time!</p>
                    <p className='mt-1 text-4xl font-bold text-white'>{words} {words === 1 ? 'word' : 'words'}</p>
                    <p className='mt-1 text-sm text-gray-400'>in a {minutes}-minute sprint</p>
                    {saved?.words !== undefined && <p className='mt-3 text-sm text-green-400'>Saved to the leaderboard.</p>}
                    {saved?.error && <p className='mt-3 text-sm text-red-400'>Could not save this one - but your text is still here.</p>}

                    <div className='mt-6 flex flex-wrap justify-center gap-3'>
                        {user && words > 0 && (
                            <button type='button' onClick={continueOnWritePage} className={BUTTON_STYLE}>Continue on the Write page</button>
                        )}
                        <button type='button' onClick={() => setStage('pick')} className='rounded-lg border border-slate-700 px-4 py-3 font-semibold text-gray-200 hover:border-slate-500'>
                            Another sprint
                        </button>
                    </div>
                </div>
            )}

            {/* ---------- LEADERBOARD ---------- */}
            <section className='mt-10'>
                <h2 className='text-lg font-bold text-white'>This week&apos;s sprinters</h2>
                {board?.me && (
                    <p className='mt-1 text-sm text-gray-400'>
                        You: {board.me.week_words} words this week · best sprint {board.me.best} · {board.me.sprints} {board.me.sprints === 1 ? 'sprint' : 'sprints'} in all
                    </p>
                )}
                {board?.leaderboard.length === 0 ? (
                    <p className='mt-3 text-sm text-gray-500'>No sprints yet this week - the top spot is yours for the taking.</p>
                ) : (
                    <ol className='mt-3 divide-y divide-slate-800 rounded-2xl border border-slate-800'>
                        {board?.leaderboard.map((row, index) => (
                            <li key={row.username} className='flex items-center gap-3 px-4 py-3 text-sm'>
                                <span className='w-5 text-center text-gray-500'>{index + 1}</span>
                                <Link to={`/profile/${row.username}`} className='flex-1 font-semibold text-white hover:text-red-300'>{row.username}</Link>
                                <span className='tabular-nums text-gray-300'>{row.words} words</span>
                                <span className='w-20 text-right text-xs text-gray-500'>{row.sprints} {row.sprints === 1 ? 'sprint' : 'sprints'}</span>
                            </li>
                        ))}
                    </ol>
                )}
            </section>
        </PageLayout>
    )
}

export default SprintsPage
