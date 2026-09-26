import { useState, useEffect } from 'react'
import { LifeBuoy } from 'lucide-react'
import { getTicket, replyToTicket, closeTicket } from '../../api/client'


// ---------------------------------------------------------------
// One support ticket as a conversation + a reply box.
//
// Used in TWO places:
//   - the member's /support/:id page    (asAdmin = false)
//   - Admin Dashboard -> User Support   (asAdmin = true)
// Django decides if a reply is "from staff" by itself, so this
// component only changes its wording for admins.
//
// Usage:
//   <TicketThread ticketId={5} asAdmin onChanged={() => ...} />
// onChanged (optional) is called after a reply or close, so a list
// next to it can refresh.
// ---------------------------------------------------------------

const STATUS_STYLES = {
    open: 'border-amber-700 text-amber-300',
    answered: 'border-green-800 text-green-400',
    closed: 'border-slate-600 text-gray-400',
}


function TicketThread({ ticketId, asAdmin = false, onChanged }) {
    const [ticket, setTicket] = useState(null)
    const [text, setText] = useState('')
    const [sending, setSending] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        getTicket(ticketId)
            .then(data => setTicket(data))
            .catch(() => setTicket('not-found'))
    }, [ticketId])

    async function handleReply(event) {
        event.preventDefault()
        setSending(true)
        setError('')
        try {
            // Django answers with the whole updated ticket.
            setTicket(await replyToTicket(ticketId, text.trim()))
            setText('')
            onChanged?.()   // ?.() = call it only if it was given
        } catch (err) {
            setError(err.data?.detail || 'Could not send.')
        } finally {
            setSending(false)
        }
    }

    async function handleClose() {
        setTicket(await closeTicket(ticketId))
        onChanged?.()
    }

    if (ticket === null) return <p className='text-gray-400'>Loading...</p>
    if (ticket === 'not-found') return <p className='text-gray-400'>This ticket does not exist.</p>

    return (
        <div className='rounded-2xl border border-slate-800 bg-slate-900/60'>
            <div className='flex flex-wrap items-center gap-3 border-b border-slate-800 px-5 py-4'>
                <h2 className='text-lg font-bold text-white'>#{ticket.id} {ticket.subject}</h2>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[ticket.status]}`}>
                    {ticket.status_label}
                </span>
                {asAdmin && <span className='text-sm text-gray-500'>from {ticket.user}</span>}
                {ticket.status !== 'closed' && (
                    <button type='button' onClick={handleClose} className='ml-auto text-xs text-gray-400 underline hover:text-white'>
                        {asAdmin ? 'Close ticket' : 'My problem is solved'}
                    </button>
                )}
            </div>

            {/* ---------- THE CONVERSATION ---------- */}
            <ul className='space-y-4 p-5'>
                {ticket.messages.map(message => (
                    // Support's messages on the left with a lifebuoy,
                    // the member's on the right.
                    <li key={message.id} className={`flex ${message.from_staff ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                            message.from_staff ? 'rounded-bl-sm border border-slate-700 bg-slate-800 text-gray-100' : 'rounded-br-sm bg-red-700/80 text-white'
                        }`}>
                            <p className='mb-1 flex items-center gap-1.5 text-xs opacity-70'>
                                {message.from_staff && <LifeBuoy className='h-3 w-3' />}
                                {/* Members see "Support"; admins see which admin. */}
                                {message.from_staff ? (asAdmin ? `Support (${message.author})` : 'Support') : message.author}
                                {' · '}{new Date(message.created_at).toLocaleString()}
                            </p>
                            <p className='whitespace-pre-line break-words'>{message.body}</p>
                        </div>
                    </li>
                ))}
            </ul>

            {/* ---------- REPLY ---------- */}
            <form onSubmit={handleReply} className='border-t border-slate-800 p-4'>
                <textarea
                    value={text}
                    onChange={event => setText(event.target.value)}
                    rows={3}
                    maxLength={5000}
                    placeholder={ticket.status === 'closed' ? 'Writing again re-opens the ticket.' : asAdmin ? 'Your answer (the member gets an email)...' : 'Add more details...'}
                    aria-label='Your message'
                    className='w-full resize-y rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-red-600 focus:outline-none'
                />
                {error && <p className='mt-1 text-sm text-red-400'>{error}</p>}
                <button
                    type='submit'
                    disabled={sending || !text.trim()}
                    className='mt-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50'
                >
                    {sending ? 'Sending...' : asAdmin ? 'Send answer' : 'Send'}
                </button>
            </form>
        </div>
    )
}

export default TicketThread
