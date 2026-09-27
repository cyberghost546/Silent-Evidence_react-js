import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, User, BookOpen, MessageSquare, Flag, LifeBuoy, Mail } from 'lucide-react'
import { adminSearch } from '../../api/client'
import { AdminSearch } from '../Dashboard/AdminParts'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> ADMIN SEARCH (/dashboard/search?q=...).
//
// One box that looks through users, stories (drafts too), comments,
// reports, support tickets and contact messages. Type a name, an
// email, a title - or a number like "57" for an id.
// Each result links to the admin page where you can act on it.
//
// The words live in the URL (like the public Search page), so a
// search can be bookmarked or sent to another admin.
// ---------------------------------------------------------------

// The groups, in the order they're shown, with an icon each.
const GROUPS = [
    { key: 'users', label: 'Members', icon: User },
    { key: 'stories', label: 'Stories', icon: BookOpen },
    { key: 'comments', label: 'Comments', icon: MessageSquare },
    { key: 'reports', label: 'Reports', icon: Flag },
    { key: 'tickets', label: 'Support tickets', icon: LifeBuoy },
    { key: 'contact', label: 'Contact messages', icon: Mail },
]


function AdminSearchDashboard() {
    const [searchParams, setSearchParams] = useSearchParams()
    const query = searchParams.get('q') || ''
    const [results, setResults] = useState(null)   // { query, users: [...], ... }

    // Search when the URL's ?q= changes. A short pause first
    // ("debounce"): typing "lighthouse" shouldn't send 10 requests,
    // only one after you stop typing for 300 ms.
    useEffect(() => {
        if (query.trim().length < 2) return
        let ignore = false
        const timer = setTimeout(() => {
            adminSearch(query)
                .then(data => {
                    if (!ignore) setResults({ query, ...data })
                })
                .catch(() => {})
        }, 300)
        // A new letter typed within 300 ms cancels the old timer.
        return () => {
            ignore = true
            clearTimeout(timer)
        }
    }, [query])

    const hasQuery = query.trim().length >= 2
    const ready = hasQuery && results?.query === query
    const total = ready ? GROUPS.reduce((sum, group) => sum + results[group.key].length, 0) : 0

    return (
        <div className='max-w-4xl'>
            <h1 className='flex items-center gap-3 text-3xl font-bold text-white'>
                <Search className='h-7 w-7 text-red-500' />
                Admin Search
            </h1>
            <p className='mt-1 text-gray-400'>Members, stories, comments, reports, tickets and messages - all at once.</p>

            <div className='mt-6 flex'>
                {/* replace: true = don't add every typed letter to the
                    browser's Back history. */}
                <AdminSearch
                    value={query}
                    onChange={text => setSearchParams(text ? { q: text } : {}, { replace: true })}
                    placeholder='A name, email, title, or an id like 57...'
                />
            </div>

            {!hasQuery && <p className='mt-10 text-center text-gray-500'>Type at least 2 characters.</p>}
            {hasQuery && !ready && <p className='mt-8 text-gray-400'>Searching...</p>}
            {ready && total === 0 && <p className='mt-10 text-center text-gray-500'>Nothing found for "{query}".</p>}

            {ready && total > 0 && (
                <div className='mt-8 grid gap-6 md:grid-cols-2'>
                    {GROUPS.filter(group => results[group.key].length > 0).map(group => {
                        const Icon = group.icon
                        return (
                            <section key={group.key}>
                                <h2 className='mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400'>
                                    <Icon className='h-4 w-4' />
                                    {group.label} ({results[group.key].length})
                                </h2>
                                <ul className='space-y-1.5'>
                                    {results[group.key].map((item, index) => (
                                        <li key={index}>
                                            <Link to={item.link} className='block rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 transition-colors hover:border-slate-600'>
                                                <span className='block truncate text-sm font-semibold text-white'>{item.title}</span>
                                                <span className='block truncate text-xs text-gray-500'>{item.detail}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export default AdminSearchDashboard
