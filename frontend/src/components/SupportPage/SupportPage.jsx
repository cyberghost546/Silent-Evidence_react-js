import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LifeBuoy } from 'lucide-react'
import { getMyTickets, openTicket } from '../../api/client'
import PageLayout, { PageMessage } from '../PageLayout/PageLayout'
import TicketThread from './TicketThread'
import { INPUT_STYLE, LABEL_STYLE, BUTTON_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// HELP & SUPPORT (/support) - logged-in members only (App.jsx).
//
//   /support      -> your tickets + "Open a new ticket"
//   /support/5    -> one ticket: the conversation with support
//
// An admin answers on Admin Dashboard -> User Support, and you get
// an email when they do.
// (Quick questions? The Site Guide and Ask The Watcher are faster.)
// ---------------------------------------------------------------

const STATUS_STYLES = {
    open: 'text-amber-300',
    answered: 'text-green-400',
    closed: 'text-gray-500',
}


function TicketList() {
    const navigate = useNavigate()
    const [tickets, setTickets] = useState(null)
    const [subject, setSubject] = useState('')
    const [body, setBody] = useState('')
    const [error, setError] = useState('')

    useEffect(() => {
        getMyTickets()
            .then(data => setTickets(data))
            .catch(() => setTickets([]))
    }, [])

    async function handleOpen(event) {
        event.preventDefault()
        setError('')
        try {
            const ticket = await openTicket(subject.trim(), body.trim())
            // Go straight to the new ticket's page.
            navigate(`/support/${ticket.id}`)
        } catch (err) {
            setError(err.data?.detail || 'Could not open the ticket.')
        }
    }

    return (
        <div className='grid gap-8 lg:grid-cols-[1fr_22rem]'>
            {/* ---------- YOUR TICKETS ---------- */}
            <section>
                <h2 className='mb-3 font-semibold text-white'>Your tickets</h2>
                {tickets === null && <p className='text-gray-400'>Loading...</p>}
                {tickets?.length === 0 && (
                    <PageMessage title='No tickets yet.' text='Stuck with something? Open a ticket and we will help.' />
                )}
                <ul className='space-y-2'>
                    {tickets?.map(ticket => (
                        <li key={ticket.id}>
                            <Link
                                to={`/support/${ticket.id}`}
                                className='flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3 transition-colors hover:border-slate-600'
                            >
                                <span className='min-w-0'>
                                    <span className='block truncate font-semibold text-white'>#{ticket.id} {ticket.subject}</span>
                                    <span className='text-xs text-gray-500'>Last activity {new Date(ticket.updated_at).toLocaleString()}</span>
                                </span>
                                <span className={`shrink-0 text-xs font-semibold ${STATUS_STYLES[ticket.status]}`}>{ticket.status_label}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </section>

            {/* ---------- NEW TICKET ---------- */}
            <form onSubmit={handleOpen} className='h-fit space-y-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5'>
                <h2 className='font-semibold text-white'>Open a new ticket</h2>
                <div>
                    <label htmlFor='subject' className={LABEL_STYLE}>What is it about?</label>
                    <input id='subject' value={subject} onChange={event => setSubject(event.target.value)} maxLength={150} placeholder="e.g. I can't upload my avatar" className={INPUT_STYLE} />
                </div>
                <div>
                    <label htmlFor='body' className={LABEL_STYLE}>Tell us more</label>
                    <textarea id='body' value={body} onChange={event => setBody(event.target.value)} rows={5} maxLength={5000} className={`${INPUT_STYLE} resize-y`} />
                </div>
                {error && <p className='text-sm text-red-400'>{error}</p>}
                <button type='submit' disabled={!subject.trim() || !body.trim()} className={`${BUTTON_STYLE} w-full`}>Open ticket</button>
                <p className='text-xs text-gray-500'>
                    Quick question? Try <Link to='/watcher' className='text-red-400 hover:text-red-300'>Ask The Watcher</Link> first.
                </p>
            </form>
        </div>
    )
}


function SupportPage() {
    const { id } = useParams()

    return (
        <PageLayout title='Help & Support' subtitle='Talk to the Silent Evidence team.' action={<LifeBuoy className='h-8 w-8 text-red-500' />}>
            {id ? (
                <div className='max-w-3xl'>
                    <Link to='/support' className='text-sm text-gray-400 hover:text-white'>← All my tickets</Link>
                    <div className='mt-4'>
                        {/* key={id}: a fresh thread for every ticket. */}
                        <TicketThread key={id} ticketId={id} />
                    </div>
                </div>
            ) : (
                <TicketList />
            )}
        </PageLayout>
    )
}

export default SupportPage
