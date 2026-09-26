import { useState, useEffect } from 'react'
import { LifeBuoy } from 'lucide-react'
import { getAllTickets } from '../../api/client'
import { AdminFilters } from '../Dashboard/AdminParts'
import TicketThread from '../SupportPage/TicketThread'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> USER SUPPORT (/dashboard/support).
//
// Every help ticket members opened on /support. Left: the list.
// Right: the chosen ticket's conversation, with an answer box -
// the SAME TicketThread component the member sees, with asAdmin on.
//
// Answering sets the ticket to "Answered" and emails the member.
// ---------------------------------------------------------------

const FILTERS = [
    { value: 'open', label: 'Waiting' },
    { value: 'answered', label: 'Answered' },
    { value: 'closed', label: 'Closed' },
    { value: 'all', label: 'All' },
]

const STATUS_DOT = {
    open: 'bg-amber-400',
    answered: 'bg-green-500',
    closed: 'bg-slate-600',
}


function SupportDashboard() {
    const [data, setData] = useState(null)
    const [filter, setFilter] = useState('open')
    const [selectedId, setSelectedId] = useState(null)
    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        getAllTickets()
            .then(result => setData(result))
            .catch(() => setData({ counts: { open: 0, answered: 0, closed: 0 }, tickets: [] }))
    }, [reloadKey])

    if (!data) return <p className='text-gray-400'>Loading tickets...</p>

    const shown = data.tickets.filter(ticket => filter === 'all' || ticket.status === filter)

    return (
        <div>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <LifeBuoy className='h-7 w-7 text-red-500' />
                User Support
            </h1>
            <p className='mt-1 text-gray-400'>
                {data.counts.open} {data.counts.open === 1 ? 'ticket is' : 'tickets are'} waiting for an answer.
            </p>

            <div className='mt-6'>
                <AdminFilters
                    filters={FILTERS.map(item => (item.value === 'all' ? item : { ...item, label: `${item.label} (${data.counts[item.value]})` }))}
                    value={filter}
                    onChange={setFilter}
                />
            </div>

            {/* List on the left (fixed 20rem), conversation on the right. */}
            <div className='mt-6 grid items-start gap-6 lg:grid-cols-[20rem_1fr]'>
                <ul className='space-y-2'>
                    {shown.length === 0 && <li className='text-sm text-gray-500'>No tickets here.</li>}
                    {shown.map(ticket => (
                        <li key={ticket.id}>
                            <button
                                type='button'
                                onClick={() => setSelectedId(ticket.id)}
                                className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
                                    ticket.id === selectedId ? 'border-red-700 bg-red-950/20' : 'border-slate-800 bg-slate-900/60 hover:border-slate-600'
                                }`}
                            >
                                <span className='flex items-center gap-2'>
                                    <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[ticket.status]}`} />
                                    <span className='truncate font-semibold text-white'>#{ticket.id} {ticket.subject}</span>
                                </span>
                                <span className='mt-1 block text-xs text-gray-500'>
                                    {ticket.user} · {ticket.message_count} {ticket.message_count === 1 ? 'message' : 'messages'} · {new Date(ticket.updated_at).toLocaleDateString()}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>

                {selectedId ? (
                    // key: a fresh thread when you pick another ticket.
                    // onChanged: reload the list (status + counts change).
                    <TicketThread key={selectedId} ticketId={selectedId} asAdmin onChanged={() => setReloadKey(current => current + 1)} />
                ) : (
                    <p className='rounded-2xl border border-slate-800 py-16 text-center text-gray-500'>Pick a ticket on the left.</p>
                )}
            </div>
        </div>
    )
}

export default SupportDashboard
