import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { getStoryFeedback, askStoryFeedback } from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { timeAgo } from '../../utils/format'


// ---------------------------------------------------------------
// "PRIVATE FEEDBACK FROM CLAUDE" on the Edit page.
// Claude reads your saved story and answers like an editor: what
// works, what to try, how the scares land. It never rewrites your
// story. Only you see it. A few times a day (each one costs the site
// a little). Django: stories/feedback_views.py.
// ---------------------------------------------------------------

// One piece of feedback, laid out.
function FeedbackCard({ item }) {
    const { feedback } = item
    return (
        <div className='space-y-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm'>
            <p className='text-xs text-gray-400'>{timeAgo(item.created_at)}</p>
            <p className='text-gray-100'>{feedback.overall}</p>
            <div>
                <p className='font-semibold text-green-300'>What works</p>
                <ul className='mt-1 list-disc space-y-1 pl-5 text-gray-300'>
                    {feedback.strengths.map(strength => <li key={strength}>{strength}</li>)}
                </ul>
            </div>
            <div>
                <p className='font-semibold text-amber-300'>Things to try</p>
                <ul className='mt-1 space-y-1 text-gray-300'>
                    {feedback.suggestions.map(suggestion => (
                        <li key={suggestion.area + suggestion.note}><b className='text-gray-100'>{suggestion.area}:</b> {suggestion.note}</li>
                    ))}
                </ul>
            </div>
            <p className='text-gray-300'><b className='text-red-300'>The scares:</b> {feedback.scares}</p>
        </div>
    )
}

function FeedbackPanel({ storyId }) {
    const { data, setData } = useApi(() => getStoryFeedback(storyId), [storyId])
    const [asking, setAsking] = useState(false)
    const [problem, setProblem] = useState('')

    async function handleAsk() {
        setAsking(true)
        setProblem('')
        try {
            const answer = await askStoryFeedback(storyId)
            setData({ ...data, remaining_today: answer.remaining_today, history: answer.history })
        } catch (err) {
            setProblem(err.data?.detail || 'Could not get feedback.')
        } finally {
            setAsking(false)
        }
    }

    if (!data) return null

    return (
        <section className='mt-8'>
            <h2 className='flex items-center gap-2 font-bold text-white'>
                <Sparkles className='h-5 w-5 text-amber-400' /> Private feedback from Claude
            </h2>
            {!data.configured ? (
                <p className='mt-2 text-sm text-gray-400'>Not switched on for this site.</p>
            ) : (
                <>
                    <p className='mt-1 text-sm text-gray-400'>
                        An AI editor reads your SAVED story and suggests improvements. It won't rewrite it - the writing stays yours. Only you see this.
                    </p>
                    <button type='button' onClick={handleAsk} disabled={asking || data.remaining_today === 0} className='mt-3 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50'>
                        {asking ? 'Claude is reading... (up to a minute)' : 'Ask for feedback'}
                    </button>
                    {data.remaining_today !== null && (
                        <span className='ml-3 text-xs text-gray-400'>{data.remaining_today} left today</span>
                    )}
                    {problem && <p className='mt-2 text-sm text-red-400'>{problem}</p>}
                </>
            )}
            <div className='mt-4 space-y-3'>
                {data.history.map(item => <FeedbackCard key={item.id} item={item} />)}
            </div>
        </section>
    )
}

export default FeedbackPanel
