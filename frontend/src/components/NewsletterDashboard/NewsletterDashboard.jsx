import { useState, useEffect } from 'react'
import { Newspaper, Send, FlaskConical } from 'lucide-react'
import { getNewsletters, sendNewsletter } from '../../api/client'
import { PageMessages } from '../Dashboard/AdminParts'
import WeeklyTopPanel from './WeeklyTopPanel'
import { INPUT_STYLE, LABEL_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> NEWSLETTER (/dashboard/newsletter).
//
// Write one email, send it to every member who has "Weekly Horror
// Digest" switched on (Settings -> Notifications). Every email gets
// a line at the bottom saying how to switch it off.
//
// "Send a test to me" first - it only goes to YOUR address, so you
// can check it before everyone gets it. Sent newsletters are listed
// below as history.
//
// While developing, emails are printed in the Django terminal.
// ---------------------------------------------------------------
function NewsletterDashboard() {
    const [data, setData] = useState(null)
    const [subject, setSubject] = useState('')
    const [body, setBody] = useState('')
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        getNewsletters()
            .then(result => setData(result))
            .catch(() => setError('Could not load the newsletters.'))
    }, [reloadKey])

    async function handleSend(testOnly) {
        // The real one goes to everybody - ask first.
        if (!testOnly && !window.confirm(`Send "${subject}" to ${data.recipient_count} members? This can't be undone.`)) return

        setSending(true)
        setError('')
        try {
            const answer = await sendNewsletter(subject.trim(), body.trim(), testOnly)
            setNotice(answer.detail)
            if (!testOnly) {
                setSubject('')
                setBody('')
                setReloadKey(current => current + 1)
            }
        } catch (err) {
            setError(err.data?.detail || 'Could not send.')
        } finally {
            setSending(false)
        }
    }

    if (!data) return <p className='text-gray-400'>{error || 'Loading...'}</p>

    const ready = subject.trim() && body.trim() && !sending

    return (
        <div className='max-w-3xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Newspaper className='h-7 w-7 text-red-500' />
                Newsletter
            </h1>
            <p className='mt-1 text-gray-400'>
                Goes to the <b className='text-white'>{data.recipient_count}</b> members with "Weekly Horror Digest" switched on.
            </p>

            <PageMessages error={error} notice={notice} />

            {/* A <form> without onSubmit: the two buttons each do their
                own thing (type='button'), so Enter never sends by accident. */}
            <form className='mt-6 space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6'>
                <div>
                    <label htmlFor='subject' className={LABEL_STYLE}>Subject</label>
                    <input id='subject' value={subject} onChange={event => setSubject(event.target.value)} maxLength={150} placeholder='This week on Silent Evidence' className={INPUT_STYLE} />
                </div>
                <div>
                    <label htmlFor='body' className={LABEL_STYLE}>Message</label>
                    <textarea
                        id='body'
                        value={body}
                        onChange={event => setBody(event.target.value)}
                        rows={10}
                        placeholder={'Hi horror fans,\n\nThis week...'}
                        className={`${INPUT_STYLE} resize-y leading-7`}
                    />
                    <p className='mt-1 text-xs text-gray-500'>Plain text. A "how to unsubscribe" line is added at the bottom automatically.</p>
                </div>
                <div className='flex flex-wrap gap-2'>
                    <button type='button' onClick={() => handleSend(true)} disabled={!ready} className='flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2.5 text-sm text-gray-200 hover:border-slate-400 disabled:opacity-50'>
                        <FlaskConical className='h-4 w-4' /> Send a test to me
                    </button>
                    <button type='button' onClick={() => handleSend(false)} disabled={!ready} className={`${BUTTON_STYLE} flex items-center gap-2`}>
                        <Send className='h-4 w-4' /> Send to {data.recipient_count} members
                    </button>
                </div>
            </form>

            {/* The automatic Monday email - preview + send early.
                After sending, reload the "Sent before" list below. */}
            <WeeklyTopPanel onSent={() => setReloadKey(key => key + 1)} />

            <h2 className='mt-10 font-semibold text-white'>Sent before</h2>
            <ul className='mt-3 space-y-2'>
                {data.sent.length === 0 && <li className='text-sm text-gray-500'>Nothing sent yet.</li>}
                {data.sent.map(letter => (
                    // <details> = a built-in "click to open" box - no
                    // React state needed. <summary> is the part you click.
                    <li key={letter.id}>
                        <details className='rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3'>
                            <summary className='cursor-pointer text-sm text-gray-200'>
                                <b>{letter.subject}</b>
                                <span className='text-gray-500'> · {letter.recipient_count} members · {new Date(letter.sent_at).toLocaleDateString()} by {letter.sent_by}</span>
                            </summary>
                            <p className='mt-3 whitespace-pre-line text-sm text-gray-400'>{letter.body}</p>
                        </details>
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default NewsletterDashboard
