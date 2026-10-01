import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, Trash2, Flag } from 'lucide-react'
import { getModerationItems, setItemHidden, deleteModerationItem } from '../../api/client'
import { AdminSearch, AdminFilters, PageMessages } from '../Dashboard/AdminParts'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> MODERATION (/dashboard/moderation). Admins only.
//
// Read through what people wrote - the newest 200 comments or
// Last Words (the quote wall on the homepage) - and:
//   Hide   = gone from the site, but kept (Unhide brings it back)
//   Delete = gone for good
// Comments that were reported get a red flag, so they stand out.
// (Reports themselves are handled on the Reports page.)
// ---------------------------------------------------------------

// What to look at. `value` is what Django expects in ?type=...
const KINDS = [
    { value: 'comments', label: 'Comments' },
    { value: 'lastwords', label: 'Last Words' },
]

const SHOW = [
    { value: 'all', label: 'All' },
    { value: 'visible', label: 'Visible' },
    { value: 'hidden', label: 'Hidden' },
    { value: 'reported', label: 'Reported' },
]

function shortDate(isoString) {
    return new Date(isoString).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}


function ModerationDashboard() {
    const [kind, setKind] = useState('comments')
    const [show, setShow] = useState('all')
    const [search, setSearch] = useState('')

    // Which list the items belong to, so switching tabs never shows
    // comments under "Last Words" for a moment: { kind, items }.
    const [data, setData] = useState(null)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [reloadKey, setReloadKey] = useState(0)

    // Load again when the tab changes or after a change (reloadKey).
    useEffect(() => {
        let ignore = false
        getModerationItems(kind)
            .then(items => {
                if (!ignore) setData({ kind, items })
            })
            .catch(() => {
                if (!ignore) setError('Could not load the list.')
            })
        return () => {
            ignore = true
        }
    }, [kind, reloadKey])

    const reload = () => setReloadKey(current => current + 1)

    async function toggleHidden(item) {
        setError('')
        try {
            await setItemHidden(kind, item.id, !item.is_hidden)
            setNotice(item.is_hidden ? 'It is visible again.' : 'Hidden from the site.')
            reload()
        } catch {
            setError('Could not change it.')
        }
    }

    async function handleDelete(item) {
        if (!window.confirm('Delete this for good?')) return
        try {
            await deleteModerationItem(kind, item.id)
            setNotice('Deleted.')
            reload()
        } catch {
            setError('Could not delete it.')
        }
    }

    // Loading, or still showing the OTHER tab's list: wait.
    const loading = !data || data.kind !== kind

    let shown = []
    if (!loading) {
        const words = search.trim().toLowerCase()
        shown = data.items
            .filter(item =>
                show === 'all' ||
                (show === 'visible' && !item.is_hidden) ||
                (show === 'hidden' && item.is_hidden) ||
                (show === 'reported' && item.open_reports > 0)
            )
            .filter(item =>
                words === '' ||
                item.body.toLowerCase().includes(words) ||
                item.author.toLowerCase().includes(words)
            )
    }

    return (
        <div className='max-w-4xl'>
            <h1 className='text-3xl font-bold text-white'>Moderation</h1>
            <p className='mt-1 text-gray-400'>The newest comments and Last Words. Hide or delete anything that breaks the rules.</p>

            <div className='mt-6 flex flex-wrap items-center gap-3'>
                {/* Switching tab also clears the other controls. */}
                <AdminFilters
                    filters={KINDS}
                    value={kind}
                    onChange={value => {
                        setKind(value)
                        setShow('all')
                        setSearch('')
                    }}
                />
                <span className='hidden h-6 w-px bg-slate-700 sm:block' />
                {/* "Reported" only exists for comments. */}
                <AdminFilters filters={kind === 'comments' ? SHOW : SHOW.slice(0, 3)} value={show} onChange={setShow} />
            </div>

            <div className='mt-3 flex'>
                <AdminSearch value={search} onChange={setSearch} placeholder='Search the text or the author...' />
            </div>

            <PageMessages error={error} notice={notice} />

            {loading ? (
                <p className='mt-8 text-gray-400'>Loading...</p>
            ) : shown.length === 0 ? (
                <p className='mt-8 rounded-xl border border-slate-800 py-12 text-center text-gray-500'>Nothing here.</p>
            ) : (
                <ul className='mt-6 space-y-3'>
                    {shown.map(item => (
                        // Hidden items are faded (opacity-60), so you see
                        // at a glance what the public can't.
                        <li
                            key={item.id}
                            className={`rounded-xl border p-4 ${
                                item.is_hidden ? 'border-amber-900/60 bg-amber-950/10 opacity-60' : 'border-slate-800 bg-slate-900/60'
                            }`}
                        >
                            <div className='flex flex-wrap items-center gap-2 text-xs text-gray-500'>
                                <Link to={`/profile/${item.author}`} className='font-semibold text-gray-200 hover:text-white'>{item.author}</Link>
                                <span>· {shortDate(item.created_at)}</span>
                                {item.story_id && (
                                    <span>
                                        · on <Link to={`/stories/${item.story_id}`} className='text-gray-300 hover:text-red-400'>{item.story_title}</Link>
                                    </span>
                                )}
                                {item.open_reports > 0 && (
                                    <span className='flex items-center gap-1 rounded bg-red-950/70 px-1.5 py-0.5 font-semibold text-red-300'>
                                        <Flag className='h-3 w-3' />
                                        {item.open_reports} {item.open_reports === 1 ? 'report' : 'reports'}
                                    </span>
                                )}
                                {item.is_hidden && <span className='rounded bg-amber-900/60 px-1.5 py-0.5 font-semibold text-amber-300'>HIDDEN</span>}
                            </div>

                            <p className='mt-2 whitespace-pre-line break-words text-sm text-gray-200'>{item.body}</p>

                            <div className='mt-3 flex gap-2'>
                                <button
                                    type='button'
                                    onClick={() => toggleHidden(item)}
                                    className='flex items-center gap-1.5 rounded-md border border-slate-600 px-3 py-1 text-xs text-gray-300 transition-colors hover:border-slate-400 hover:text-white'
                                >
                                    {item.is_hidden ? <Eye className='h-3.5 w-3.5' /> : <EyeOff className='h-3.5 w-3.5' />}
                                    {item.is_hidden ? 'Unhide' : 'Hide'}
                                </button>
                                <button
                                    type='button'
                                    onClick={() => handleDelete(item)}
                                    className='flex items-center gap-1.5 rounded-md border border-red-800 px-3 py-1 text-xs text-red-400 transition-colors hover:bg-red-950/60'
                                >
                                    <Trash2 className='h-3.5 w-3.5' />
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}

export default ModerationDashboard
