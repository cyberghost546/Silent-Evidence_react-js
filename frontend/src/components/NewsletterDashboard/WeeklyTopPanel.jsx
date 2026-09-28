import { useState } from 'react'
import { Trophy } from 'lucide-react'
import { getWeeklyTop, sendWeeklyTop } from '../../api/client'
import { useApi } from '../../hooks/useApi'


// ---------------------------------------------------------------
// "TOP OF THE WEEK" on the Newsletter page (admins).
//
// It goes out by itself every Monday (python manage.py send_weekly_top,
// run by a scheduler). Here you can see what it would say RIGHT NOW,
// and send it early. The wording is the "Top of the week" Email
// Template (Dashboard -> Email Templates).
// ---------------------------------------------------------------
function WeeklyTopPanel({ onSent }) {
    const { data: preview, reload } = useApi(() => getWeeklyTop())
    const [sending, setSending] = useState(false)
    const [message, setMessage] = useState('')

    async function handleSend() {
        if (!window.confirm(`Send "Top of the week" to ${preview.recipient_count} members now?`)) return
        setSending(true)
        try {
            const answer = await sendWeeklyTop()
            setMessage(answer.detail)
            onSent()
            reload()
        } catch (err) {
            setMessage(err.data?.detail || 'Could not send it.')
        } finally {
            setSending(false)
        }
    }

    return (
        <section className='mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6'>
            <h2 className='flex items-center gap-2 font-bold text-white'>
                <Trophy className='h-5 w-5 text-amber-400' />
                Top of the week
            </h2>
            <p className='mt-1 text-sm text-gray-400'>Sent automatically every Monday. This is what it would say right now:</p>

            {preview?.empty && <p className='mt-4 text-sm text-gray-400'>A quiet week - no stories were read, so nothing would be sent.</p>}
            {preview?.body && (
                <>
                    <p className='mt-4 text-sm font-semibold text-gray-200'>{preview.subject}</p>
                    {/* whitespace-pre-line: keep the email's line breaks. */}
                    <p className='mt-2 max-h-72 overflow-y-auto whitespace-pre-line rounded-lg bg-slate-950 p-4 font-mono text-xs leading-relaxed text-gray-300'>{preview.body}</p>
                    <button type='button' onClick={handleSend} disabled={sending} className='mt-4 rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50'>
                        {sending ? 'Sending...' : `Send now to ${preview.recipient_count} members`}
                    </button>
                </>
            )}
            {message && <p className='mt-3 text-sm text-gray-300'>{message}</p>}
        </section>
    )
}

export default WeeklyTopPanel
