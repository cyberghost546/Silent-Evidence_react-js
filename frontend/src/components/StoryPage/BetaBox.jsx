import { useState } from 'react'
import { FlaskConical } from 'lucide-react'
import { sendBetaFeedback } from '../../api/client'
import { formatShortDate } from '../../utils/format'
import { INPUT_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ON A DRAFT'S STORY PAGE (not published yet):
//
//   <BetaBanner story={story} isAuthor={...} />   - at the top
//   <BetaFeedbackBox story={story} />             - at the bottom,
//                                                   for beta readers
//
// A draft can only be opened by its writer (a preview) and by the
// beta readers they invited (stories/beta_views.py).
// ---------------------------------------------------------------
export function BetaBanner({ story, isAuthor }) {
    return (
        <p className='mt-6 flex items-center gap-2 rounded-xl border border-purple-800 bg-purple-950/30 px-4 py-3 text-sm text-purple-100'>
            <FlaskConical className='h-4 w-4 shrink-0 text-purple-300' />
            {isAuthor
                ? 'Preview of your draft - only you and your beta readers can see it.'
                : `You're beta-reading a draft by ${story.author}. Your feedback goes only to them.`}
        </p>
    )
}


export function BetaFeedbackBox({ story }) {
    // Start with what you already sent (Django sends it along).
    const [sent, setSent] = useState(story.my_beta_feedback ?? [])
    const [text, setText] = useState('')
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')

    async function handleSend(event) {
        event.preventDefault()
        setSending(true)
        setError('')
        try {
            const item = await sendBetaFeedback(story.id, text.trim())
            setSent([item, ...sent])
            setText('')
        } catch (err) {
            setError(err.data?.detail || 'Could not send your feedback.')
        } finally {
            setSending(false)
        }
    }

    return (
        <section className='rounded-2xl border border-purple-900/60 bg-purple-950/10 p-5'>
            <h2 className='font-bold text-white'>Your feedback for {story.author}</h2>
            <p className='text-sm text-gray-400'>What worked? What was confusing? Was it scary? Only {story.author} will see this.</p>
            <form onSubmit={handleSend} className='mt-3'>
                <label htmlFor='beta-feedback' className='sr-only'>Your feedback</label>
                <textarea id='beta-feedback' rows={4} value={text} onChange={event => setText(event.target.value)} maxLength={5000} className={INPUT_STYLE} />
                {error && <p className='mt-2 text-sm text-red-400'>{error}</p>}
                <div className='mt-3 flex justify-end'>
                    <button type='submit' disabled={sending || !text.trim()} className={BUTTON_STYLE}>{sending ? 'Sending...' : 'Send feedback'}</button>
                </div>
            </form>
            {sent.length > 0 && (
                <ul className='mt-4 space-y-2'>
                    {sent.map(item => (
                        <li key={item.id} className='rounded-lg border border-slate-800 p-3 text-sm'>
                            <p className='text-xs text-gray-500'>You sent · {formatShortDate(item.created_at)}</p>
                            <p className='mt-1 whitespace-pre-line text-gray-300'>{item.body}</p>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    )
}
