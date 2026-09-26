import { useState, useEffect } from 'react'
import { Flag, X } from 'lucide-react'
import { sendReport } from '../../api/client'


// ---------------------------------------------------------------
// The "Report" pop-up: pick a reason, add details if you like, send.
// Admins then see it on Admin Dashboard -> Reports.
//
// Usage (the parent decides when it's open):
//   {reporting && (
//       <ReportDialog
//           target={{ story_id: story.id }}      // or { comment_id: 12 }
//           what='story'                         // or 'comment' (for the title)
//           onClose={() => setReporting(false)}
//       />
//   )}
//
// Only for logged-in visitors - check with useRequireLogin() before
// opening it (StoryActions and Comments do).
// ---------------------------------------------------------------

// Must match Report.REASONS in backend/moderation/models.py.
const REPORT_REASONS = [
    { value: 'spam', label: 'Spam or advertising' },
    { value: 'harassment', label: 'Harassment or bullying' },
    { value: 'hate', label: 'Hate speech' },
    { value: 'private_info', label: "Someone's private information" },
    { value: 'real_violence', label: 'Encourages real violence or self-harm' },
    { value: 'copyright', label: 'Copied from someone else' },
    { value: 'wrong_rating', label: 'Wrong content rating / missing warnings' },
    { value: 'other', label: 'Something else' },
]


function ReportDialog({ target, what, onClose }) {
    const [reason, setReason] = useState('')
    const [details, setDetails] = useState('')
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')
    // After sending: the "thank you" message instead of the form.
    const [done, setDone] = useState('')

    // Escape closes it (same as the search pop-up).
    useEffect(() => {
        function handleKey(event) {
            if (event.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [onClose])

    async function handleSubmit(event) {
        event.preventDefault()
        setSending(true)
        setError('')
        try {
            const answer = await sendReport(target, reason, details.trim())
            setDone(answer.detail)
        } catch (err) {
            // e.g. "You already reported this."
            setError(err.data?.detail || 'Could not send the report.')
        } finally {
            setSending(false)
        }
    }

    return (
        // The dark background. Clicking it closes the pop-up;
        // stopPropagation on the box stops clicks INSIDE from doing that.
        <div
            role='dialog'
            aria-modal='true'
            aria-label={`Report this ${what}`}
            onClick={onClose}
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm'
        >
            <div onClick={event => event.stopPropagation()} className='w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl'>
                <div className='flex items-center justify-between'>
                    <h2 className='flex items-center gap-2 text-lg font-bold text-white'>
                        <Flag className='h-5 w-5 text-red-500' />
                        Report this {what}
                    </h2>
                    <button type='button' onClick={onClose} aria-label='Close' className='text-gray-500 hover:text-white'>
                        <X className='h-5 w-5' />
                    </button>
                </div>

                {done ? (
                    <div className='mt-6'>
                        <p className='text-gray-200'>{done}</p>
                        <button type='button' onClick={onClose} className='mt-6 w-full rounded-lg bg-red-600 py-2.5 font-semibold text-white hover:bg-red-700'>
                            Close
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className='mt-5'>
                        {/* fieldset + legend = a group of radio buttons with a title. */}
                        <fieldset>
                            <legend className='mb-2 text-sm text-gray-400'>What's wrong with it?</legend>
                            <div className='space-y-1.5'>
                                {REPORT_REASONS.map(item => (
                                    <label
                                        key={item.value}
                                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors ${
                                            reason === item.value
                                                ? 'border-red-700 bg-red-950/30 text-white'
                                                : 'border-slate-800 text-gray-300 hover:border-slate-600'
                                        }`}
                                    >
                                        <input
                                            type='radio'
                                            name='reason'
                                            value={item.value}
                                            checked={reason === item.value}
                                            onChange={() => setReason(item.value)}
                                            className='accent-red-600 [color-scheme:dark]'
                                        />
                                        {item.label}
                                    </label>
                                ))}
                            </div>
                        </fieldset>

                        <label htmlFor='report-details' className='mt-4 block text-sm text-gray-400'>
                            More details <span className='text-gray-600'>(optional)</span>
                        </label>
                        <textarea
                            id='report-details'
                            value={details}
                            onChange={event => setDetails(event.target.value)}
                            rows={3}
                            maxLength={1000}
                            className='mt-1 w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-red-600 focus:outline-none'
                        />

                        {error && <p className='mt-2 text-sm text-red-400'>{error}</p>}

                        <button
                            type='submit'
                            disabled={!reason || sending}
                            className='mt-4 w-full rounded-lg bg-red-600 py-2.5 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50'
                        >
                            {sending ? 'Sending...' : 'Send report'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}

export default ReportDialog
