import { useState, useEffect } from 'react'
import { Mail, Trash2, Reply } from 'lucide-react'
import { getContactInbox, setContactHandled, replyToContact, deleteContactMessage } from '../../api/client'
import { AdminFilters, PageMessages } from '../Dashboard/AdminParts'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> CONTACT INBOX (/dashboard/contact).
//
// Every message sent through the public Contact page. For each one:
//   Reply          - your answer is EMAILED to the sender (and kept
//                    here, so other admins see what was said)
//   Mark as done   - no reply needed
//   Delete
//
// While developing, emails are printed in the Django terminal
// instead of sent (see EMAIL in backend/config/settings.py).
// ---------------------------------------------------------------

const FILTERS = [
    { value: 'new', label: 'New' },
    { value: 'handled', label: 'Done' },
    { value: 'all', label: 'All' },
]


// One message. Has its own reply box (open / closed, text).
function ContactCard({ message, onChanged, onError }) {
    const [replying, setReplying] = useState(false)
    const [reply, setReply] = useState('')
    const [sending, setSending] = useState(false)

    async function sendReply(event) {
        event.preventDefault()
        setSending(true)
        try {
            await replyToContact(message.id, reply.trim())
            setReplying(false)
            onChanged(`Reply emailed to ${message.email}.`)
        } catch (err) {
            onError(err.data?.detail || 'Could not send the reply.')
        } finally {
            setSending(false)
        }
    }

    async function toggleHandled() {
        await setContactHandled(message.id, !message.is_handled)
        onChanged(message.is_handled ? 'Moved back to New.' : 'Marked as done.')
    }

    async function remove() {
        if (!window.confirm('Delete this message?')) return
        await deleteContactMessage(message.id)
        onChanged('Deleted.')
    }

    return (
        <li className={`rounded-xl border p-5 ${message.is_handled ? 'border-slate-800 bg-slate-900/30' : 'border-slate-700 bg-slate-900/70'}`}>
            <div className='flex flex-wrap items-center gap-2'>
                {!message.is_handled && <span className='h-2 w-2 rounded-full bg-red-500' aria-label='New' />}
                <p className='font-semibold text-white'>{message.name}</p>
                {/* mailto: opens your own email program as a fallback. */}
                <a href={`mailto:${message.email}`} className='text-sm text-gray-400 hover:text-white'>&lt;{message.email}&gt;</a>
                <span className='rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-gray-300'>{message.subject_label}</span>
                <span className='ml-auto text-xs text-gray-500'>{new Date(message.created_at).toLocaleString()}</span>
            </div>

            <p className='mt-3 whitespace-pre-line text-sm text-gray-200'>{message.message}</p>

            {/* An earlier reply, shown under the message. */}
            {message.reply && (
                <div className='mt-3 border-l-2 border-green-800 pl-3 text-sm'>
                    <p className='text-xs text-green-400'>Replied by {message.replied_by} · {new Date(message.replied_at).toLocaleString()}</p>
                    <p className='mt-1 whitespace-pre-line text-gray-300'>{message.reply}</p>
                </div>
            )}

            {replying ? (
                <form onSubmit={sendReply} className='mt-4'>
                    <textarea
                        value={reply}
                        onChange={event => setReply(event.target.value)}
                        rows={4}
                        placeholder={`Hi ${message.name}, ...`}
                        aria-label='Your reply'
                        className='w-full resize-y rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-red-600 focus:outline-none'
                    />
                    <div className='mt-2 flex gap-2'>
                        <button type='submit' disabled={sending || !reply.trim()} className='rounded-lg bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50'>
                            {sending ? 'Sending...' : 'Send email'}
                        </button>
                        <button type='button' onClick={() => setReplying(false)} className='rounded-lg border border-slate-600 px-4 py-1.5 text-sm text-gray-300'>Cancel</button>
                    </div>
                </form>
            ) : (
                <div className='mt-4 flex items-center gap-2'>
                    <button type='button' onClick={() => setReplying(true)} className='flex items-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700'>
                        <Reply className='h-3.5 w-3.5' /> Reply
                    </button>
                    <button type='button' onClick={toggleHandled} className='rounded-md border border-slate-600 px-3 py-1.5 text-xs text-gray-300 hover:border-slate-400'>
                        {message.is_handled ? 'Mark as new' : 'Mark as done'}
                    </button>
                    <button type='button' onClick={remove} aria-label='Delete message' className='ml-auto text-gray-500 hover:text-red-400'>
                        <Trash2 className='h-4 w-4' />
                    </button>
                </div>
            )}
        </li>
    )
}


function ContactInboxDashboard() {
    const [data, setData] = useState(null)
    const [filter, setFilter] = useState('new')
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        getContactInbox()
            .then(result => setData(result))
            .catch(() => setError('Could not load the inbox.'))
    }, [reloadKey])

    // Every card calls this after a change: show a message + reload.
    function handleChanged(text) {
        setError('')
        setNotice(text)
        setReloadKey(current => current + 1)
    }

    if (!data) return <p className='text-gray-400'>{error || 'Loading inbox...'}</p>

    const shown = data.messages.filter(message =>
        filter === 'all' || (filter === 'handled') === message.is_handled
    )

    return (
        <div className='max-w-4xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Mail className='h-7 w-7 text-red-500' />
                Contact Inbox
            </h1>
            <p className='mt-1 text-gray-400'>Messages from the Contact page. Replies are sent by email.</p>

            <div className='mt-6'>
                <AdminFilters
                    filters={FILTERS.map(item => (
                        item.value === 'new' ? { ...item, label: `New (${data.counts.new})` } : item
                    ))}
                    value={filter}
                    onChange={setFilter}
                />
            </div>

            <PageMessages error={error} notice={notice} />

            {shown.length === 0 ? (
                <p className='mt-10 rounded-xl border border-slate-800 py-12 text-center text-gray-500'>
                    {filter === 'new' ? 'Inbox zero - nothing new.' : 'No messages here.'}
                </p>
            ) : (
                <ul className='mt-6 space-y-3'>
                    {shown.map(message => (
                        <ContactCard key={message.id} message={message} onChanged={handleChanged} onError={setError} />
                    ))}
                </ul>
            )}
        </div>
    )
}

export default ContactInboxDashboard
