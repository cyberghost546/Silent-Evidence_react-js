import { useState, useEffect } from 'react'
import { Send } from 'lucide-react'
import { getEmailLog } from '../../api/client'
import { AdminSearch, AdminFilters } from '../Dashboard/AdminParts'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> EMAIL LOG (/dashboard/email-log).
//
// Every email the site sent (or tried to): support answers, contact
// replies, newsletters, digests... Our email backend writes each
// one to the log (backend/mailings/backends.py), wherever in the
// code it was sent from. Click a row to read the email.
// ---------------------------------------------------------------

const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'failed', label: 'Failed only' },
]


function EmailLogDashboard() {
    const [data, setData] = useState(null)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all')
    // Which email is opened (its id), or null.
    const [openId, setOpenId] = useState(null)

    // Reload when the search or filter changes (Django filters).
    // The same 300 ms pause as Admin Search, so typing is smooth.
    useEffect(() => {
        let ignore = false
        const timer = setTimeout(() => {
            getEmailLog(search.trim(), filter === 'failed')
                .then(result => {
                    if (!ignore) setData(result)
                })
                .catch(() => {})
        }, 300)
        return () => {
            ignore = true
            clearTimeout(timer)
        }
    }, [search, filter])

    return (
        <div className='max-w-5xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Send className='h-7 w-7 text-red-500' />
                Email Log
            </h1>
            {data && (
                <p className='mt-1 text-gray-400'>
                    {data.total} emails in total · {data.last_24h} in the last 24 hours
                    {data.backend.toLowerCase().includes('console') && (
                        <span className='text-amber-300'> · printed in the terminal, not really sent (development)</span>
                    )}
                </p>
            )}

            <div className='mt-6 flex flex-col gap-3 sm:flex-row sm:items-center'>
                <AdminSearch value={search} onChange={setSearch} placeholder='Search by address or subject...' />
                <AdminFilters filters={FILTERS} value={filter} onChange={setFilter} />
            </div>

            {!data ? (
                <p className='mt-6 text-gray-400'>Loading...</p>
            ) : data.emails.length === 0 ? (
                <p className='mt-8 rounded-xl border border-slate-800 py-12 text-center text-gray-500'>No emails here.</p>
            ) : (
                <ul className='mt-6 space-y-1.5'>
                    {data.emails.map(email => (
                        <li key={email.id} className='rounded-lg border border-slate-800 bg-slate-900/60'>
                            {/* The whole row is a button that opens the email. */}
                            <button
                                type='button'
                                onClick={() => setOpenId(openId === email.id ? null : email.id)}
                                aria-expanded={openId === email.id}
                                className='flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm'
                            >
                                <span className={`h-2 w-2 shrink-0 rounded-full ${email.success ? 'bg-green-500' : 'bg-red-500'}`} aria-label={email.success ? 'sent' : 'failed'} />
                                <span className='min-w-0 flex-1 truncate font-semibold text-white'>{email.subject}</span>
                                <span className='hidden max-w-[14rem] truncate text-gray-400 sm:block'>{email.to}</span>
                                <span className='shrink-0 text-xs text-gray-500'>{new Date(email.sent_at).toLocaleString()}</span>
                            </button>
                            {openId === email.id && (
                                <div className='border-t border-slate-800 px-4 py-3'>
                                    <p className='text-xs text-gray-500'>To: {email.to}</p>
                                    {email.error && <p className='mt-1 text-xs text-red-400'>Error: {email.error}</p>}
                                    {/* <pre> keeps the email's line breaks and spacing. */}
                                    <pre className='mt-2 max-h-80 overflow-auto whitespace-pre-wrap font-sans text-sm text-gray-300'>{email.body}</pre>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default EmailLogDashboard
