import { useState, useEffect } from 'react'
import { MessageSquare, Send } from 'lucide-react'
import { getDigestPreview, sendDigestNow } from '../../api/client'
import SegmentedControl from '../SegmentedControl/SegmentedControl'
import { PageMessages } from '../Dashboard/AdminParts'
import { BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> COMMENT DIGEST (/dashboard/digest).
//
// The "new comments on your stories" email. Members choose Daily,
// Weekly or Never in Settings -> Notifications.
//
// This page shows, for the period you pick:
//   - how many members chose it, and how many would get an email
//     RIGHT NOW (only people with new comments - no empty emails)
//   - a preview of one of those emails
//   - a "Send now" button, and the history of earlier send-outs
//
// To send it automatically, a scheduler can run:
//   python manage.py send_comment_digests weekly
// (see backend/mailings/management/commands/)
// ---------------------------------------------------------------

const PERIODS = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'daily', label: 'Daily' },
]


function CommentDigestDashboard() {
    const [period, setPeriod] = useState('weekly')
    // { period, ... } - we keep WHICH period it's for (see `loading`).
    const [data, setData] = useState(null)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        let ignore = false
        getDigestPreview(period)
            .then(result => {
                if (!ignore) setData(result)
            })
            .catch(() => {
                if (!ignore) setError('Could not load the digest.')
            })
        return () => {
            ignore = true
        }
    }, [period, reloadKey])

    async function handleSend() {
        if (!window.confirm(`Send the ${period} digest to ${data.would_send} members now?`)) return
        setSending(true)
        try {
            const answer = await sendDigestNow(period)
            setNotice(answer.detail)
            setReloadKey(current => current + 1)
        } catch {
            setError('Could not send the digest.')
        } finally {
            setSending(false)
        }
    }

    const loading = !data || data.period !== period

    return (
        <div className='max-w-4xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <MessageSquare className='h-7 w-7 text-red-500' />
                Comment Digest
            </h1>
            <p className='mt-1 text-gray-400'>The "new comments on your stories" email.</p>

            <div className='mt-6'>
                <SegmentedControl label='Period' options={PERIODS} value={period} onChange={setPeriod} />
            </div>

            <PageMessages error={error} notice={notice} />

            {loading ? (
                <p className='mt-6 text-gray-400'>Loading...</p>
            ) : (
                <>
                    {/* ---------- NUMBERS + SEND ---------- */}
                    <div className='mt-6 flex flex-wrap items-center gap-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5'>
                        <div>
                            <p className='text-2xl font-bold text-white'>{data.subscribers}</p>
                            <p className='text-sm text-gray-500'>members chose {period}</p>
                        </div>
                        <div>
                            <p className='text-2xl font-bold text-red-400'>{data.would_send}</p>
                            <p className='text-sm text-gray-500'>have new comments right now</p>
                        </div>
                        <button type='button' onClick={handleSend} disabled={sending || data.would_send === 0} className={`${BUTTON_STYLE} ml-auto flex items-center gap-2`}>
                            <Send className='h-4 w-4' />
                            {sending ? 'Sending...' : `Send ${data.would_send} ${data.would_send === 1 ? 'email' : 'emails'} now`}
                        </button>
                    </div>

                    {/* ---------- PREVIEW ---------- */}
                    <h2 className='mt-8 font-semibold text-white'>Preview</h2>
                    {data.preview ? (
                        <div className='mt-3 rounded-xl border border-slate-800 bg-white/95 p-5 text-slate-900'>
                            {/* A light box, so it looks like an email. */}
                            <p className='border-b border-slate-300 pb-2 text-sm'><b>Subject:</b> {data.preview.subject}</p>
                            <pre className='mt-3 whitespace-pre-wrap font-sans text-sm leading-6'>{data.preview.body}</pre>
                        </div>
                    ) : (
                        <p className='mt-3 text-sm text-gray-500'>Nobody has new comments in this period - nothing would be sent.</p>
                    )}

                    {data.recipients.length > 0 && (
                        <p className='mt-3 text-xs text-gray-500'>
                            Would go to: {data.recipients.map(r => `${r.username} (${r.comment_count})`).join(', ')}
                        </p>
                    )}

                    {/* ---------- HISTORY ---------- */}
                    <h2 className='mt-8 font-semibold text-white'>Sent before</h2>
                    <ul className='mt-3 space-y-1 text-sm'>
                        {data.history.length === 0 && <li className='text-gray-500'>Nothing sent yet.</li>}
                        {data.history.map((run, index) => (
                            <li key={index} className='text-gray-400'>
                                {new Date(run.sent_at).toLocaleString()} · <span className='capitalize'>{run.period}</span> · {run.emails_sent} emails · by {run.started_by}
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    )
}

export default CommentDigestDashboard
