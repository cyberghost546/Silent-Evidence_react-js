import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getLoginLogs } from '../../api/client'
import { AdminSearch, AdminFilters } from '../Dashboard/AdminParts'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> LOGIN LOGS (/dashboard/login-logs). Admins only.
//
// Every login attempt on the site (the newest 500): who, when,
// from which IP address and browser, and whether it worked.
// Django writes one row per attempt in LogInView.
//
// Useful for spotting:
//   - many FAILED attempts on one account (someone guessing)
//   - an account logging in from a strange place
// The Security page adds up the numbers for you.
// ---------------------------------------------------------------

const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'success', label: 'Successful' },
    { value: 'failed', label: 'Failed' },
]


// The browser sends a long "user agent" text, like:
//   "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... Chrome/140.0 Safari/537.36"
// This turns it into something readable: "Chrome on Windows".
// Order matters: Edge's text also says "Chrome", and Chrome's also
// says "Safari" - so we check the most specific names first.
function readableBrowser(userAgent) {
    if (!userAgent) return 'Unknown'

    let browser = 'Other browser'
    if (userAgent.includes('Edg/')) browser = 'Edge'
    else if (userAgent.includes('OPR/')) browser = 'Opera'
    else if (userAgent.includes('Firefox/')) browser = 'Firefox'
    else if (userAgent.includes('Chrome/')) browser = 'Chrome'
    else if (userAgent.includes('Safari/')) browser = 'Safari'

    let system = ''
    if (userAgent.includes('Windows')) system = 'Windows'
    else if (userAgent.includes('Android')) system = 'Android'
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) system = 'iOS'
    else if (userAgent.includes('Mac OS')) system = 'macOS'
    else if (userAgent.includes('Linux')) system = 'Linux'

    return system ? `${browser} on ${system}` : browser
}


function LoginLogsDashboard() {
    const [events, setEvents] = useState(null)
    const [error, setError] = useState('')
    const [filter, setFilter] = useState('all')
    const [search, setSearch] = useState('')

    useEffect(() => {
        getLoginLogs()
            .then(data => setEvents(data))
            .catch(() => setError('Could not load the login logs.'))
    }, [])

    if (!events) {
        return <p className='text-gray-400'>{error || 'Loading login logs...'}</p>
    }

    const words = search.trim().toLowerCase()
    const shown = events
        .filter(event => filter === 'all' || (filter === 'success') === event.success)
        .filter(event =>
            words === '' ||
            event.username.toLowerCase().includes(words) ||
            // ?? '' because the IP can be empty (null).
            (event.ip_address ?? '').includes(words)
        )

    const failedCount = events.filter(event => !event.success).length

    return (
        <div>
            <h1 className='text-3xl font-bold text-white'>Login Logs</h1>
            <p className='mt-1 text-gray-400'>
                The last {events.length} login attempts · <span className='text-red-400'>{failedCount} failed</span>
            </p>

            <div className='mt-6 flex flex-col gap-3 xl:flex-row xl:items-center'>
                <AdminSearch value={search} onChange={setSearch} placeholder='Search by username or IP address...' />
                <AdminFilters filters={FILTERS} value={filter} onChange={setFilter} />
            </div>

            <p className='mt-5 text-sm text-gray-400'>
                Showing <span className='font-bold text-white'>{shown.length}</span> of {events.length}
            </p>

            <div className='mt-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40'>
                <table className='w-full min-w-[44rem] text-left text-sm'>
                    <thead>
                        <tr className='text-xs font-semibold uppercase tracking-wider text-gray-400'>
                            <th className='px-4 py-3'>When</th>
                            <th className='px-4 py-3'>Username</th>
                            <th className='px-4 py-3'>Result</th>
                            <th className='px-4 py-3'>IP address</th>
                            <th className='px-4 py-3'>Browser</th>
                        </tr>
                    </thead>
                    <tbody>
                        {shown.map(event => (
                            <tr key={event.id} className='border-t border-slate-800'>
                                <td className='whitespace-nowrap px-4 py-3 text-gray-400'>
                                    {new Date(event.created_at).toLocaleString()}
                                </td>
                                <td className='px-4 py-3'>
                                    {/* A link only when the name belongs to a real
                                        account (user_id is set). A made-up name
                                        someone typed has no profile. */}
                                    {event.user_id ? (
                                        <Link to={`/profile/${event.username}`} className='font-semibold text-white hover:text-red-400'>{event.username}</Link>
                                    ) : (
                                        <span className='text-gray-400' title='No account with this name'>{event.username}</span>
                                    )}
                                </td>
                                <td className='px-4 py-3'>
                                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                                        event.success ? 'border-green-800 text-green-400' : 'border-red-800 text-red-400'
                                    }`}>
                                        {event.success ? 'Success' : 'Failed'}
                                    </span>
                                </td>
                                {/* font-mono = every character the same width,
                                    so IP addresses line up nicely. */}
                                <td className='px-4 py-3 font-mono text-xs text-gray-300'>{event.ip_address ?? '—'}</td>
                                {/* title = hover to see the full browser text. */}
                                <td className='px-4 py-3 text-gray-400' title={event.user_agent}>{readableBrowser(event.user_agent)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {shown.length === 0 && <p className='py-10 text-center text-gray-500'>No login attempts match.</p>}
            </div>
        </div>
    )
}

export default LoginLogsDashboard
