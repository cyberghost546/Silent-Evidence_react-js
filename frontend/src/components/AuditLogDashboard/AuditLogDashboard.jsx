import { useState, useEffect } from 'react'
import { ScrollText, ChevronDown } from 'lucide-react'
import { getAuditLog } from '../../api/client'
import { AdminSearch } from '../Dashboard/AdminParts'
import { INPUT_STYLE } from '../../styles/formStyles'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> AUDIT LOG (/dashboard/audit-log).
//
// "Who changed what, and when?" Every change an admin makes in the
// dashboard is written down automatically by Django (AuditLogMiddleware
// in dashboard/middleware.py) - nothing to do on each page.
// Only changes are logged (not just looking), and passwords are
// replaced by *** before saving.
//
// Click a row to see exactly what was sent.
// ---------------------------------------------------------------

// Colour + word per HTTP method. The word is always shown too, so
// the colour is never the only clue.
const METHOD_STYLE = {
    POST: 'border-green-800 text-green-300',
    PATCH: 'border-blue-800 text-blue-300',
    PUT: 'border-blue-800 text-blue-300',
    DELETE: 'border-red-800 text-red-300',
}


function AuditLogDashboard() {
    const [data, setData] = useState(null)
    const [search, setSearch] = useState('')
    const [admin, setAdmin] = useState('')
    // The id of the row that's open (only one at a time), or null.
    const [openId, setOpenId] = useState(null)
    const [error, setError] = useState('')

    // Ask Django again whenever the search or the admin filter changes.
    // The 300ms wait = don't send a request for EVERY letter typed.
    useEffect(() => {
        let ignore = false
        const timer = setTimeout(() => {
            getAuditLog({ q: search.trim(), user: admin })
                .then(result => {
                    if (!ignore) setData(result)
                })
                .catch(() => setError('Could not load the audit log.'))
        }, 300)
        return () => {
            ignore = true
            clearTimeout(timer)
        }
    }, [search, admin])

    return (
        <div>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <ScrollText className='h-7 w-7 text-red-500' />
                Audit Log
            </h1>
            <p className='mt-1 text-gray-400'>Every change made in the dashboard, newest first. Recorded automatically.</p>
            {error && <p className='mt-4 text-sm text-red-400'>{error}</p>}

            <div className='mt-6 flex flex-col gap-3 sm:flex-row'>
                <AdminSearch value={search} onChange={setSearch} placeholder='Search actions, e.g. "ban" or "polls"...' />
                <select value={admin} onChange={event => setAdmin(event.target.value)} aria-label='Filter by admin' className={`${INPUT_STYLE} sm:w-52 [color-scheme:dark]`}>
                    <option value=''>All admins</option>
                    {data?.admins.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
            </div>

            <ul className='mt-6 divide-y divide-slate-800 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/40'>
                {data?.entries.length === 0 && <li className='py-10 text-center text-gray-500'>Nothing logged yet.</li>}
                {data?.entries.map(entry => {
                    const isOpen = openId === entry.id
                    // 400 and up = it didn't work (e.g. a form error).
                    const failed = entry.status_code >= 400
                    return (
                        <li key={entry.id}>
                            <button
                                type='button'
                                onClick={() => setOpenId(isOpen ? null : entry.id)}
                                aria-expanded={isOpen}
                                className='flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left text-sm hover:bg-slate-800/40'
                            >
                                <span className={`w-16 shrink-0 rounded border px-1.5 py-0.5 text-center font-mono text-[11px] ${METHOD_STYLE[entry.method] || 'border-slate-700 text-gray-300'}`}>
                                    {entry.method}
                                </span>
                                <span className='min-w-0 flex-1 text-gray-100'>
                                    <span className='font-semibold text-white'>{entry.username}</span> · {entry.action}
                                    {failed && <span className='ml-2 text-xs text-amber-300'>(failed · {entry.status_code})</span>}
                                </span>
                                <span className='whitespace-nowrap text-xs text-gray-500'>{new Date(entry.created_at).toLocaleString()}</span>
                                <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isOpen && (
                                <div className='border-t border-slate-800 bg-slate-950/60 px-4 py-3 text-xs text-gray-400'>
                                    <p><span className='text-gray-500'>URL:</span> <span className='font-mono text-gray-300'>{entry.path}</span></p>
                                    <p className='mt-1'><span className='text-gray-500'>IP:</span> <span className='font-mono text-gray-300'>{entry.ip_address ?? '—'}</span> · <span className='text-gray-500'>Answer:</span> {entry.status_code}</p>
                                    {/* JSON.stringify(x, null, 2) = pretty-printed,
                                        2 spaces per level. <pre> keeps the spaces. */}
                                    {Object.keys(entry.details).length > 0 && (
                                        <pre className='mt-2 overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-gray-300'>{JSON.stringify(entry.details, null, 2)}</pre>
                                    )}
                                </div>
                            )}
                        </li>
                    )
                })}
            </ul>
            {data && <p className='mt-3 text-xs text-gray-500'>Showing the newest {data.entries.length} (max 200).</p>}
        </div>
    )
}

export default AuditLogDashboard
