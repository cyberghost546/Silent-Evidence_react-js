import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Flag, CircleCheck, CircleX, MessageSquare, BookOpen, MessagesSquare, ListOrdered } from 'lucide-react'
import { getAdminReports, actOnReport } from '../../api/client'
import { AdminFilters, PageMessages } from '../Dashboard/AdminParts'


// ---------------------------------------------------------------
// ADMIN DASHBOARD -> REPORTS (/dashboard/reports). Admins only.
//
// Members press "Report" on a story, a comment, a read-along chat
// message or a public reading list. Every report lands here. For an
// open report, the admin either:
//   Remove it - the story is archived / the comment or chat message
//               is hidden / the reading list is made private
//               (not deleted: it can be undone on Stories /
//               Moderation, or through an Appeal)
//   Dismiss   - it's fine, nothing happens
// All open reports about the same story/comment close together.
// ---------------------------------------------------------------

const FILTERS = [
    { value: 'open', label: 'Open' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'dismissed', label: 'Dismissed' },
    { value: 'all', label: 'All' },
]

const STATUS_STYLES = {
    open: 'border-red-700 text-red-300',
    resolved: 'border-green-800 text-green-400',
    dismissed: 'border-slate-600 text-gray-400',
}

// Per kind of report: its icon, the Remove button's words, and the
// label once it's been removed.
const KINDS = {
    story: { icon: BookOpen, remove: 'Archive story', removed: 'ARCHIVED' },
    comment: { icon: MessageSquare, remove: 'Hide comment', removed: 'HIDDEN' },
    chat: { icon: MessagesSquare, remove: 'Hide message', removed: 'HIDDEN' },
    list: { icon: ListOrdered, remove: 'Make list private', removed: 'PRIVATE' },
}

function shortDate(isoString) {
    return new Date(isoString).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}


// ---------------------------------------------------------------
// One report as a card.
// ---------------------------------------------------------------
function ReportCard({ report, onAction, busy }) {
    const target = report.target
    const kind = KINDS[target.type] || KINDS.comment
    const TargetIcon = kind.icon

    return (
        <li className='rounded-xl border border-slate-800 bg-slate-900/60 p-5'>
            {/* ---------- TOP LINE: reason, status, when ---------- */}
            <div className='flex flex-wrap items-center gap-2'>
                <span className='flex items-center gap-1.5 rounded-full bg-red-950/60 px-3 py-1 text-xs font-semibold text-red-300'>
                    <Flag className='h-3.5 w-3.5' />
                    {report.reason_label}
                </span>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_STYLES[report.status]}`}>
                    {report.status}
                </span>
                <span className='ml-auto text-xs text-gray-500'>
                    by {report.reporter} · {shortDate(report.created_at)}
                </span>
            </div>

            {/* ---------- WHAT WAS REPORTED ---------- */}
            <div className='mt-4 rounded-lg border border-slate-800 bg-slate-950/60 p-4'>
                <p className='flex items-center gap-2 text-sm font-semibold text-white'>
                    <TargetIcon className='h-4 w-4 text-gray-400' />
                    {/* Link to the story it's in - but an archived story's
                        page is "not found", so no link then. */}
                    {target.type === 'story' && target.removed ? (
                        target.title
                    ) : (
                        <Link to={target.link || `/stories/${target.story_id}`} className='hover:text-red-400'>{target.title}</Link>
                    )}
                    {target.removed && (
                        <span className='rounded bg-amber-900/60 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300'>
                            {kind.removed}
                        </span>
                    )}
                </p>
                {/* line-clamp-3 = show at most 3 lines, then "..." */}
                <p className='mt-2 line-clamp-3 whitespace-pre-line text-sm text-gray-300'>{target.text}</p>
                <p className='mt-2 text-xs text-gray-500'>
                    Written by <Link to={`/profile/${target.author}`} className='text-gray-300 hover:text-white'>{target.author}</Link>
                </p>
            </div>

            {/* The reporter's own words, if they wrote any. */}
            {report.details && (
                <p className='mt-3 border-l-2 border-red-800 pl-3 text-sm italic text-gray-400'>"{report.details}"</p>
            )}

            {/* ---------- ACTIONS (only while open) ---------- */}
            {report.status === 'open' ? (
                <div className='mt-4 flex gap-2'>
                    <button
                        type='button'
                        onClick={() => onAction(report, 'remove')}
                        disabled={busy}
                        className='flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50'
                    >
                        <CircleX className='h-4 w-4' />
                        {kind.remove}
                    </button>
                    <button
                        type='button'
                        onClick={() => onAction(report, 'dismiss')}
                        disabled={busy}
                        className='flex items-center gap-1.5 rounded-lg border border-slate-600 px-4 py-2 text-sm text-gray-300 transition-colors hover:border-slate-400 hover:text-white disabled:opacity-50'
                    >
                        <CircleCheck className='h-4 w-4' />
                        Dismiss - it's fine
                    </button>
                </div>
            ) : (
                <p className='mt-4 text-xs text-gray-500'>Handled by {report.handled_by ?? 'an admin'}.</p>
            )}
        </li>
    )
}


function ReportsDashboard() {
    const [data, setData] = useState(null)
    const [filter, setFilter] = useState('open')
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [busy, setBusy] = useState(false)

    const [reloadKey, setReloadKey] = useState(0)

    useEffect(() => {
        getAdminReports()
            .then(result => setData(result))
            .catch(() => setError('Could not load the reports.'))
    }, [reloadKey])

    async function handleAction(report, action) {
        setBusy(true)
        setError('')
        try {
            await actOnReport(report.id, action)
            setNotice(action === 'remove' ? 'Removed from the site. Related reports are closed too.' : 'Report dismissed.')
            setReloadKey(current => current + 1)
        } catch (err) {
            setError(err.data?.detail || 'Could not do that.')
        } finally {
            setBusy(false)
        }
    }

    if (!data) {
        return <p className='text-gray-400'>{error || 'Loading reports...'}</p>
    }

    const shown = data.reports.filter(report => filter === 'all' || report.status === filter)

    return (
        <div className='max-w-4xl'>
            <h1 className='text-3xl font-bold text-white'>Reports</h1>
            <p className='mt-1 text-gray-400'>
                {data.counts.open === 0 ? 'Nothing waiting - all clear.' : `${data.counts.open} open ${data.counts.open === 1 ? 'report' : 'reports'} waiting for you.`}
            </p>

            <div className='mt-6'>
                {/* Show the count in each filter button: "Open (3)". */}
                <AdminFilters
                    filters={FILTERS.map(item => ({
                        ...item,
                        label: item.value === 'all' ? item.label : `${item.label} (${data.counts[item.value]})`,
                    }))}
                    value={filter}
                    onChange={setFilter}
                />
            </div>

            <PageMessages error={error} notice={notice} />

            {shown.length === 0 ? (
                <p className='mt-10 rounded-xl border border-slate-800 py-12 text-center text-gray-500'>No reports here.</p>
            ) : (
                <ul className='mt-6 space-y-4'>
                    {shown.map(report => (
                        <ReportCard key={report.id} report={report} onAction={handleAction} busy={busy} />
                    ))}
                </ul>
            )}
        </div>
    )
}

export default ReportsDashboard
